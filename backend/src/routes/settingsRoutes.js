import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  getAuditLogs,
  getUsers,
  createUser,
  updateUser
} from '../controllers/settingsController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/rbacMiddleware.js';

const router = Router();

router.use(authenticate);

// Settings read (All authenticated users can see showroom profile for headers/invoices)
router.get('/config', getSettings);

// Admin-only management
router.put('/config', requireAdmin, updateSettings);
router.get('/audit-logs', requireAdmin, getAuditLogs);
router.get('/users', requireAdmin, getUsers);
router.post('/users', requireAdmin, createUser);
router.put('/users/:id', requireAdmin, updateUser);

export default router;
