import { query, transaction } from '../config/db.js';
import { getNextDocumentNumber } from '../utils/numberGenerators.js';
import { createAuditLog } from '../middleware/auditMiddleware.js';

/**
 * Validates and retrieves product unit info when scanned at the POS counter
 */
export const scanBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.body;

    if (!barcode || !barcode.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Barcode string is required.',
        code: 'MISSING_BARCODE'
      });
    }

    const cleanBarcode = barcode.trim();

    // 1. Check if barcode exists in database
    const [unit] = await query(
      `SELECT u.id as unit_id, u.barcode, u.sku, u.product_id, u.location_id, u.status,
              u.purchase_price, u.selling_price as unit_selling_price,
              p.name as product_name, p.size, p.color, p.selling_price as default_selling_price,
              p.tax_percent, p.discount_percent, p.status as product_status,
              l.name as location_name, l.code as location_code
       FROM product_units u
       JOIN products p ON u.product_id = p.id
       JOIN stock_locations l ON u.location_id = l.id
       WHERE u.barcode = ?`,
      [cleanBarcode]
    );

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: `Barcode "${cleanBarcode}" not found.`,
        code: 'BARCODE_NOT_FOUND'
      });
    }

    // 2. Check location: Location 1 is SHOWROOM, Location 2 is WAREHOUSE
    if (unit.location_id !== 1 || unit.location_code !== 'SHOWROOM') {
      return res.status(400).json({
        success: false,
        message: `Warehouse product cannot be billed. Transfer this product to showroom first. (Current location: ${unit.location_name})`,
        code: 'WAREHOUSE_PRODUCT',
        data: {
          barcode: unit.barcode,
          location: unit.location_name
        }
      });
    }

    // 3. Check status
    if (unit.status === 'SOLD') {
      return res.status(400).json({
        success: false,
        message: 'This product has already been sold.',
        code: 'ALREADY_SOLD'
      });
    }

    if (unit.status === 'DAMAGED') {
      return res.status(400).json({
        success: false,
        message: 'This product is not available for sale (Marked as DAMAGED).',
        code: 'DAMAGED_PRODUCT'
      });
    }

    if (unit.status === 'INACTIVE' || unit.product_status === 'INACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'This product or barcode is inactive.',
        code: 'INACTIVE_BARCODE'
      });
    }

    if (unit.status !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        message: `Product unit is not available for sale. Current status: ${unit.status}`,
        code: 'UNAVAILABLE_STATUS'
      });
    }

    // 4. Success: Return product details for cart
    const price = parseFloat(unit.unit_selling_price || unit.default_selling_price || 0);
    const taxPercent = parseFloat(unit.tax_percent || 0);
    const discountPercent = parseFloat(unit.discount_percent || 0);

    const discountAmount = (price * discountPercent) / 100;
    const taxableAmount = price - discountAmount;
    const taxAmount = (taxableAmount * taxPercent) / 100;
    const lineTotal = taxableAmount + taxAmount;

    res.json({
      success: true,
      message: 'Product verified and ready for cart.',
      data: {
        unit_id: unit.unit_id,
        barcode: unit.barcode,
        product_id: unit.product_id,
        product_name: unit.product_name,
        sku: unit.sku,
        size: unit.size,
        color: unit.color,
        price,
        tax_percent: taxPercent,
        tax_amount: taxAmount,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        line_total: lineTotal,
        purchase_price: parseFloat(unit.purchase_price || 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Rapid search for showroom items (allows cashiers to quickly search by product name/SKU and pick an available showroom barcode)
 */
export const searchShowroomProducts = async (req, res, next) => {
  try {
    const { query: searchQuery } = req.query;
    if (!searchQuery || !searchQuery.trim()) {
      return res.json({ success: true, data: { items: [] } });
    }

    const term = `%${searchQuery.trim()}%`;
    const items = await query(
      `SELECT u.id as unit_id, u.barcode, u.sku, u.selling_price,
              p.id as product_id, p.name as product_name, p.size, p.color,
              p.tax_percent, p.discount_percent, u.purchase_price
       FROM product_units u
       JOIN products p ON u.product_id = p.id
       WHERE u.location_id = 1 
         AND u.status = 'AVAILABLE' 
         AND p.status = 'ACTIVE'
         AND (p.name LIKE ? OR p.sku LIKE ? OR u.barcode LIKE ?)
       ORDER BY p.name ASC
       LIMIT 25`,
      [term, term, term]
    );

    res.json({
      success: true,
      data: { items }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete Sale / POS Checkout with database transaction and row locking
 */
export const checkout = async (req, res, next) => {
  try {
    const {
      customer_id,
      customer_name,
      customer_phone,
      items, // Array of { unit_id, barcode, product_id, product_name, sku, price, discount_amount, tax_percent, tax_amount, line_total, purchase_price }
      subtotal,
      discount_amount = 0,
      tax_amount = 0,
      grand_total,
      payment_method = 'CASH', // 'CASH', 'UPI', 'CARD', 'OTHER', 'SPLIT'
      amount_received,
      change_returned = 0,
      payment_reference,
      notes
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty. Add at least one product before checkout.',
        code: 'EMPTY_CART'
      });
    }

    const grandTotalVal = parseFloat(grand_total) || 0;
    const amountRecVal = parseFloat(amount_received) || grandTotalVal;
    const changeVal = parseFloat(change_returned) || (amountRecVal > grandTotalVal ? amountRecVal - grandTotalVal : 0);

    const invoiceNumber = await getNextDocumentNumber('INVOICE');

    const saleResult = await transaction(async (conn) => {
      // 1. Resolve or create customer if phone provided
      let finalCustomerId = customer_id ? parseInt(customer_id, 10) : null;

      if (!finalCustomerId && customer_phone && customer_phone.trim()) {
        const [existingCust] = await conn.query(
          'SELECT id FROM customers WHERE phone = ?',
          [customer_phone.trim()]
        );
        if (existingCust.length > 0) {
          finalCustomerId = existingCust[0].id;
        } else {
          const [newCust] = await conn.execute(
            'INSERT INTO customers (name, phone, customer_type) VALUES (?, ?, ?)',
            [customer_name ? customer_name.trim() : 'Walk-in Customer', customer_phone.trim(), 'REGISTERED']
          );
          finalCustomerId = newCust.insertId;
        }
      } else if (!finalCustomerId) {
        // Default to walk-in customer (id 1)
        finalCustomerId = 1;
      }

      // 2. Lock and strictly validate all unit barcodes
      const barcodeList = items.map(item => item.barcode.trim());
      const placeholders = barcodeList.map(() => '?').join(',');

      const [lockedUnits] = await conn.query(
        `SELECT id, barcode, product_id, location_id, status, purchase_price, selling_price
         FROM product_units 
         WHERE barcode IN (${placeholders}) 
         FOR UPDATE`,
        barcodeList
      );

      if (lockedUnits.length !== barcodeList.length) {
        throw new Error('One or more barcodes were not found in database during checkout.');
      }

      for (const unit of lockedUnits) {
        if (unit.location_id !== 1) {
          throw new Error(`Product unit ${unit.barcode} is in Warehouse and cannot be billed.`);
        }
        if (unit.status !== 'AVAILABLE') {
          throw new Error(`Product unit ${unit.barcode} is no longer available for sale (Status: ${unit.status}).`);
        }
      }

      // 3. Create sales record
      const [saleRes] = await conn.execute(
        `INSERT INTO sales 
         (invoice_number, customer_id, cashier_id, sale_date, subtotal, discount_amount, tax_amount, grand_total, payment_method, payment_status, amount_received, change_returned, notes)
         VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, 'PAID', ?, ?, ?)`,
        [
          invoiceNumber,
          finalCustomerId,
          req.user.id,
          parseFloat(subtotal) || grandTotalVal,
          parseFloat(discount_amount) || 0,
          parseFloat(tax_amount) || 0,
          grandTotalVal,
          payment_method,
          amountRecVal,
          changeVal,
          notes || null
        ]
      );
      const saleId = saleRes.insertId;

      // 4. Create sale items, mark product units as SOLD, write stock movements
      for (const item of items) {
        const matchingUnit = lockedUnits.find(u => u.barcode === item.barcode);
        const unitPurchasePrice = matchingUnit ? parseFloat(matchingUnit.purchase_price || 0) : parseFloat(item.purchase_price || 0);
        const unitSellingPrice = parseFloat(item.price || item.unit_selling_price || 0);
        const itemDisc = parseFloat(item.discount_amount || 0);
        const itemTaxPct = parseFloat(item.tax_percent || 0);
        const itemTaxAmt = parseFloat(item.tax_amount || 0);
        const itemLineTotal = parseFloat(item.line_total || (unitSellingPrice - itemDisc + itemTaxAmt));

        // Insert sale item
        await conn.execute(
          `INSERT INTO sale_items 
           (sale_id, unit_id, product_id, barcode, product_name, sku, unit_purchase_price, unit_selling_price, discount_amount, tax_percent, tax_amount, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            saleId,
            matchingUnit.id,
            item.product_id,
            item.barcode,
            item.product_name,
            item.sku || null,
            unitPurchasePrice,
            unitSellingPrice,
            itemDisc,
            itemTaxPct,
            itemTaxAmt,
            itemLineTotal
          ]
        );

        // Update physical unit status to SOLD
        await conn.execute(
          "UPDATE product_units SET status = 'SOLD' WHERE id = ?",
          [matchingUnit.id]
        );

        // Record stock movement (type SALE)
        await conn.execute(
          `INSERT INTO stock_movements 
           (unit_id, barcode, product_id, from_location_id, to_location_id, movement_type, quantity, reference_type, reference_id, user_id, notes)
           VALUES (?, ?, ?, 1, NULL, 'SALE', 1, 'INVOICE', ?, ?, ?)`,
          [matchingUnit.id, item.barcode, item.product_id, saleId, req.user.id, `Sold on invoice ${invoiceNumber}`]
        );
      }

      // 5. Record payment transaction
      await conn.execute(
        `INSERT INTO payments 
         (sale_id, payment_type, payment_method, amount, reference_number, notes, processed_by)
         VALUES (?, 'SALE', ?, ?, ?, ?, ?)`,
        [saleId, payment_method, grandTotalVal, payment_reference || null, 'POS sale settlement', req.user.id]
      );

      // 6. Audit log
      await createAuditLog({
        userId: req.user.id,
        role: req.user.role,
        action: 'SALE_COMPLETED',
        module: 'POS',
        recordId: invoiceNumber,
        newValue: {
          saleId,
          invoiceNumber,
          grandTotal: grandTotalVal,
          itemsCount: items.length,
          paymentMethod: payment_method
        },
        ipAddress: req.ip,
        connection: conn
      });

      return {
        saleId,
        invoiceNumber,
        grandTotal: grandTotalVal,
        amountReceived: amountRecVal,
        changeReturned: changeVal,
        paymentMethod: payment_method,
        saleDate: new Date().toISOString().slice(0, 10),
        cashierName: req.user.name,
        customerName: customer_name || 'Walk-in Customer',
        customerPhone: customer_phone || ''
      };
    });

    res.status(201).json({
      success: true,
      message: `Sale completed successfully. Invoice ${saleResult.invoiceNumber} generated.`,
      data: saleResult
    });
  } catch (error) {
    next(error);
  }
};
