import { Router } from 'express';
import { scanBarcode, searchShowroomProducts, checkout } from '../controllers/posController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

// Fast POS barcode scanning & verification
router.post('/scan', scanBarcode);

// Quick showroom product search
router.get('/search', searchShowroomProducts);

// Complete transactional sale checkout
router.post('/checkout', checkout);

export default router;
