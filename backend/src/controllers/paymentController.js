const { prisma } = require('../config/db');
const { emitToVendor, emitToUser, emitToKitchen, emitToAdmin } = require('../sockets/socket');

const submitTransactionId = async (req, res) => {
  const { orderId, paymentMethod, paymentTxId } = req.body;
  const userId = req.user.id;

  if (!orderId || !paymentMethod || !paymentTxId) {
    return res.status(400).json({ error: 'Order ID, payment method, and transaction ID are required.' });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.userId !== userId) {
      return res.status(403).json({ error: 'Access forbidden. This order belongs to another customer.' });
    }

    // Update order payment status
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentMethod,
        paymentTxId,
        paymentStatus: 'PENDING_VERIFICATION'
      },
      include: {
        orderItems: { include: { menuItem: true } },
        user: { select: { id: true, name: true, email: true } }
      }
    });

    // Notify vendor about transaction pending verification
    emitToVendor('payment:verify', updatedOrder);
    emitToAdmin('payment:verify', updatedOrder);
    emitToUser(userId, 'order:update', updatedOrder);

    return res.json({
      message: 'Transaction details submitted successfully. Awaiting vendor verification.',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Submit payment transaction error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'This transaction ID has already been submitted for another payment.' });
    }
    return res.status(500).json({ error: 'Failed to submit payment verification details.' });
  }
};

const verifyTransaction = async (req, res) => {
  const { id } = req.params; // Order ID
  const { approve, reason } = req.body; // approve: boolean

  if (approve === undefined) {
    return res.status(400).json({ error: 'Approval status (approve: true/false) is required.' });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    let paymentStatus = 'FAILED';
    let status = order.status;

    if (approve) {
      paymentStatus = 'VERIFIED';
      status = 'PAID'; // transition to PAID status
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus, status },
      include: {
        orderItems: { include: { menuItem: true } },
        user: { select: { id: true, name: true, email: true } }
      }
    });

    // Notify layers
    emitToUser(updatedOrder.userId, 'order:update', updatedOrder);
    emitToVendor('order:update', updatedOrder);
    emitToAdmin('order:update', updatedOrder);

    if (approve) {
      // Send order directly to kitchen
      emitToKitchen('order:new', updatedOrder);
    }

    return res.json({
      message: approve ? 'Payment verified and order sent to kitchen.' : 'Payment verification failed.',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    return res.status(500).json({ error: 'Failed to verify transaction.' });
  }
};

module.exports = {
  submitTransactionId,
  verifyTransaction
};
