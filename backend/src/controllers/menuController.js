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
  const { name, description, price, type, category, stock, prepTime, imageUrl, isActive } = req.body;
  if (!name || price === undefined || !category) {
    return res.status(400).json({ error: 'Name, price, and category are required.' });
  }

  try {
    const item = await prisma.menuItem.create({
      data: {
        name,
        description: description || null,
        price: parseFloat(price),
        type: type || 'food',
        category,
        stock: stock !== undefined ? parseInt(stock, 10) : 0,
        prepTime: prepTime !== undefined ? parseInt(prepTime, 10) : 5,
        imageUrl: imageUrl || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true
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
  const { name, description, price, type, category, stock, prepTime, imageUrl, isActive } = req.body;
  try {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category;
    if (stock !== undefined) updateData.stock = parseInt(stock, 10);
    if (prepTime !== undefined) updateData.prepTime = parseInt(prepTime, 10);
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
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

const fs = require('fs');
const path = require('path');

/**
 * Upload Menu Item Image (Saves file to /uploads and returns web URL)
 */
const uploadImage = async (req, res) => {
  const { imageBase64 } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'No image data provided for upload.' });
  }

  try {
    const matches = imageBase64.match(/^data:(image\/(jpeg|png|webp|jpg));base64,(.+)$/i);
    if (!matches) {
      return res.status(400).json({
        error: 'Invalid image format. Only JPG, JPEG, PNG, and WEBP formats are supported.',
      });
    }

    const mimeType = matches[1].toLowerCase();
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const base64Data = matches[3];
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        error: 'File size exceeds maximum allowed limit of 5MB.',
      });
    }

    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uniqueName = `menu_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(uploadsDir, uniqueName);

    fs.writeFileSync(filePath, buffer);

    const imageUrl = `/uploads/${uniqueName}`;
    return res.json({
      message: 'Image uploaded successfully.',
      imageUrl,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return res.status(500).json({ error: 'Failed to process and store image.' });
  }
};

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  generateMenuQR,
  uploadImage,
};
