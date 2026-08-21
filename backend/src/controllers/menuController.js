const { prisma } = require('../config/db');
const { generateQR } = require('../utils/generateQRCode');
const { broadcastEvent } = require('../sockets/socket');

const getAllItems = async (req, res) => {
  const { all } = req.query;
  try {
    const whereClause = {};
    if (all !== 'true') {
      whereClause.isActive = true;
    }
    const items = await prisma.menuItem.findMany({
      where: whereClause
    });
    return res.json({ items });
  } catch (error) {
    console.error('Fetch menu items error:', error);
    return res.status(500).json({ error: 'Failed to retrieve menu items.' });
  }
};

const getItemById = async (req, res) => {
  const { id } = req.params;
  try {
    const item = await prisma.menuItem.findUnique({
      where: { id: parseInt(id) }
    });
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }
    return res.json({ item });
  } catch (error) {
    console.error('Fetch menu item error:', error);
    return res.status(500).json({ error: 'Failed to retrieve menu item.' });
  }
};
const createItem = async (req, res) => {
  const { name, description, price, type, category, stock } = req.body;
  if (!name || price === undefined || !category) {
    return res.status(400).json({ error: 'Name, price, and category are required.' });
  }

  try {
    const item = await prisma.menuItem.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        type: type || 'food',
        category,
        stock: stock ? parseInt(stock) : 0
      }
    });
    broadcastEvent('menu:update', item);
    return res.status(201).json({ message: 'Menu item created successfully.', item });
  } catch (error) {
    console.error('Create menu item error:', error);
    return res.status(500).json({ error: 'Failed to create menu item.' });
  }
};

const updateItem = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, type, category, stock, isActive } = req.body;
  try {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category;
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (isActive !== undefined) updateData.isActive = isActive;

    const item = await prisma.menuItem.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    broadcastEvent('menu:update', item);
    return res.json({ message: 'Menu item updated successfully.', item });
  } catch (error) {
    console.error('Update menu item error:', error);
    return res.status(500).json({ error: 'Failed to update menu item.' });
  }
};

const deleteItem = async (req, res) => {
  const { id } = req.params;
  try {
    // Attempt hard delete first
    const item = await prisma.menuItem.delete({
      where: { id: parseInt(id) }
    });
    broadcastEvent('menu:update', item);
    return res.json({ message: 'Menu item deleted successfully from database.', item });
  } catch (error) {
    console.warn(`Constraint failure on hard delete: ${error.message}. Performing soft delete.`);
    try {
      const item = await prisma.menuItem.update({
        where: { id: parseInt(id) },
        data: { isActive: false }
      });
      broadcastEvent('menu:update', item);
      return res.json({ message: 'Menu item deactivated (soft deleted) successfully due to order history references.', item });
    } catch (softError) {
      console.error('Delete menu item error:', softError);
      return res.status(500).json({ error: 'Failed to delete menu item.' });
    }
  }
};

const generateMenuQR = async (req, res) => {
  const { id } = req.params;
  const { tableId } = req.query; // optional table ID parameter
  try {
    const item = await prisma.menuItem.findUnique({
      where: { id: parseInt(id) }
    });
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }

    const payload = JSON.stringify({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      tableId: tableId || 'table_1'
    });

    const qrDataUrl = await generateQR(payload);
    return res.json({ qrCode: qrDataUrl });
  } catch (error) {
    console.error('QR code generation error:', error);
    return res.status(500).json({ error: 'Failed to generate QR code.' });
  }
};

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  generateMenuQR
};
