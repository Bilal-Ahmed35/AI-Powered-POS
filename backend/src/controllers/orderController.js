const { prisma } = require('../config/db');
const { emitToVendor, emitToKitchen, emitToUser, emitToAdmin } = require('../sockets/socket');
const { sendOrderPlacementEmail, sendOrderCompletionEmail } = require('../services/emailService');
const { calculateETA } = require('../services/etaService');

const createOrder = async (req, res) => {
  const { items, tableId, paymentMethod, paymentStatus, paymentTxId, status, customerEmail, emailVerified } = req.body;
  const userId = req.user.id;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item.' });
  }

  try {
    // Run DB transaction to ensure consistency
    const order = await prisma.$transaction(async (tx) => {
      let total = 0.0;
      const orderItemsData = [];

      for (const item of items) {
        const menuItem = await tx.menuItem.findUnique({
          where: { id: item.menuItemId }
        });

        if (!menuItem || !menuItem.isActive) {
          throw new Error(`Menu item with ID ${item.menuItemId} is not available.`);
        }

        if (menuItem.stock < item.quantity) {
          throw new Error(`Insufficient stock for item: ${menuItem.name}. Available: ${menuItem.stock}`);
        }

        // Deduct stock
        await tx.menuItem.update({
          where: { id: menuItem.id },
          data: { stock: menuItem.stock - item.quantity }
        });

        // Also check and update the raw InventoryItem if it exists (simulate recipes)
        const inventoryItem = await tx.inventoryItem.findFirst({
          where: { name: menuItem.name }
        });
        if (inventoryItem) {
          await tx.inventoryItem.update({
            where: { id: inventoryItem.id },
            data: { stockLevel: { decrement: parseFloat(item.quantity) } }
          });

          await tx.inventoryLog.create({
            data: {
              inventoryItemId: inventoryItem.id,
              changeQty: -parseFloat(item.quantity),
              type: 'DEDUCTION',
              reason: `Order deduction for menu item: ${menuItem.name}`
            }
          });
        }

        total += menuItem.price * item.quantity;
        orderItemsData.push({
          menuItemId: menuItem.id,
          quantity: item.quantity,
          price: menuItem.price
        });
      }

      // Calculate ETA prediction details
      let etaResult = { baseEta: 5.0, adjustedEta: 5.0, queueLength: 0, kitchenLoad: 'Low', isPeakHour: false, historicalDelay: 0.0 };
      try {
        etaResult = await calculateETA(items);
      } catch (etaErr) {
        console.warn('Error calculating ETA during order creation, using default:', etaErr.message);
      }

      const newOrder = await tx.order.create({
        data: {
          tableId,
          customerEmail: customerEmail || req.user.email,
          emailVerified: emailVerified !== undefined ? Boolean(emailVerified) : true,
          total,
          userId,
          paymentMethod,
          paymentStatus: paymentStatus || "UNPAID",
          paymentTxId: paymentTxId || null,
          status: status || "PENDING",
          orderItems: {
            create: orderItemsData
          }
        },
        include: {
          orderItems: {
            include: {
              menuItem: true
            }
          },
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Save ETAPrediction details associated with this order
      try {
        await tx.eTAPrediction.create({
          data: {
            orderId: newOrder.id,
            baseEta: etaResult.baseEta,
            adjustedEta: etaResult.adjustedEta,
            queueLength: etaResult.queueLength,
            kitchenLoad: etaResult.kitchenLoad,
            peakHour: etaResult.isPeakHour,
            historicalDelay: etaResult.historicalDelay
          }
        });
      } catch (predErr) {
        console.warn('Failed to save eTAPrediction record:', predErr.message);
      }

      return newOrder;
    });

    // Realtime Notifications
    emitToUser(userId, 'order:update', order);
    emitToVendor('order:new', order);
    emitToAdmin('order:new', order);
    if (order.status === 'PAID') {
      emitToKitchen('order:new', order);
    }

    // Send email notification immediately after placing order
    sendOrderPlacementEmail(order).catch(err => console.error('Order placement email failed:', err));

    return res.status(201).json({ message: 'Order placed successfully.', order });
  } catch (error) {
    console.error('Create order error:', error.message);
    return res.status(400).json({ error: error.message || 'Failed to place order.' });
  }
};

const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userRole = req.user.role;

  const validStatuses = ['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid order status value.' });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: {
        orderItems: {
          include: { menuItem: true }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const normalizedRole = (userRole || '').toUpperCase();

    // Role specific state transition check:
    // ADMIN has full authority over all statuses.
    // KITCHEN handles PREPARING, READY, COMPLETED.
    // VENDOR handles PAID, PREPARING, READY, COMPLETED, CANCELLED.
    if (normalizedRole === 'KITCHEN' && !['PREPARING', 'READY', 'COMPLETED'].includes(status)) {
      return res.status(403).json({ error: 'Kitchen staff can only mark orders as PREPARING, READY, or COMPLETED.' });
    }

    if (normalizedRole === 'VENDOR' && !['PAID', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(403).json({ error: 'Vendors can mark orders as PAID, PREPARING, READY, COMPLETED, or CANCELLED.' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { status },
      include: {
        orderItems: {
          include: { menuItem: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Save closed-loop actual preparation time if status becomes READY or COMPLETED
    if (['READY', 'COMPLETED'].includes(status)) {
      try {
        const actualTime = (new Date() - new Date(order.createdAt)) / 60000; // in minutes
        await prisma.eTAPrediction.update({
          where: { orderId: order.id },
          data: { actualTime }
        });
        console.log(`Saved closed-loop actual prep time for Order #${order.id}: ${actualTime.toFixed(2)} mins.`);
      } catch (etaErr) {
        console.warn(`Failed to update actualTime in eTAPrediction for Order #${order.id}:`, etaErr.message);
      }
    }

    // Broadcast Realtime updates
    emitToUser(updatedOrder.userId, 'order:update', updatedOrder);
    emitToVendor('order:update', updatedOrder);
    emitToAdmin('order:update', updatedOrder);

    // If order was paid, send to Kitchen queue
    if (status === 'PAID') {
      emitToKitchen('order:new', updatedOrder);
    } else {
      emitToKitchen('order:update', updatedOrder);
    }

    // Trigger email notifications
    if (status === 'COMPLETED') {
      sendOrderCompletionEmail(updatedOrder).catch(err => console.error('Order completion email failed:', err));
    } else if (status === 'READY') {
      const { sendOrderReadyEmail } = require('../services/emailService');
      sendOrderReadyEmail(updatedOrder).catch(err => console.error('Order ready email failed:', err));
    }

    return res.json({ message: `Order status updated to ${status}.`, order: updatedOrder });
  } catch (error) {
    console.error('Update order status error:', error);
    return res.status(500).json({ error: 'Failed to update order status.' });
  }
};

const getAllOrders = async (req, res) => {
  const { status } = req.query;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    const whereClause = {};

    // Customer should only see their own orders
    if (userRole === 'CUSTOMER') {
      whereClause.userId = userId;
    }

    if (status) {
      whereClause.status = status;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        orderItems: {
          include: { menuItem: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({ error: 'Failed to retrieve orders.' });
  }
};

const getOrderById = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: {
        orderItems: {
          include: { menuItem: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Check permissions
    if (userRole === 'CUSTOMER' && order.userId !== userId) {
      return res.status(403).json({ error: 'Access forbidden. You did not place this order.' });
    }

    return res.json({ order });
  } catch (error) {
    console.error('Get order by ID error:', error);
    return res.status(500).json({ error: 'Failed to retrieve order.' });
  }
};

module.exports = {
  createOrder,
  updateOrderStatus,
  getAllOrders,
  getOrderById
};
