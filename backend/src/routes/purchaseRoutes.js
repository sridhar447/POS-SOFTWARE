import { Router } from 'express';
import { getPurchases, getPurchaseById, createPurchase } from '../controllers/purchaseController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/rbacMiddleware.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', getPurchases);
router.get('/:id', getPurchaseById);
router.post('/', createPurchase);

export default router;
