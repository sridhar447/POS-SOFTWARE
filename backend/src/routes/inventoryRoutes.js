import { Router } from 'express';
import {
  getShowroomStock,
  getWarehouseStock,
  getAllBarcodes,
  getBarcodeDetails,
  adjustStock
} from '../controllers/inventoryController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/rbacMiddleware.js';

const router = Router();

router.use(authenticate);

// Showroom stock view (Admin and Billing users can view available showroom products)
router.get('/showroom', getShowroomStock);

// Barcode lookup
router.get('/barcodes', getAllBarcodes);
router.get('/barcodes/:barcode', getBarcodeDetails);

// Warehouse inventory & manual stock adjustments (STRICTLY Admin only)
router.get('/warehouse', requireAdmin, getWarehouseStock);
router.post('/adjust', requireAdmin, adjustStock);

export default router;
