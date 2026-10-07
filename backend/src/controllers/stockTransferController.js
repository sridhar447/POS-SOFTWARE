import { query, transaction } from '../config/db.js';
import { getNextDocumentNumber } from '../utils/numberGenerators.js';
import { createAuditLog } from '../middleware/auditMiddleware.js';

export const getTransfers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const transfers = await query(
      `SELECT t.*, 
              fl.name as from_location_name, 
              tl.name as to_location_name,
              u.name as transferred_by_name
       FROM stock_transfers t
       JOIN stock_locations fl ON t.from_location_id = fl.id
       JOIN stock_locations tl ON t.to_location_id = tl.id
       LEFT JOIN users u ON t.transferred_by = u.id
       ORDER BY t.id DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit, 10), parseInt(offset, 10)]
    );

    res.json({
      success: true,
      data: { transfers }
    });
  } catch (error) {
    next(error);
  }
};

export const getTransferById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [transfer] = await query(
      `SELECT t.*, 
              fl.name as from_location_name, 
              tl.name as to_location_name,
              u.name as transferred_by_name
       FROM stock_transfers t
       JOIN stock_locations fl ON t.from_location_id = fl.id
       JOIN stock_locations tl ON t.to_location_id = tl.id
       LEFT JOIN users u ON t.transferred_by = u.id
       WHERE t.id = ?`,
      [id]
    );

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Stock transfer record not found.',
        code: 'TRANSFER_NOT_FOUND'
      });
    }

    const items = await query(
      `SELECT ti.*, p.name as product_name, p.sku
       FROM stock_transfer_items ti
       JOIN products p ON ti.product_id = p.id
       WHERE ti.transfer_id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: { transfer, items }
    });
  } catch (error) {
    next(error);
  }
};

export const createTransfer = async (req, res, next) => {
  try {
    const {
      from_location_id,
      to_location_id,
      transfer_date,
      reason,
      barcodes, // Array of string barcodes (e.g. ['SH-WH2001', 'SH-WH2002'])
      product_id, // Or transfer by quantity
      quantity
    } = req.body;

    const fromLoc = parseInt(from_location_id, 10);
    const toLoc = parseInt(to_location_id, 10);

    if (!fromLoc || !toLoc) {
      return res.status(400).json({
        success: false,
        message: 'From location and To location are required.',
        code: 'MISSING_LOCATIONS'
      });
    }

    if (fromLoc === toLoc) {
      return res.status(400).json({
        success: false,
        message: 'Source and Destination locations must be different.',
        code: 'IDENTICAL_LOCATIONS'
      });
    }

    let targetBarcodes = [];

    if (barcodes && Array.isArray(barcodes) && barcodes.length > 0) {
      targetBarcodes = barcodes.map(b => b.trim());
    } else if (product_id && quantity && parseInt(quantity, 10) > 0) {
      // Pick available units from source location automatically
      const qty = parseInt(quantity, 10);
      const availableUnits = await query(
        `SELECT barcode FROM product_units 
         WHERE product_id = ? AND location_id = ? AND status = 'AVAILABLE'
         ORDER BY id ASC LIMIT ?`,
        [product_id, fromLoc, qty]
      );

      if (availableUnits.length < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock in source location. Requested: ${qty}, Available: ${availableUnits.length}`,
          code: 'INSUFFICIENT_STOCK'
        });
      }

      targetBarcodes = availableUnits.map(u => u.barcode);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Provide a list of barcodes or specify product ID and quantity.',
        code: 'MISSING_TRANSFER_ITEMS'
      });
    }

    const transferNumber = await getNextDocumentNumber('TRANSFER');

    const result = await transaction(async (conn) => {
      // 1. Lock and validate all target units
      const placeholders = targetBarcodes.map(() => '?').join(',');
      const [units] = await conn.query(
        `SELECT id, product_id, barcode, location_id, status 
         FROM product_units 
         WHERE barcode IN (${placeholders}) 
         FOR UPDATE`,
        targetBarcodes
      );

      if (units.length !== targetBarcodes.length) {
        throw new Error('One or more barcodes do not exist in the database.');
      }

      for (const unit of units) {
        if (unit.location_id !== fromLoc) {
          throw new Error(`Barcode ${unit.barcode} is not in the source location.`);
        }
        if (unit.status !== 'AVAILABLE') {
          throw new Error(`Barcode ${unit.barcode} is not in AVAILABLE status (current: ${unit.status}).`);
        }
      }

      // 2. Insert stock_transfers header
      const [trfHeader] = await conn.execute(
        `INSERT INTO stock_transfers 
         (transfer_number, from_location_id, to_location_id, total_quantity, transfer_date, transferred_by, reason, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED')`,
        [
          transferNumber,
          fromLoc,
          toLoc,
          units.length,
          transfer_date || new Date().toISOString().slice(0, 10),
          req.user.id,
          reason || 'Regular showroom replenishment'
        ]
      );
      const transferId = trfHeader.insertId;

      // 3. Update product_units to new location and insert transfer items & movements
      for (const unit of units) {
        // Move unit location
        await conn.execute(
          'UPDATE product_units SET location_id = ? WHERE id = ?',
          [toLoc, unit.id]
        );

        // Record transfer item
        await conn.execute(
          `INSERT INTO stock_transfer_items (transfer_id, unit_id, product_id, barcode)
           VALUES (?, ?, ?, ?)`,
          [transferId, unit.id, unit.product_id, unit.barcode]
        );

        // Record stock movements
        await conn.execute(
          `INSERT INTO stock_movements 
           (unit_id, barcode, product_id, from_location_id, to_location_id, movement_type, quantity, reference_type, reference_id, user_id, notes)
           VALUES (?, ?, ?, ?, ?, 'TRANSFER_OUT', 1, 'STOCK_TRANSFER', ?, ?, ?)`,
          [unit.id, unit.barcode, unit.product_id, fromLoc, toLoc, transferId, req.user.id, `Transferred via ${transferNumber}`]
        );
      }

      // 4. Audit Log
      await createAuditLog({
        userId: req.user.id,
        role: req.user.role,
        action: 'STOCK_TRANSFERRED',
        module: 'TRANSFER',
        recordId: transferNumber,
        newValue: {
          transferId,
          transferNumber,
          fromLocation: fromLoc,
          toLocation: toLoc,
          count: units.length,
          barcodes: targetBarcodes
        },
        ipAddress: req.ip,
        connection: conn
      });

      return {
        transferId,
        transferNumber,
        totalQuantity: units.length
      };
    });

    res.status(201).json({
      success: true,
      message: `Stock transfer ${result.transferNumber} completed successfully (${result.totalQuantity} units moved).`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
