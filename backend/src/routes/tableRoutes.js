const express = require('express');
const {
  getAllTables,
  addTable,
  updateTable,
  regenerateTableQR,
  getTableQRCard,
  getBatchTableQRCards,
} = require('../controllers/tableController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// Public / customer can read table QR cards if needed
router.get('/:id/qr', getTableQRCard);
router.get('/qr/batch', getBatchTableQRCards);

// Staff/Admin endpoints
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN', 'VENDOR']));

router.get('/', getAllTables);
router.post('/', roleMiddleware(['ADMIN']), addTable);
router.put('/:id', roleMiddleware(['ADMIN']), updateTable);
router.post('/:id/regenerate-qr', roleMiddleware(['ADMIN']), regenerateTableQR);

module.exports = router;
