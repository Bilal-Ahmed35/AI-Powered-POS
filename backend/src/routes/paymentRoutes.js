const express = require('express');
const { submitTransactionId, verifyTransaction } = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/submit', submitTransactionId);
router.put('/:id/verify', roleMiddleware(['ADMIN', 'VENDOR']), verifyTransaction);

module.exports = router;
