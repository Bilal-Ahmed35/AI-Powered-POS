const express = require('express');
const {
  getDashboardStats,
  getAuditLogs,
  getStaffList,
  createStaff,
  updateStaff,
  toggleStaffStatus,
  getBranches,
  createBranch,
} = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN']));

// Dashboard Analytics & Logs
router.get('/stats', getDashboardStats);
router.get('/audit-logs', getAuditLogs);

// Staff Account Management
router.get('/staff', getStaffList);
router.post('/staff', createStaff);
router.put('/staff/:id', updateStaff);
router.put('/staff/:id/status', toggleStaffStatus);

// Branch Management
router.get('/branches', getBranches);
router.post('/branches', createBranch);

module.exports = router;
