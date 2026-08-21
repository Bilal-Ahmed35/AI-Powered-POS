const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 0. Clean existing tables (prevent constraints violations and state pollution)
  console.log('Cleaning existing data...');
  await prisma.payment.deleteMany();
  await prisma.eTAPrediction.deleteMany();
  await prisma.demandForecast.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Default Users for all 4 Roles
  const passwordHash = await bcrypt.hash('password123', 10);

  const usersData = [
    { email: 'admin@pos.com', name: 'System Admin', role: 'ADMIN' },
    { email: 'vendor@pos.com', name: 'Main Vendor Cashier', role: 'VENDOR' },
    { email: 'kitchen@pos.com', name: 'Kitchen Chef', role: 'KITCHEN' },
    { email: 'customer@pos.com', name: 'John Doe Customer', role: 'CUSTOMER' }
  ];

  for (const userData of usersData) {
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        password: passwordHash,
        role: userData.role
      }
    });
    console.log(`Created user: ${user.name} (${user.role})`);
  }

  // 2. Create Sample Menu Items (custom menu items from user request)
  const menuItemsData = [
    // Lunch
    { name: 'Chicken Biryani 250g', description: 'Chicken biryani / pulao', price: 185, category: 'Lunch', stock: 50, prepTime: 4 },
    { name: 'Chicken Biryani 500g', description: 'Chicken biryani / pulao', price: 290, category: 'Lunch', stock: 30, prepTime: 5 },
    { name: 'Beef Biryani 250g', description: 'Beef biryani / pulao', price: 210, category: 'Lunch', stock: 50, prepTime: 4 },
    { name: 'Beef Biryani 500g', description: 'Beef biryani / pulao', price: 290, category: 'Lunch', stock: 30, prepTime: 5 },
    { name: 'Qorma Achari', description: 'Chicken/Beef qorma achari', price: 230, category: 'Lunch', stock: 25, prepTime: 6 },
    { name: 'Aloo Qeema', description: 'Aloo qeema', price: 220, category: 'Lunch', stock: 20, prepTime: 6 },
    { name: 'Daal Chawal', description: 'Daal with rice', price: 180, category: 'Lunch', stock: 30, prepTime: 5 },
    { name: 'Daal Fry', description: 'Daal fry / mixed vegetable', price: 180, category: 'Lunch', stock: 30, prepTime: 6 },
    { name: 'Chapati', description: 'Single chapati', price: 20, category: 'Lunch', stock: 200, prepTime: 2 },

    // Breakfast
    { name: 'Paratha Ordinary', description: 'Simple paratha', price: 50, category: 'Breakfast', stock: 100, prepTime: 5 },
    { name: 'Egg Omelette', description: 'Egg omelette / half fry', price: 60, category: 'Breakfast', stock: 100, prepTime: 5 },
    { name: 'Paratha Aloo', description: 'Aloo stuffed paratha', price: 130, category: 'Breakfast', stock: 50, prepTime: 8 },
    { name: 'Paratha Cheese', description: 'Cheese paratha', price: 200, category: 'Breakfast', stock: 40, prepTime: 8 },
    { name: 'Paratha Chicken', description: 'Chicken paratha', price: 220, category: 'Breakfast', stock: 40, prepTime: 10 },
    { name: 'Paratha Chicken Cheese', description: 'Chicken cheese paratha', price: 220, category: 'Breakfast', stock: 35, prepTime: 12 },
    { name: 'Paratha Qeema', description: 'Qeema paratha', price: 220, category: 'Breakfast', stock: 40, prepTime: 10 },

    // Fast Food
    { name: 'Chicken Chatni Roll', description: 'Chicken chatni / boti roll', price: 190, category: 'Fast Food', stock: 50, prepTime: 10 },
    { name: 'Chicken Mayo Roll', description: 'Chicken malai / mayo roll', price: 200, category: 'Fast Food', stock: 50, prepTime: 10 },
    { name: 'Chicken Cheese Roll', description: 'Chicken cheese / crispy roll', price: 250, category: 'Fast Food', stock: 40, prepTime: 14 },
    { name: 'Zinger Burger', description: 'Chicken twister / zinger burger', price: 290, category: 'Fast Food', stock: 40, prepTime: 16 },
    { name: 'Zinger Burger Cheese', description: 'Zinger burger with cheese', price: 345, category: 'Fast Food', stock: 30, prepTime: 18 },
    { name: 'Bun Shami Kabab', description: 'Bun shami kabab', price: 120, category: 'Fast Food', stock: 50, prepTime: 4 },
    { name: 'Chicken Shawarma', description: 'Chicken shawarma', price: 270, category: 'Fast Food', stock: 50, prepTime: 8 },

    // Refreshments
    { name: 'Aloo Samosa', description: 'Aloo samosa', price: 40, category: 'Refreshment', stock: 100, prepTime: 2 },
    { name: 'Spring Roll', description: 'Spring roll', price: 40, category: 'Refreshment', stock: 100, prepTime: 3 },
    { name: 'Tea', description: 'Tea', price: 70, category: 'Refreshment', stock: 100, prepTime: 5 },
    { name: 'Fries Plain', description: 'Plain fries', price: 170, category: 'Refreshment', stock: 80, prepTime: 8 },
    { name: 'Fries Masala', description: 'Masala fries', price: 170, category: 'Refreshment', stock: 80, prepTime: 9 },
    { name: 'Fries Mayo Garlic', description: 'Fries with mayo garlic', price: 170, category: 'Refreshment', stock: 80, prepTime: 10 },
    { name: 'Fries BBQ', description: 'BBQ fries', price: 170, category: 'Refreshment', stock: 80, prepTime: 10 },
    { name: 'Fries BBQ Cheese', description: 'BBQ cheese fries', price: 180, category: 'Refreshment', stock: 70, prepTime: 12 },
    { name: 'Fries Pizza', description: 'Pizza fries', price: 500, category: 'Refreshment', stock: 50, prepTime: 14 },
    { name: 'Fries Chicken Steak', description: 'Chicken steak fries', price: 400, category: 'Refreshment', stock: 50, prepTime: 16 },
    { name: 'Fries Mexican', description: 'Mexican fries', price: 400, category: 'Refreshment', stock: 50, prepTime: 14 },
    { name: 'Fries Veggie', description: 'Veggie fries', price: 280, category: 'Refreshment', stock: 60, prepTime: 12 },
    { name: 'Fries Smoky', description: 'Smoky fries', price: 300, category: 'Refreshment', stock: 60, prepTime: 12 }
  ];

  for (const menuItem of menuItemsData) {
    const item = await prisma.menuItem.create({
      data: menuItem
    });
    console.log(`Created menu item: ${item.name}`);

    // 3. Create Corresponding Inventory Item
    const unit = menuItem.category === 'Beverages' || menuItem.name.toLowerCase().includes('tea') ? 'cups' : 'units';
    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        name: menuItem.name,
        stockLevel: menuItem.stock,
        unit: unit,
        minThreshold: Math.max(5, Math.round(menuItem.stock * 0.2)) // 20% threshold
      }
    });

    // Create Initial Log
    await prisma.inventoryLog.create({
      data: {
        inventoryItemId: inventoryItem.id,
        changeQty: menuItem.stock,
        type: 'RESTOCK',
        reason: 'Initial database seed restock'
      }
    });
    console.log(`Created inventory item & log for: ${inventoryItem.name}`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
