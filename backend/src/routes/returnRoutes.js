import { Router } from 'express';
import { getReturns, createReturn } from '../controllers/salesReturnController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getReturns);
router.post('/', createReturn);

export default router;
