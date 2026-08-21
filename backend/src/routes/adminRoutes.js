const express = require('express');
const {
  getDashboardStats,
  getStaffList,
  createStaff,
  updateStaff,
  updateStaffPassword,
  toggleStaffStatus,
  getAdminOrders
} = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN'])); // Restricted to ADMIN role only

// Stats & Order Search
router.get('/stats', getDashboardStats);
router.get('/orders', getAdminOrders);

// Staff Management
router.get('/staff', getStaffList);
router.post('/staff', createStaff);
router.put('/staff/:id', updateStaff);
router.put('/staff/:id/password', updateStaffPassword);
router.put('/staff/:id/status', toggleStaffStatus);

module.exports = router;
