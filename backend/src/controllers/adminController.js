const bcrypt = require('bcryptjs');
const { prisma } = require('../config/db');

const getDashboardStats = async (req, res) => {
  const { period = 'day' } = req.query;

  try {
    // Determine start date based on selected period
    const now = new Date();
    let startDate = new Date();

    if (period === 'day') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    // 1. Calculate Total Revenue for verified/completed orders in period
    const paidOrders = await prisma.order.findMany({
      where: {
        status: { in: ['PAID', 'PREPARING', 'READY', 'COMPLETED'] },
        createdAt: { gte: startDate }
      },
      select: { total: true }
    });
    const totalRevenue = paidOrders.reduce((sum, order) => sum + order.total, 0.0);

    // 2. Count Active Queue (orders in progress)
    const activeOrdersCount = await prisma.order.count({
      where: {
        status: { in: ['PENDING', 'PAID', 'PREPARING', 'READY'] }
      }
    });

    // 3. Registered Users / Staff Accounts count
    const users = await prisma.user.findMany({
      select: { role: true, isActive: true }
    });
    const userStats = {
      customer: users.filter(u => u.role === 'CUSTOMER').length,
      vendor: users.filter(u => u.role === 'VENDOR').length,
      kitchen: users.filter(u => u.role === 'KITCHEN').length,
      admin: users.filter(u => u.role === 'ADMIN').length,
      activeStaff: users.filter(u => u.role !== 'CUSTOMER' && u.isActive !== false).length
    };

    // 4. Low stock inventory warnings (items with stock <= threshold)
    const allInventoryItems = await prisma.inventoryItem.findMany();
    const lowStockAlerts = allInventoryItems.filter(item => item.stockLevel <= item.minThreshold);

    // 5. Recent orders within period
    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        orderItems: { include: { menuItem: true } }
      }
    });

    // 6. Category Breakdown
    const menuItems = await prisma.menuItem.findMany();
    const categories = [...new Set(menuItems.map(item => item.category))];
    const categoryStats = categories.map(cat => ({
      category: cat,
      count: menuItems.filter(item => item.category === cat).length
    }));

    return res.json({
      period,
      metrics: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        activeOrdersCount,
        usersCount: users.length,
        userStats,
        lowStockCount: lowStockAlerts.length
      },
      lowStockAlerts,
      recentOrders,
      categoryStats
    });
  } catch (error) {
    console.error('Fetch dashboard stats error:', error);
    return res.status(500).json({ error: 'Failed to retrieve admin dashboard stats.' });
  }
};

// Staff Management Controllers
const getStaffList = async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'VENDOR', 'KITCHEN'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ staff });
  } catch (error) {
    console.error('Get staff list error:', error);
    return res.status(500).json({ error: 'Failed to retrieve staff list.' });
  }
};

const createStaff = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required.' });
  }

  const validRoles = ['ADMIN', 'VENDOR', 'KITCHEN'];
  if (!validRoles.includes(role.toUpperCase())) {
    return res.status(400).json({ error: 'Invalid staff role. Must be ADMIN, VENDOR (Cashier), or KITCHEN.' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newStaff = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role.toUpperCase(),
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    return res.status(201).json({ message: 'Staff account created successfully.', staff: newStaff });
  } catch (error) {
    console.error('Create staff error:', error);
    return res.status(500).json({ error: 'Failed to create staff account.' });
  }
};

const updateStaff = async (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;

  try {
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (role && ['ADMIN', 'VENDOR', 'KITCHEN'].includes(role.toUpperCase())) {
      updateData.role = role.toUpperCase();
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    return res.json({ message: 'Staff information updated successfully.', staff: updated });
  } catch (error) {
    console.error('Update staff error:', error);
    return res.status(500).json({ error: 'Failed to update staff account.' });
  }
};

const updateStaffPassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { password: hashedPassword }
    });

    return res.json({ message: 'Staff password reset successfully.' });
  } catch (error) {
    console.error('Reset staff password error:', error);
    return res.status(500).json({ error: 'Failed to reset staff password.' });
  }
};

const toggleStaffStatus = async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (isActive === undefined) {
    return res.status(400).json({ error: 'isActive status flag is required.' });
  }

  const targetId = parseInt(id, 10);
  if (isNaN(targetId)) {
    return res.status(400).json({ error: 'Invalid staff account ID.' });
  }

  // Prevent Admin from accidentally deactivating their own authenticated account
  if (req.user && req.user.id === targetId && isActive === false) {
    return res.status(400).json({ error: 'You cannot deactivate your own active Admin account.' });
  }

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
    if (!targetUser) {
      return res.status(404).json({ error: 'Staff account not found.' });
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { isActive: Boolean(isActive) },
      select: { id: true, name: true, email: true, role: true, isActive: true }
    });

    return res.json({
      message: `Staff account ${updated.isActive ? 'activated' : 'deactivated'} successfully.`,
      staff: updated
    });
  } catch (error) {
    console.error('Toggle staff status error:', error);
    return res.status(500).json({ error: 'Failed to update staff account status.' });
  }
};

// Admin Order Search & History
const getAdminOrders = async (req, res) => {
  const { email, tableId, status, period } = req.query;

  try {
    const where = {};
    if (email) {
      where.OR = [
        { customerEmail: { contains: email.toLowerCase() } },
        { user: { email: { contains: email.toLowerCase() } } }
      ];
    }
    if (tableId) {
      where.tableId = { contains: tableId };
    }
    if (status) {
      where.status = status;
    }

    if (period) {
      const now = new Date();
      let startDate = new Date();
      if (period === 'day') {
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(now.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (period === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
      }
      where.createdAt = { gte: startDate };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        orderItems: { include: { menuItem: true } },
        payment: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return res.json({ orders });
  } catch (error) {
    console.error('Admin order search error:', error);
    return res.status(500).json({ error: 'Failed to search order records.' });
  }
};

module.exports = {
  getDashboardStats,
  getStaffList,
  createStaff,
  updateStaff,
  updateStaffPassword,
  toggleStaffStatus,
  getAdminOrders
};
