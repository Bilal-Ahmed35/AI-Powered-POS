const express = require('express');
const {
  getInventoryItems,
  getInventoryLogs,
  addInventoryItem,
  restockItem,
  getForecast,
  getInventoryAlerts
} = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN', 'VENDOR'])); // Inventory is restricted to Admin/Vendor

router.get('/', getInventoryItems);
router.get('/logs', getInventoryLogs);
router.get('/alerts', getInventoryAlerts);
router.post('/', addInventoryItem);
router.post('/:id/restock', restockItem);
router.get('/:id/forecast', getForecast);

module.exports = router;
