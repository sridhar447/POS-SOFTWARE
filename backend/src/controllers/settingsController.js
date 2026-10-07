import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { createAuditLog } from '../middleware/auditMiddleware.js';

export const getSettings = async (req, res, next) => {
  try {
    const rows = await query('SELECT key_name, key_value FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key_name] = r.key_value; });
    res.json({ success: true, data: { settings } });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const settings = req.body; // e.g. { showroom_name: "...", gst_number: "..." }

    const oldRows = await query('SELECT key_name, key_value FROM settings');
    const oldSettings = {};
    oldRows.forEach(r => { oldSettings[r.key_name] = r.key_value; });

    for (const [key, value] of Object.entries(settings)) {
      await query(
        'INSERT OR REPLACE INTO settings (key_name, key_value) VALUES (?, ?)',
        [key, String(value)]
      );
    }

    await createAuditLog({
      userId: req.user.id,
      role: req.user.role,
      action: 'SETTINGS_UPDATED',
      module: 'SETTINGS',
      oldValue: oldSettings,
      newValue: settings,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Showroom settings updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const { module, action, user_id, start_date, end_date, page = 1, limit = 50 } = req.query;

    let sql = `
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (module) {
      sql += ' AND al.module = ?';
      params.push(module);
    }
    if (action) {
      sql += ' AND al.action = ?';
      params.push(action);
    }
    if (user_id) {
      sql += ' AND al.user_id = ?';
      params.push(user_id);
    }
    if (start_date) {
      sql += ' AND al.created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND al.created_at <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY al.id DESC';

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const logs = await query(sql, params);

    res.json({
      success: true,
      data: { logs }
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const users = await query(
      'SELECT id, name, email, username, role, phone, status, created_at, updated_at FROM users ORDER BY id ASC'
    );
    res.json({ success: true, data: { users } });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, username, password, role = 'BILLING_USER', phone } = req.body;

    if (!name || !email || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, Email, Username, and Password are required.',
        code: 'MISSING_USER_FIELDS'
      });
    }

    // Check duplicate email or username
    const [existing] = await query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email.trim().toLowerCase(), username.trim()]
    );
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists.',
        code: 'DUPLICATE_USER'
      });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (name, email, username, password_hash, role, phone, status) VALUES (?, ?, ?, ?, ?, ?, "ACTIVE")',
      [name.trim(), email.trim().toLowerCase(), username.trim(), hash, role, phone || null]
    );

    await createAuditLog({
      userId: req.user.id,
      role: req.user.role,
      action: 'USER_CREATED',
      module: 'USERS',
      recordId: result.insertId,
      newValue: { name, email, username, role, phone },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: { id: result.insertId }
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, username, role, phone, status, password } = req.body;

    const [oldUser] = await query('SELECT * FROM users WHERE id = ?', [id]);
    if (!oldUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    const updateFields = [
      'name = ?',
      'email = ?',
      'username = ?',
      'role = ?',
      'phone = ?',
      'status = ?'
    ];
    const updateParams = [
      name ? name.trim() : oldUser.name,
      email ? email.trim().toLowerCase() : oldUser.email,
      username ? username.trim() : oldUser.username,
      role || oldUser.role,
      phone !== undefined ? phone : oldUser.phone,
      status || oldUser.status
    ];

    if (password && password.trim().length > 0) {
      const newHash = await bcrypt.hash(password.trim(), 10);
      updateFields.push('password_hash = ?');
      updateParams.push(newHash);
    }

    updateParams.push(id);
    await query(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, updateParams);

    await createAuditLog({
      userId: req.user.id,
      role: req.user.role,
      action: 'USER_UPDATED',
      module: 'USERS',
      recordId: id,
      oldValue: { name: oldUser.name, email: oldUser.email, role: oldUser.role, status: oldUser.status },
      newValue: req.body,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'User updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};
