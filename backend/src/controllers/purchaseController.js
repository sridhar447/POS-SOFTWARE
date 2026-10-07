import { query, transaction } from '../config/db.js';
import { generateUniqueBarcodes } from '../utils/barcodeGenerator.js';
import { getNextDocumentNumber } from '../utils/numberGenerators.js';
import { createAuditLog } from '../middleware/auditMiddleware.js';

export const getPurchases = async (req, res, next) => {
  try {
    const { supplier_id, search, page = 1, limit = 50 } = req.query;

    let sql = `
      SELECT p.*, s.name as supplier_name, s.phone as supplier_phone,
             u.name as created_by_name,
             loc.name as initial_location_name,
             COUNT(DISTINCT pi.id) as total_products,
             COALESCE(SUM(pi.quantity), 0) as total_units,
             GROUP_CONCAT(DISTINCT pr.name) as product_names
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      JOIN stock_locations loc ON p.initial_location_id = loc.id
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      LEFT JOIN products pr ON pi.product_id = pr.id
      WHERE 1=1
    `;
    const params = [];

    if (supplier_id) {
      sql += ' AND p.supplier_id = ?';
      params.push(supplier_id);
    }
    if (search) {
      sql += ' AND (p.purchase_number LIKE ? OR p.supplier_invoice_no LIKE ? OR s.name LIKE ? OR pr.name LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ' GROUP BY p.id ORDER BY p.id DESC';

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const purchases = await query(sql, params);

    res.json({
      success: true,
      data: { purchases }
    });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [purchase] = await query(
      `SELECT p.*, s.name as supplier_name, s.phone as supplier_phone, s.gst_number as supplier_gst,
              loc.name as initial_location_name, u.name as created_by_name
       FROM purchases p
       JOIN suppliers s ON p.supplier_id = s.id
       JOIN stock_locations loc ON p.initial_location_id = loc.id
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase record not found.',
        code: 'PURCHASE_NOT_FOUND'
      });
    }

    const items = await query(
      `SELECT pi.*, pr.name as product_name, pr.sku
       FROM purchase_items pi
       JOIN products pr ON pi.product_id = pr.id
       WHERE pi.purchase_id = ?`,
      [id]
    );

    const units = await query(
      `SELECT u.*, pr.name as product_name, loc.name as current_location_name
       FROM product_units u
       JOIN products pr ON u.product_id = pr.id
       JOIN stock_locations loc ON u.location_id = loc.id
       WHERE u.purchase_id = ?
       ORDER BY u.id ASC`,
      [id]
    );

    res.json({
      success: true,
      data: { purchase, items, units }
    });
  } catch (error) {
    next(error);
  }
};

export const createPurchase = async (req, res, next) => {
  try {
    const {
      supplier_id,
      supplier_invoice_no,
      purchase_date,
      initial_location_id = 2, // Default: WAREHOUSE (Location ID 2)
      items, // Array of { product_id, quantity, purchase_price, selling_price, tax_percent, discount_percent }
      paid_amount = 0,
      payment_method = 'OTHER',
      notes
    } = req.body;

    if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier and at least one purchase item are required.',
        code: 'MISSING_PURCHASE_DATA'
      });
    }

    const targetLocationId = parseInt(initial_location_id, 10) || 2; // Default to warehouse
    const purchaseNumber = await getNextDocumentNumber('PURCHASE');
    const barcodePrefix = process.env.BARCODE_PREFIX || 'SH-';

    const result = await transaction(async (conn) => {
      // 1. Calculate totals
      let subtotal = 0;
      let totalTax = 0;
      let totalDiscount = 0;
      let grandTotal = 0;
      let totalUnitsCount = 0;

      for (const item of items) {
        const qty = parseInt(item.quantity, 10) || 1;
        const buyPrice = parseFloat(item.purchase_price) || 0;
        const taxPct = parseFloat(item.tax_percent) || 0;
        const discPct = parseFloat(item.discount_percent) || 0;

        const lineBase = buyPrice * qty;
        const lineDisc = (lineBase * discPct) / 100;
        const taxable = lineBase - lineDisc;
        const lineTax = (taxable * taxPct) / 100;
        const lineTotal = taxable + lineTax;

        subtotal += lineBase;
        totalDiscount += lineDisc;
        totalTax += lineTax;
        grandTotal += lineTotal;
        totalUnitsCount += qty;
      }

      const paidVal = parseFloat(paid_amount) || 0;
      let paymentStatus = 'UNPAID';
      if (paidVal >= grandTotal) paymentStatus = 'PAID';
      else if (paidVal > 0) paymentStatus = 'PARTIAL';

      // 2. Insert into purchases table
      const [purchResult] = await conn.execute(
        `INSERT INTO purchases 
         (purchase_number, supplier_id, supplier_invoice_no, purchase_date, subtotal, tax_amount, discount_amount, grand_total, initial_location_id, payment_status, paid_amount, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          purchaseNumber,
          supplier_id,
          supplier_invoice_no || null,
          purchase_date || new Date().toISOString().slice(0, 10),
          subtotal,
          totalTax,
          totalDiscount,
          grandTotal,
          targetLocationId,
          paymentStatus,
          paidVal,
          notes || null,
          req.user.id
        ]
      );
      const purchaseId = purchResult.insertId;

      // 3. Generate all unique barcodes in batch
      const allBarcodes = await generateUniqueBarcodes(totalUnitsCount, barcodePrefix);
      let barcodeCursor = 0;
      const createdUnits = [];

      // 4. Process each purchase line item and create physical product units
      for (const item of items) {
        const qty = parseInt(item.quantity, 10) || 1;
        const buyPrice = parseFloat(item.purchase_price) || 0;
        const sellPrice = parseFloat(item.selling_price) || 0;
        const taxPct = parseFloat(item.tax_percent) || 0;
        const discPct = parseFloat(item.discount_percent) || 0;
        
        const lineBase = buyPrice * qty;
        const lineDisc = (lineBase * discPct) / 100;
        const taxable = lineBase - lineDisc;
        const lineTax = (taxable * taxPct) / 100;
        const lineTotal = taxable + lineTax;

        // Get product details for SKU
        const [[prod]] = await conn.query('SELECT sku, name FROM products WHERE id = ?', [item.product_id]);
        const productSku = prod ? prod.sku : '';

        // Insert purchase item
        await conn.execute(
          `INSERT INTO purchase_items 
           (purchase_id, product_id, quantity, purchase_price, selling_price, tax_percent, discount_percent, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [purchaseId, item.product_id, qty, buyPrice, sellPrice, taxPct, discPct, lineTotal]
        );

        const itemLocationId = item.location_id ? (parseInt(item.location_id, 10) || targetLocationId) : targetLocationId;

        // Create individual physical unit records
        for (let i = 0; i < qty; i++) {
          const barcode = allBarcodes[barcodeCursor++];
          const [unitRes] = await conn.execute(
            `INSERT INTO product_units 
             (product_id, barcode, sku, purchase_id, location_id, status, purchase_price, selling_price)
             VALUES (?, ?, ?, ?, ?, 'AVAILABLE', ?, ?)`,
            [item.product_id, barcode, productSku, purchaseId, itemLocationId, buyPrice, sellPrice]
          );

          // Create stock movement (PURCHASE)
          await conn.execute(
            `INSERT INTO stock_movements 
             (unit_id, barcode, product_id, from_location_id, to_location_id, movement_type, quantity, reference_type, reference_id, user_id, notes)
             VALUES (?, ?, ?, NULL, ?, 'PURCHASE', 1, 'PURCHASE', ?, ?, ?)`,
            [unitRes.insertId, barcode, item.product_id, itemLocationId, purchaseId, req.user.id, `Stock in via ${purchaseNumber}`]
          );

          createdUnits.push({
            unit_id: unitRes.insertId,
            product_id: item.product_id,
            product_name: prod ? prod.name : '',
            barcode,
            sku: productSku,
            selling_price: sellPrice,
            location_id: itemLocationId,
            location_name: itemLocationId === 1 ? 'Showroom' : 'Warehouse'
          });
        }
      }

      // 5. Update supplier balance (Amount remaining added to current balance)
      const balanceChange = grandTotal - paidVal;
      await conn.execute(
        'UPDATE suppliers SET current_balance = current_balance + ? WHERE id = ?',
        [balanceChange, supplier_id]
      );

      // 6. Record payment if paid_amount > 0
      if (paidVal > 0) {
        await conn.execute(
          `INSERT INTO payments 
           (purchase_id, payment_type, payment_method, amount, reference_number, notes, processed_by)
           VALUES (?, 'PURCHASE', ?, ?, ?, ?, ?)`,
          [purchaseId, payment_method, paidVal, supplier_invoice_no || null, 'Purchase initial payment', req.user.id]
        );
      }

      // 7. Audit log
      await createAuditLog({
        userId: req.user.id,
        role: req.user.role,
        action: 'PURCHASE_CREATED',
        module: 'PURCHASE',
        recordId: purchaseNumber,
        newValue: {
          purchaseId,
          purchaseNumber,
          supplierId: supplier_id,
          totalUnits: totalUnitsCount,
          grandTotal
        },
        ipAddress: req.ip,
        connection: conn
      });

      return {
        purchaseId,
        purchaseNumber,
        totalUnitsCount,
        grandTotal,
        createdUnits
      };
    });

    res.status(201).json({
      success: true,
      message: `Purchase ${result.purchaseNumber} recorded successfully with ${result.totalUnitsCount} unique barcode units added to Warehouse.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
