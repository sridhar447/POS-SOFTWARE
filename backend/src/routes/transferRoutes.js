import { Router } from 'express';
import { getTransfers, getTransferById, createTransfer } from '../controllers/stockTransferController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/rbacMiddleware.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', getTransfers);
router.get('/:id', getTransferById);
router.post('/', createTransfer);

export default router;
