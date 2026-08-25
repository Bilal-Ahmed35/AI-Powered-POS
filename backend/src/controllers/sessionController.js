const crypto = require('crypto');
const { prisma } = require('../config/db');
const { verifyTableToken } = require('../services/qrSecurityService');

/**
 * Start a new dining session from a validated table QR
 */
const startSession = async (req, res) => {
  const { qrToken, tableNumber } = req.body;
  const customerId = req.user?.id || null;

  try {
    let table = null;

    if (qrToken) {
      const verification = verifyTableToken(qrToken);
      if (!verification.valid) {
        return res.status(400).json({ error: verification.error || 'Invalid table QR code.' });
      }

      const searchToken = verification.normalizedToken || qrToken;
      table = await prisma.table.findFirst({
        where: {
          OR: [
            { qrToken: searchToken },
            { qrToken: qrToken },
            { tableNumber: `Table ${verification.tableNumber}` },
            { tableNumber: String(verification.tableNumber) },
          ],
        },
        include: { branch: true },
      });
    } else if (tableNumber) {
      const cleanNumber = String(tableNumber).toLowerCase().startsWith('table')
        ? String(tableNumber)
        : `Table ${tableNumber}`;
      table = await prisma.table.findFirst({
        where: { tableNumber: cleanNumber },
        include: { branch: true },
      });
    }

    if (!table) {
      return res.status(404).json({ error: 'Physical dining table not found.' });
    }

    if (!table.isActive) {
      return res.status(403).json({ error: `Table ${table.tableNumber} is currently deactivated by management.` });
    }

    // Create a new distinct session UUID for this customer visit
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours active window

    const session = await prisma.session.create({
      data: {
        id: sessionId,
        tableId: table.id,
        customerId,
        status: 'ACTIVE',
        expiresAt,
        cart: {
          create: {},
        },
      },
      include: {
        table: {
          select: { id: true, tableNumber: true, branchId: true, isActive: true },
        },
        cart: {
          include: {
            items: {
              include: { menuItem: true },
            },
          },
        },
      },
    });

    return res.status(201).json({
      message: 'Dining session initialized successfully.',
      session: {
        id: session.id,
        status: session.status,
        table: session.table,
        customerId: session.customerId,
        expiresAt: session.expiresAt,
        cart: session.cart,
      },
    });
  } catch (error) {
    console.error('Start session error:', error);
    return res.status(500).json({ error: 'Failed to start dining session.' });
  }
};

/**
 * Get details and active status of a session
 */
const getSession = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        table: true,
        customer: {
          select: { id: true, name: true, email: true, role: true },
        },
        cart: {
          include: {
            items: {
              include: { menuItem: true },
            },
          },
        },
        orders: {
          include: {
            orderItems: {
              include: { menuItem: true },
            },
            payment: true,
            etaPrediction: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Dining session not found.' });
    }

    // Auto-expire check
    if (session.status === 'ACTIVE' && new Date() > new Date(session.expiresAt)) {
      const updated = await prisma.session.update({
        where: { id: sessionId },
        data: { status: 'EXPIRED' },
      });
      session.status = updated.status;
    }

    return res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    return res.status(500).json({ error: 'Failed to fetch session details.' });
  }
};

/**
 * Close/complete a dining session
 */
const closeSession = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return res.json({ message: 'Session closed successfully.', session: updated });
  } catch (error) {
    console.error('Close session error:', error);
    return res.status(500).json({ error: 'Failed to close session.' });
  }
};

module.exports = {
  startSession,
  getSession,
  closeSession,
};
