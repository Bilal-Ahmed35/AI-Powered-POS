const express = require('express');
const {
  createOrder,
  updateOrderStatus,
  getAllOrders,
  getOrderById
} = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware); // All order routes require login

router.post('/', createOrder);
router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.put('/:id/status', roleMiddleware(['ADMIN', 'VENDOR', 'KITCHEN']), updateOrderStatus);

module.exports = router;
