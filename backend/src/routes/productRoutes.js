import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  getBrands,
  createBrand
} from '../controllers/productController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/rbacMiddleware.js';

const router = Router();

router.use(authenticate);

// Publicly readable for authenticated users (POS search)
router.get('/categories', getCategories);
router.get('/brands', getBrands);
router.get('/', getProducts);
router.get('/:id', getProductById);

// Admin-only mutations
router.post('/', requireAdmin, createProduct);
router.put('/:id', requireAdmin, updateProduct);
router.delete('/:id', requireAdmin, deleteProduct);
router.post('/categories', requireAdmin, createCategory);
router.post('/brands', requireAdmin, createBrand);

export default router;
