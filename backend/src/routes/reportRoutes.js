import { Router } from 'express';
import {
  getSalesReport,
  getPurchaseReport,
  getStockReport,
  getProfitLossReport,
  getStockMovementsReport,
  getStaffSalesReport
} from '../controllers/reportsController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/rbacMiddleware.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/sales', getSalesReport);
router.get('/purchases', getPurchaseReport);
router.get('/stock', getStockReport);
router.get('/profit-loss', getProfitLossReport);
router.get('/stock-movements', getStockMovementsReport);
router.get('/staff-sales', getStaffSalesReport);

export default router;
