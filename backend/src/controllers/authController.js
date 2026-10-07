import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { createAuditLog } from '../middleware/auditMiddleware.js';

export const login = async (req, res, next) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/Email and Password are required.',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const [user] = await query(
      'SELECT id, name, email, username, password_hash, role, phone, status FROM users WHERE email = ? OR username = ?',
      [emailOrUsername.trim().toLowerCase(), emailOrUsername.trim()]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact the administrator.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const secret = process.env.JWT_SECRET || 'showroom_erp_jwt_super_secret_key_2026_production_ready';
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Audit log
    await createAuditLog({
      userId: user.id,
      role: user.role,
      action: 'LOGIN',
      module: 'AUTH',
      recordId: user.id,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          phone: user.phone
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const [user] = await query(
      'SELECT id, name, email, username, role, phone, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
        code: 'MISSING_FIELDS'
      });
    }

    const [user] = await query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match.',
        code: 'INCORRECT_CURRENT_PASSWORD'
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

    await createAuditLog({
      userId: req.user.id,
      role: req.user.role,
      action: 'CHANGE_PASSWORD',
      module: 'AUTH',
      recordId: req.user.id,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  if (req.user) {
    await createAuditLog({
      userId: req.user.id,
      role: req.user.role,
      action: 'LOGOUT',
      module: 'AUTH',
      recordId: req.user.id,
      ipAddress: req.ip
    });
  }
  res.json({
    success: true,
    message: 'Logged out successfully.'
  });
};
