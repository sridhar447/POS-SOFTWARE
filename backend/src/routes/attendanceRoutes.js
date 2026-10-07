import { Router } from 'express';
import {
  clockIn,
  clockOut,
  getAttendance,
  markAttendanceAdmin
} from '../controllers/attendanceController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/rbacMiddleware.js';

const router = Router();

router.use(authenticate);

// Staff clock-in/out endpoints
router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/', getAttendance);

// Admin manual attendance marking
router.post('/admin-mark', requireAdmin, markAttendanceAdmin);

export default router;
