import { query, transaction } from '../config/db.js';
import { createAuditLog } from '../middleware/auditMiddleware.js';

export const getShowroomStock = async (req, res, next) => {
  try {
    const { category_id, search, status = 'AVAILABLE', page = 1, limit = 50 } = req.query;

    let sql = `
      SELECT u.id as unit_id, u.barcode, u.sku, u.status, u.purchase_price, u.selling_price, u.created_at,
             p.id as product_id, p.name as product_name, p.size, p.color, p.reorder_level,
             c.name as category_name, b.name as brand_name
      FROM product_units u
      JOIN products p ON u.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE u.location_id = 1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      sql += ' AND u.status = ?';
      params.push(status);
    }
    if (category_id) {
      sql += ' AND p.category_id = ?';
      params.push(category_id);
    }
    if (search) {
      sql += ' AND (p.name LIKE ? OR u.barcode LIKE ? OR u.sku LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY u.id DESC';

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const units = await query(sql, params);

    // Get aggregated count for showroom
    const [stats] = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'AVAILABLE' THEN 1 END) as total_available,
        COUNT(CASE WHEN status = 'SOLD' THEN 1 END) as total_sold,
        COUNT(CASE WHEN status = 'DAMAGED' THEN 1 END) as total_damaged,
        COUNT(*) as total_units
      FROM product_units
      WHERE location_id = 1
    `);

    res.json({
      success: true,
      data: {
        units,
        stats,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getWarehouseStock = async (req, res, next) => {
  try {
    const { category_id, search, status = 'AVAILABLE', page = 1, limit = 50 } = req.query;

    let sql = `
      SELECT u.id as unit_id, u.barcode, u.sku, u.status, u.purchase_price, u.selling_price, u.created_at,
             p.id as product_id, p.name as product_name, p.size, p.color,
             c.name as category_name, b.name as brand_name,
             pur.purchase_number, pur.purchase_date,
             s.name as supplier_name
      FROM product_units u
      JOIN products p ON u.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN purchases pur ON u.purchase_id = pur.id
      LEFT JOIN suppliers s ON pur.supplier_id = s.id
      WHERE u.location_id = 2
    `;
    const params = [];

    if (status && status !== 'ALL') {
      sql += ' AND u.status = ?';
      params.push(status);
    }
    if (category_id) {
      sql += ' AND p.category_id = ?';
      params.push(category_id);
    }
    if (search) {
      sql += ' AND (p.name LIKE ? OR u.barcode LIKE ? OR u.sku LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY u.id DESC';

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const units = await query(sql, params);

    const [stats] = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'AVAILABLE' THEN 1 END) as total_available,
        COUNT(CASE WHEN status = 'DAMAGED' THEN 1 END) as total_damaged,
        COUNT(*) as total_units
      FROM product_units
      WHERE location_id = 2
    `);

    res.json({
      success: true,
      data: {
        units,
        stats,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAllBarcodes = async (req, res, next) => {
  try {
    const { search, location_id, status, page = 1, limit = 50 } = req.query;

    let sql = `
      SELECT u.id as unit_id, u.barcode, u.sku, u.status, u.purchase_price, u.selling_price, u.created_at,
             p.id as product_id, p.name as product_name,
             l.name as location_name, l.code as location_code
      FROM product_units u
      JOIN products p ON u.product_id = p.id
      JOIN stock_locations l ON u.location_id = l.id
      WHERE 1=1
    `;
    const params = [];

    if (location_id) {
      sql += ' AND u.location_id = ?';
      params.push(location_id);
    }
    if (status) {
      sql += ' AND u.status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (u.barcode LIKE ? OR p.name LIKE ? OR u.sku LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY u.id DESC';
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const barcodes = await query(sql, params);

    res.json({
      success: true,
      data: { barcodes }
    });
  } catch (error) {
    next(error);
  }
};

export const getBarcodeDetails = async (req, res, next) => {
  try {
    const { barcode } = req.params;

    const [unit] = await query(
      `SELECT u.*, p.name as product_name, p.size, p.color, p.sku as product_sku,
              l.name as location_name, l.code as location_code,
              c.name as category_name, b.name as brand_name,
              pur.purchase_number, pur.purchase_date, s.name as supplier_name
       FROM product_units u
       JOIN products p ON u.product_id = p.id
       JOIN stock_locations l ON u.location_id = l.id
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN brands b ON p.brand_id = b.id
       LEFT JOIN purchases pur ON u.purchase_id = pur.id
       LEFT JOIN suppliers s ON pur.supplier_id = s.id
       WHERE u.barcode = ?`,
      [barcode.trim()]
    );

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Barcode not found.',
        code: 'BARCODE_NOT_FOUND'
      });
    }

    // Get movement history
    const movements = await query(
      `SELECT m.*, u.name as user_name,
              fl.name as from_location, tl.name as to_location
       FROM stock_movements m
       LEFT JOIN users u ON m.user_id = u.id
       LEFT JOIN stock_locations fl ON m.from_location_id = fl.id
       LEFT JOIN stock_locations tl ON m.to_location_id = tl.id
       WHERE m.barcode = ?
       ORDER BY m.id DESC`,
      [barcode.trim()]
    );

    res.json({
      success: true,
      data: { unit, movements }
    });
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (req, res, next) => {
  try {
    const { barcode, new_status, new_location_id, reason } = req.body;

    if (!barcode || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Barcode and adjustment reason are required.',
        code: 'MISSING_FIELDS'
      });
    }

    await transaction(async (conn) => {
      const [[unit]] = await conn.execute(
        'SELECT * FROM product_units WHERE barcode = ? FOR UPDATE',
        [barcode.trim()]
      );

      if (!unit) {
        throw new Error('Barcode unit not found.');
      }

      const updateFields = [];
      const updateParams = [];

      if (new_status && new_status !== unit.status) {
        updateFields.push('status = ?');
        updateParams.push(new_status);
      }
      if (new_location_id && parseInt(new_location_id, 10) !== unit.location_id) {
        updateFields.push('location_id = ?');
        updateParams.push(parseInt(new_location_id, 10));
      }

      if (updateFields.length > 0) {
        updateParams.push(unit.id);
        await conn.execute(
          `UPDATE product_units SET ${updateFields.join(', ')} WHERE id = ?`,
          updateParams
        );
      }

      // Log movement
      await conn.execute(
        `INSERT INTO stock_movements 
         (unit_id, barcode, product_id, from_location_id, to_location_id, movement_type, quantity, reference_type, user_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          unit.id,
          unit.barcode,
          unit.product_id,
          unit.location_id,
          new_location_id ? parseInt(new_location_id, 10) : unit.location_id,
          new_status === 'DAMAGED' ? 'DAMAGE' : 'MANUAL_ADJUSTMENT',
          1,
          'MANUAL_ADJUSTMENT',
          req.user.id,
          `Stock adjustment: ${reason}`
        ]
      );

      await createAuditLog({
        userId: req.user.id,
        role: req.user.role,
        action: 'STOCK_ADJUSTMENT',
        module: 'INVENTORY',
        recordId: unit.barcode,
        oldValue: { status: unit.status, location_id: unit.location_id },
        newValue: { status: new_status || unit.status, location_id: new_location_id || unit.location_id, reason },
        ipAddress: req.ip,
        connection: conn
      });
    });

    res.json({
      success: true,
      message: `Stock unit ${barcode} adjusted successfully.`
    });
  } catch (error) {
    next(error);
  }
};
