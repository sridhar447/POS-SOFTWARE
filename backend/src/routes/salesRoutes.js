import { Router } from 'express';
import { getSales, getSaleById } from '../controllers/salesController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getSales);
router.get('/:id', getSaleById);

export default router;
