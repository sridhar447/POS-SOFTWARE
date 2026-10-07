import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer
} from '../controllers/customersController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);

export default router;
