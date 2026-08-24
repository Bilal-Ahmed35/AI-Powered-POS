const express = require('express');
const {
  getDashboardStats,
  getStaffList,
  createStaff,
  updateStaff,
  updateStaffPassword,
  toggleStaffStatus,
  getAdminOrders,
  generateTableQR,
  generateBatchQRs
} = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN'])); // Restricted to ADMIN role only

// Stats & Order Search
router.get('/stats', getDashboardStats);
router.get('/orders', getAdminOrders);

// QR Code Generation
router.get('/qr/batch', generateBatchQRs);
router.get('/qr/:tableId', generateTableQR);

// Staff Management
router.get('/staff', getStaffList);
router.post('/staff', createStaff);
router.put('/staff/:id', updateStaff);
router.put('/staff/:id/password', updateStaffPassword);
router.put('/staff/:id/status', toggleStaffStatus);

module.exports = router;
