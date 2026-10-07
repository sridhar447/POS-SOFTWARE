import { Router } from 'express';
import {
  getExpenses,
  createExpense,
  getDailySummary,
  submitDailyClosing,
  getClosingHistory
} from '../controllers/accountsController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/rbacMiddleware.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/expenses', getExpenses);
router.post('/expenses', createExpense);
router.get('/daily-summary', getDailySummary);
router.post('/daily-closing', submitDailyClosing);
router.get('/closing-history', getClosingHistory);

export default router;
