import { query, transaction } from '../config/db.js';
import { getNextDocumentNumber } from '../utils/numberGenerators.js';
import { createAuditLog } from '../middleware/auditMiddleware.js';

export const getReturns = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const returns = await query(
      `SELECT r.*, s.invoice_number, c.name as customer_name, u.name as processed_by_name,
              COUNT(ri.id) as items_count
       FROM sales_returns r
       JOIN sales s ON r.sale_id = s.id
       LEFT JOIN customers c ON r.customer_id = c.id
       LEFT JOIN users u ON r.processed_by = u.id
       LEFT JOIN sales_return_items ri ON r.id = ri.return_id
       GROUP BY r.id
       ORDER BY r.id DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit, 10), parseInt(offset, 10)]
    );

    res.json({
      success: true,
      data: { returns }
    });
  } catch (error) {
    next(error);
  }
};

export const createReturn = async (req, res, next) => {
  try {
    const {
      invoice_number,
      items, // Array of { barcode, refund_amount, return_destination: 'SHOWROOM'|'WAREHOUSE'|'DAMAGED', condition_status, reason }
      reason,
      payment_method = 'CASH'
    } = req.body;

    if (!invoice_number || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number and at least one return item are required.',
        code: 'MISSING_RETURN_DATA'
      });
    }

    const [sale] = await query(
      'SELECT id, customer_id, invoice_number FROM sales WHERE invoice_number = ?',
      [invoice_number.trim()]
    );

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: `Invoice "${invoice_number}" not found.`,
        code: 'INVOICE_NOT_FOUND'
      });
    }

    const returnNumber = await getNextDocumentNumber('RETURN');

    const result = await transaction(async (conn) => {
      let totalRefund = 0;

      // Validate all items against the sale
      for (const item of items) {
        const cleanBarcode = item.barcode.trim();
        const [saleItem] = await conn.query(
          `SELECT si.*, u.id as unit_id, u.status as current_status
           FROM sale_items si
           JOIN product_units u ON si.unit_id = u.id
           WHERE si.sale_id = ? AND si.barcode = ?`,
          [sale.id, cleanBarcode]
        );

        if (!saleItem || saleItem.length === 0) {
          throw new Error(`Barcode ${cleanBarcode} was not sold on invoice ${invoice_number}.`);
        }

        const unitData = saleItem[0];
        if (unitData.current_status !== 'SOLD') {
          throw new Error(`Barcode ${cleanBarcode} is not in SOLD status (Current: ${unitData.current_status}).`);
        }

        totalRefund += parseFloat(item.refund_amount || unitData.line_total);
      }

      // 1. Insert sales_returns record
      const [returnRes] = await conn.execute(
        `INSERT INTO sales_returns 
         (return_number, sale_id, customer_id, return_date, total_refund_amount, processed_by, reason)
         VALUES (?, ?, ?, CURDATE(), ?, ?, ?)`,
        [
          returnNumber,
          sale.id,
          sale.customer_id,
          totalRefund,
          req.user.id,
          reason || 'Customer return'
        ]
      );
      const returnId = returnRes.insertId;

      // 2. Process items
      for (const item of items) {
        const cleanBarcode = item.barcode.trim();
        const [[saleItem]] = await conn.query(
          `SELECT si.*, u.id as unit_id 
           FROM sale_items si 
           JOIN product_units u ON si.unit_id = u.id 
           WHERE si.sale_id = ? AND si.barcode = ?`,
          [sale.id, cleanBarcode]
        );

        const refundAmt = parseFloat(item.refund_amount || saleItem.line_total);
        const destination = item.return_destination || 'SHOWROOM'; // 'SHOWROOM', 'WAREHOUSE', 'DAMAGED'
        const destLocId = destination === 'WAREHOUSE' ? 2 : 1;
        const newStatus = destination === 'DAMAGED' ? 'DAMAGED' : 'AVAILABLE';

        // Insert return item
        await conn.execute(
          `INSERT INTO sales_return_items 
           (return_id, sale_item_id, unit_id, barcode, product_id, refund_amount, return_destination, condition_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            returnId,
            saleItem.id,
            saleItem.unit_id,
            cleanBarcode,
            saleItem.product_id,
            refundAmt,
            destination,
            item.condition_status || 'GOOD'
          ]
        );

        // Update product unit status & location
        await conn.execute(
          'UPDATE product_units SET status = ?, location_id = ? WHERE id = ?',
          [newStatus, destLocId, saleItem.unit_id]
        );

        // Record stock movement (RETURN)
        await conn.execute(
          `INSERT INTO stock_movements 
           (unit_id, barcode, product_id, from_location_id, to_location_id, movement_type, quantity, reference_type, reference_id, user_id, notes)
           VALUES (?, ?, ?, NULL, ?, 'RETURN', 1, 'SALES_RETURN', ?, ?, ?)`,
          [saleItem.unit_id, cleanBarcode, saleItem.product_id, destLocId, returnId, req.user.id, `Returned from invoice ${invoice_number}`]
        );
      }

      // 3. Record refund payment
      await conn.execute(
        `INSERT INTO payments 
         (sale_id, payment_type, payment_method, amount, reference_number, notes, processed_by)
         VALUES (?, 'REFUND', ?, ?, ?, ?, ?)`,
        [sale.id, payment_method, totalRefund, returnNumber, `Refund for return ${returnNumber}`, req.user.id]
      );

      // 4. Audit Log
      await createAuditLog({
        userId: req.user.id,
        role: req.user.role,
        action: 'SALE_RETURN_PROCESSED',
        module: 'RETURNS',
        recordId: returnNumber,
        newValue: {
          returnId,
          returnNumber,
          invoiceNumber: invoice_number,
          totalRefund,
          itemsCount: items.length
        },
        ipAddress: req.ip,
        connection: conn
      });

      return {
        returnId,
        returnNumber,
        totalRefund,
        itemsCount: items.length
      };
    });

    res.status(201).json({
      success: true,
      message: `Return ${result.returnNumber} processed successfully. Refund: ₹${result.totalRefund}`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
