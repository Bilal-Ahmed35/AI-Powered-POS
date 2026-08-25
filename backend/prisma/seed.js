const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateTableToken } = require('../src/services/qrSecurityService');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Complete POS Database Seed ---');

  // 0. Clean all tables in correct dependency order
  console.log('Cleaning existing data...');
  await prisma.orderStatusHistory.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.emailOTP.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.eTAPrediction.deleteMany();
  await prisma.demandForecast.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.session.deleteMany();
  await prisma.table.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();

  // 1. Create Default Branch
  const branch = await prisma.branch.create({
    data: {
      name: 'SwipeBite Main Campus Canteen',
      address: 'University Campus Plaza, Block A',
      phone: '+92 300 1234567',
      isActive: true,
    },
  });
  console.log(`Created Branch: ${branch.name} (ID: ${branch.id})`);

  // 2. Create 20 Physical Tables with signed cryptographic QR tokens
  console.log('Creating signed physical tables...');
  for (let i = 1; i <= 20; i++) {
    const tableNumber = String(i);
    const qrToken = generateTableToken(tableNumber, branch.id);
    await prisma.table.create({
      data: {
        branchId: branch.id,
        tableNumber: `Table ${tableNumber}`,
        qrToken,
        isActive: true,
      },
    });
  }
  console.log('Created 20 signed tables (Table 1 to Table 20).');

  // 3. Create Default Users (Admin, Cashier/Vendor, Kitchen, Customer)
  const passwordHash = await bcrypt.hash('password123', 10);
  const usersData = [
    { email: 'admin@pos.com', name: 'System Admin', role: 'ADMIN', branchId: branch.id },
    { email: 'vendor@pos.com', name: 'Main Vendor Cashier', role: 'VENDOR', branchId: branch.id },
    { email: 'kitchen@pos.com', name: 'Kitchen Chef', role: 'KITCHEN', branchId: branch.id },
    { email: 'customer@pos.com', name: 'John Doe Customer', role: 'CUSTOMER', branchId: branch.id },
  ];

  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        password: passwordHash,
        role: u.role,
        branchId: u.branchId,
        isActive: true,
      },
    });
    console.log(`Created user: ${user.name} (${user.role})`);
  }

  // 4. Create Categories
  const categoriesData = [
    { name: 'Lunch', slug: 'lunch' },
    { name: 'Breakfast', slug: 'breakfast' },
    { name: 'Fast Food', slug: 'fast-food' },
    { name: 'Refreshment', slug: 'refreshment' },
    { name: 'Beverages', slug: 'beverages' },
    { name: 'Desserts', slug: 'desserts' },
  ];

  for (const cat of categoriesData) {
    await prisma.category.create({ data: cat });
  }

  // 5. Create Menu Items
  const menuItemsData = [
    // Lunch
    { name: 'Chicken Biryani 250g', description: 'Fragrant basmati rice cooked with spiced chicken and herbs.', price: 185, category: 'Lunch', stock: 50, prepTime: 4 },
    { name: 'Chicken Biryani 500g', description: 'Double portion aromatic chicken biryani served with raita.', price: 290, category: 'Lunch', stock: 30, prepTime: 5 },
    { name: 'Beef Biryani 250g', description: 'Traditional spiced beef biryani with tender beef cubes.', price: 210, category: 'Lunch', stock: 50, prepTime: 4 },
    { name: 'Beef Biryani 500g', description: 'Rich spiced double portion beef biryani.', price: 290, category: 'Lunch', stock: 30, prepTime: 5 },
    { name: 'Qorma Achari', description: 'Pickled spices chicken/beef curry served piping hot.', price: 230, category: 'Lunch', stock: 25, prepTime: 6 },
    { name: 'Aloo Qeema', description: 'Minced beef gravy cooked with tender potatoes.', price: 220, category: 'Lunch', stock: 20, prepTime: 6 },
    { name: 'Daal Chawal', description: 'Yellow lentil stew served over fluffy steamed rice.', price: 180, category: 'Lunch', stock: 30, prepTime: 5 },
    { name: 'Daal Fry', description: 'Tadka tempered fried lentils with butter and coriander.', price: 180, category: 'Lunch', stock: 30, prepTime: 6 },
    { name: 'Chapati', description: 'Fresh hot whole wheat flatbread.', price: 20, category: 'Lunch', stock: 200, prepTime: 2 },

    // Breakfast
    { name: 'Paratha Ordinary', description: 'Crispy golden layered flaky paratha.', price: 50, category: 'Breakfast', stock: 100, prepTime: 5 },
    { name: 'Egg Omelette', description: 'Double egg fluffy omelette with onions and green chilies.', price: 60, category: 'Breakfast', stock: 100, prepTime: 5 },
    { name: 'Paratha Aloo', description: 'Stuffed spicy mashed potato paratha.', price: 130, category: 'Breakfast', stock: 50, prepTime: 8 },
    { name: 'Paratha Cheese', description: 'Melted cheddar & mozzarella stuffed paratha.', price: 200, category: 'Breakfast', stock: 40, prepTime: 8 },
    { name: 'Paratha Chicken', description: 'Minced spiced chicken stuffed crispy paratha.', price: 220, category: 'Breakfast', stock: 40, prepTime: 10 },
    { name: 'Paratha Chicken Cheese', description: 'Chicken and melted cheese supreme paratha.', price: 220, category: 'Breakfast', stock: 35, prepTime: 12 },
    { name: 'Paratha Qeema', description: 'Spicy minced beef filled golden paratha.', price: 220, category: 'Breakfast', stock: 40, prepTime: 10 },

    // Fast Food
    { name: 'Chicken Chatni Roll', description: 'Charcoal grilled chicken boti with spicy mint yogurt sauce.', price: 190, category: 'Fast Food', stock: 50, prepTime: 10 },
    { name: 'Chicken Mayo Roll', description: 'Creamy garlic mayo chicken wrapped in golden paratha.', price: 200, category: 'Fast Food', stock: 50, prepTime: 10 },
    { name: 'Chicken Cheese Roll', description: 'Crispy fried chicken strips with melted cheese.', price: 250, category: 'Fast Food', stock: 40, prepTime: 14 },
    { name: 'Zinger Burger', description: 'Crispy deep-fried spicy chicken fillet with lettuce & mayo.', price: 290, category: 'Fast Food', stock: 40, prepTime: 16 },
    { name: 'Zinger Burger Cheese', description: 'Double crispy chicken zinger with cheddar cheese slice.', price: 345, category: 'Fast Food', stock: 30, prepTime: 18 },
    { name: 'Bun Shami Kabab', description: 'Classic street style lentils & beef shami with egg omelette.', price: 120, category: 'Fast Food', stock: 50, prepTime: 4 },
    { name: 'Chicken Shawarma', description: 'Shaved seasoned chicken pita with garlic tahini.', price: 270, category: 'Fast Food', stock: 50, prepTime: 8 },

    // Refreshments
    { name: 'Aloo Samosa', description: 'Crispy potato samosa with cumin and coriander.', price: 40, category: 'Refreshment', stock: 100, prepTime: 2 },
    { name: 'Spring Roll', description: 'Crispy vegetable spring rolls with sweet chili dip.', price: 40, category: 'Refreshment', stock: 100, prepTime: 3 },
    { name: 'Tea (Karak Chai)', description: 'Traditional aromatic spiced strong milk tea.', price: 70, category: 'Refreshment', stock: 100, prepTime: 5 },
    { name: 'Fries Plain', description: 'Salted crispy potato french fries.', price: 170, category: 'Refreshment', stock: 80, prepTime: 8 },
    { name: 'Fries Masala', description: 'Crispy fries tossed in hot chat masala.', price: 170, category: 'Refreshment', stock: 80, prepTime: 9 },
    { name: 'Fries Mayo Garlic', description: 'Loaded fries drizzled with house garlic mayo.', price: 170, category: 'Refreshment', stock: 80, prepTime: 10 },
    { name: 'Fries BBQ', description: 'Smoky BBQ glazed loaded french fries.', price: 170, category: 'Refreshment', stock: 80, prepTime: 10 },
    { name: 'Fries Pizza', description: 'Fries baked with pizza sauce, melted cheese & olives.', price: 500, category: 'Refreshment', stock: 50, prepTime: 14 },
    { name: 'Fries Chicken Steak', description: 'Fries topped with grilled chicken steak strips & mushroom sauce.', price: 400, category: 'Refreshment', stock: 50, prepTime: 16 },
  ];

  for (const itemData of menuItemsData) {
    const menuItem = await prisma.menuItem.create({
      data: {
        branchId: branch.id,
        name: itemData.name,
        description: itemData.description,
        price: itemData.price,
        type: 'food',
        category: itemData.category,
        stock: itemData.stock,
        prepTime: itemData.prepTime,
        isActive: true,
      },
    });

    // Create corresponding inventory item
    const unit = menuItem.category === 'Beverages' || menuItem.name.toLowerCase().includes('tea') ? 'cups' : 'portions';
    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        branchId: branch.id,
        name: menuItem.name,
        stockLevel: menuItem.stock,
        unit: unit,
        minThreshold: Math.max(5, Math.round(menuItem.stock * 0.2)),
      },
    });

    await prisma.inventoryLog.create({
      data: {
        inventoryItemId: inventoryItem.id,
        quantityBefore: 0,
        quantityAfter: menuItem.stock,
        changeQty: menuItem.stock,
        type: 'RESTOCK',
        reason: 'Initial seed inventory provisioning',
      },
    });
  }

  console.log('✅ Seeding completed successfully with Branch, Signed Tables, Users, Menu & Inventory.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
