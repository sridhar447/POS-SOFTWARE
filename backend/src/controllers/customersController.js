import { query } from '../config/db.js';
import { createAuditLog } from '../middleware/auditMiddleware.js';

export const getCustomers = async (req, res, next) => {
  try {
    const { search, phone } = req.query;

    let sql = `
      SELECT c.*, 
             COUNT(s.id) as total_orders,
             COALESCE(SUM(s.grand_total), 0) as total_spent
      FROM customers c
      LEFT JOIN sales s ON c.id = s.customer_id
      WHERE 1=1
    `;
    const params = [];

    if (phone) {
      sql += ' AND c.phone LIKE ?';
      params.push(`%${phone.trim()}%`);
    }
    if (search) {
      sql += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' GROUP BY c.id ORDER BY c.id DESC';

    const customers = await query(sql, params);

    res.json({
      success: true,
      data: { customers }
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [customer] = await query('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
        code: 'CUSTOMER_NOT_FOUND'
      });
    }

    const purchases = await query(
      'SELECT * FROM sales WHERE customer_id = ? ORDER BY sale_date DESC, id DESC',
      [id]
    );

    res.json({
      success: true,
      data: { customer, purchases }
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address, customer_type = 'REGISTERED' } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required.',
        code: 'MISSING_NAME'
      });
    }

    const result = await query(
      'INSERT INTO customers (name, phone, email, address, customer_type) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), phone ? phone.trim() : null, email || null, address || null, customer_type]
    );

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully.',
      data: { id: result.insertId }
    });
  } catch (error) {
    next(error);
  }
};
