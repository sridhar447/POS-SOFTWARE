import { Router } from 'express';
import authRoutes from './authRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import productRoutes from './productRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';
import transferRoutes from './transferRoutes.js';
import purchaseRoutes from './purchaseRoutes.js';
import posRoutes from './posRoutes.js';
import salesRoutes from './salesRoutes.js';
import returnRoutes from './returnRoutes.js';
import accountsRoutes from './accountsRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import reportRoutes from './reportRoutes.js';
import supplierRoutes from './supplierRoutes.js';
import customerRoutes from './customerRoutes.js';
import settingsRoutes from './settingsRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/transfers', transferRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/pos', posRoutes);
router.use('/sales', salesRoutes);
router.use('/returns', returnRoutes);
router.use('/accounts', accountsRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/reports', reportRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/customers', customerRoutes);
router.use('/settings', settingsRoutes);

export default router;
