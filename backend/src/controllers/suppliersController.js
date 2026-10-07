import { query } from '../config/db.js';
import { createAuditLog } from '../middleware/auditMiddleware.js';

export const getSuppliers = async (req, res, next) => {
  try {
    const { search, status } = req.query;

    let sql = `
      SELECT s.*, 
             COUNT(p.id) as total_purchases,
             COALESCE(SUM(p.grand_total), 0) as total_purchase_amount
      FROM suppliers s
      LEFT JOIN purchases p ON s.id = p.supplier_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND s.status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (s.name LIKE ? OR s.phone LIKE ? OR s.email LIKE ? OR s.gst_number LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ' GROUP BY s.id ORDER BY s.name ASC';

    const suppliers = await query(sql, params);

    res.json({
      success: true,
      data: { suppliers }
    });
  } catch (error) {
    next(error);
  }
};

export const getSupplierById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [supplier] = await query('SELECT * FROM suppliers WHERE id = ?', [id]);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
        code: 'SUPPLIER_NOT_FOUND'
      });
    }

    const purchases = await query(
      'SELECT * FROM purchases WHERE supplier_id = ? ORDER BY purchase_date DESC, id DESC',
      [id]
    );

    res.json({
      success: true,
      data: { supplier, purchases }
    });
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (req, res, next) => {
  try {
    const { name, phone, email, address, gst_number, opening_balance = 0 } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required.',
        code: 'MISSING_NAME'
      });
    }

    const openBal = parseFloat(opening_balance) || 0;

    const result = await query(
      `INSERT INTO suppliers (name, phone, email, address, gst_number, opening_balance, current_balance, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [name.trim(), phone || null, email || null, address || null, gst_number || null, openBal, openBal]
    );

    await createAuditLog({
      userId: req.user.id,
      role: req.user.role,
      action: 'SUPPLIER_CREATED',
      module: 'SUPPLIERS',
      recordId: result.insertId,
      newValue: req.body,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully.',
      data: { id: result.insertId }
    });
  } catch (error) {
    next(error);
  }
};

export const updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, gst_number, status } = req.body;

    const [old] = await query('SELECT * FROM suppliers WHERE id = ?', [id]);
    if (!old) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
        code: 'SUPPLIER_NOT_FOUND'
      });
    }

    await query(
      `UPDATE suppliers SET 
       name = ?, phone = ?, email = ?, address = ?, gst_number = ?, status = ?
       WHERE id = ?`,
      [
        name ? name.trim() : old.name,
        phone !== undefined ? phone : old.phone,
        email !== undefined ? email : old.email,
        address !== undefined ? address : old.address,
        gst_number !== undefined ? gst_number : old.gst_number,
        status || old.status,
        id
      ]
    );

    await createAuditLog({
      userId: req.user.id,
      role: req.user.role,
      action: 'SUPPLIER_UPDATED',
      module: 'SUPPLIERS',
      recordId: id,
      oldValue: old,
      newValue: req.body,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Supplier updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};
