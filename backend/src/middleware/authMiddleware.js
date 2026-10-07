import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required. Please login.',
        code: 'UNAUTHENTICATED'
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'showroom_erp_jwt_super_secret_key_2026_production_ready';

    const decoded = jwt.verify(token, secret);
    
    // Check if user is still active in DB
    const [user] = await query(
      'SELECT id, name, email, username, role, status FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive or no longer exists.',
        code: 'USER_INACTIVE'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session has expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
      code: 'INVALID_TOKEN'
    });
  }
};
