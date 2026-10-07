import { Router } from 'express';
import { getStats, getCharts } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/rbacMiddleware.js';

const router = Router();

router.use(authenticate, requireAdmin);
router.get('/stats', getStats);
router.get('/charts', getCharts);

export default router;
