import { query } from '../config/db.js';

export const getSales = async (req, res, next) => {
  try {
    const { start_date, end_date, cashier_id, customer_id, payment_method, search, page = 1, limit = 50 } = req.query;

    let sql = `
      SELECT s.*, 
             c.name as customer_name, c.phone as customer_phone,
             u.name as cashier_name,
             COUNT(si.id) as total_items
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      JOIN users u ON s.cashier_id = u.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE 1=1
    `;
    const params = [];

    // Staff role restriction: if cashier and not admin, can only view their own sales if specified
    if (req.user.role === 'BILLING_USER') {
      sql += ' AND s.cashier_id = ?';
      params.push(req.user.id);
    } else if (cashier_id) {
      sql += ' AND s.cashier_id = ?';
      params.push(cashier_id);
    }

    if (customer_id) {
      sql += ' AND s.customer_id = ?';
      params.push(customer_id);
    }
    if (payment_method) {
      sql += ' AND s.payment_method = ?';
      params.push(payment_method);
    }
    if (start_date) {
      sql += ' AND s.sale_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND s.sale_date <= ?';
      params.push(end_date);
    }
    if (search) {
      sql += ' AND (s.invoice_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' GROUP BY s.id ORDER BY s.id DESC';

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const sales = await query(sql, params);

    res.json({
      success: true,
      data: { sales }
    });
  } catch (error) {
    next(error);
  }
};

export const getSaleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [sale] = await query(
      `SELECT s.*, 
              c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address,
              u.name as cashier_name, u.email as cashier_email
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       JOIN users u ON s.cashier_id = u.id
       WHERE s.id = ? OR s.invoice_number = ?`,
      [id, id]
    );

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale invoice not found.',
        code: 'SALE_NOT_FOUND'
      });
    }

    // Role check: Billing staff can only view their own sales unless admin
    if (req.user.role === 'BILLING_USER' && sale.cashier_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only view your own sales.',
        code: 'FORBIDDEN'
      });
    }

    const items = await query(
      `SELECT si.*, p.size, p.color, p.sku as product_sku
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = ?`,
      [sale.id]
    );

    const payments = await query(
      'SELECT * FROM payments WHERE sale_id = ? ORDER BY id ASC',
      [sale.id]
    );

    // Get showroom settings for invoice header/footer
    const settingsList = await query('SELECT key_name, key_value FROM settings');
    const settings = {};
    settingsList.forEach(s => { settings[s.key_name] = s.key_value; });

    res.json({
      success: true,
      data: {
        sale,
        items,
        payments,
        settings
      }
    });
  } catch (error) {
    next(error);
  }
};
