import { Router } from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier
} from '../controllers/suppliersController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/rbacMiddleware.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', getSuppliers);
router.get('/:id', getSupplierById);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);

export default router;
