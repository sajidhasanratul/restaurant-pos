const { dbQuery, initDatabaseConnection } = require('../db');

async function reseed() {
  console.log('[Reseed] Starting database cleanout and restaurant food reseed...');
  await initDatabaseConnection();

  // 1. Delete all old products and variations
  console.log('[Reseed] Deleting legacy products and variations...');
  await dbQuery('DELETE FROM variations');
  await dbQuery('DELETE FROM products');
  await dbQuery('DELETE FROM categories');

  console.log('[Reseed] Old products, variations, and categories completely removed.');

  // 2. Define Restaurant Food Categories
  const categories = [
    { id: 'cat_starters', name: 'Starters & Appetizers', icon: '🍗' },
    { id: 'cat_burgers', name: 'Burgers & Sandwiches', icon: '🍔' },
    { id: 'cat_pizza', name: 'Pizza & Pasta', icon: '🍕' },
    { id: 'cat_mains', name: 'Main Course & Steaks', icon: '🥩' },
    { id: 'cat_rice', name: 'Rice, Biryani & Platters', icon: '🍚' },
    { id: 'cat_beverages', name: 'Beverages & Drinks', icon: '🍹' },
    { id: 'cat_desserts', name: 'Desserts & Sweets', icon: '🍰' }
  ];

  for (const cat of categories) {
    await dbQuery(
      'INSERT INTO categories (id, name, icon) VALUES (?, ?, ?)',
      [cat.id, cat.name, cat.icon]
    );
  }
  console.log(`[Reseed] Inserted ${categories.length} food categories.`);

  // 3. Define Authentic Food Items
  const foodItems = [
    // ── Starters & Appetizers ──
    {
      id: 'food_wings_bbq',
      name: 'Spicy Honey BBQ Wings (6 pcs)',
      sku: 'APP-001',
      barcode: '8901001',
      categoryId: 'cat_starters',
      category: 'Starters & Appetizers',
      sellingPrice: 320.00,
      costPrice: 150.00,
      tag: 'Crispy fried wings tossed in rich honey BBQ glaze with garlic dip'
    },
    {
      id: 'food_garlic_bread',
      name: 'Cheesy Garlic Bread (4 pcs)',
      sku: 'APP-002',
      barcode: '8901002',
      categoryId: 'cat_starters',
      category: 'Starters & Appetizers',
      sellingPrice: 220.00,
      costPrice: 90.00,
      tag: 'Toasted French baguette loaded with roasted garlic herb butter & mozzarella'
    },
    {
      id: 'food_french_fries',
      name: 'Peri-Peri Loaded French Fries',
      sku: 'APP-003',
      barcode: '8901003',
      categoryId: 'cat_starters',
      category: 'Starters & Appetizers',
      sellingPrice: 190.00,
      costPrice: 75.00,
      tag: 'Golden crispy shoestring fries dusted with spicy peri-peri seasoning and cheese dip'
    },
    {
      id: 'food_nachos',
      name: 'Supreme Cheesy Nachos',
      sku: 'APP-004',
      barcode: '8901004',
      categoryId: 'cat_starters',
      category: 'Starters & Appetizers',
      sellingPrice: 350.00,
      costPrice: 160.00,
      tag: 'Tortilla chips topped with melted cheddar, jalapeños, salsa & sour cream'
    },
    {
      id: 'food_spring_rolls',
      name: 'Crispy Vegetable Spring Rolls (4 pcs)',
      sku: 'APP-005',
      barcode: '8901005',
      categoryId: 'cat_starters',
      category: 'Starters & Appetizers',
      sellingPrice: 200.00,
      costPrice: 80.00,
      tag: 'Golden pastry filled with shredded veggies, served with sweet chili sauce'
    },
    {
      id: 'food_calamari',
      name: 'Crispy Salt & Pepper Calamari',
      sku: 'APP-006',
      barcode: '8901006',
      categoryId: 'cat_starters',
      category: 'Starters & Appetizers',
      sellingPrice: 420.00,
      costPrice: 210.00,
      tag: 'Tender squid rings lightly battered, seasoned with sea salt and tartare sauce'
    },

    // ── Burgers & Sandwiches ──
    {
      id: 'food_classic_beef_burger',
      name: 'Classic Smash Beef Burger',
      sku: 'BUR-001',
      barcode: '8902001',
      categoryId: 'cat_burgers',
      category: 'Burgers & Sandwiches',
      sellingPrice: 380.00,
      costPrice: 180.00,
      tag: '100% prime beef patty, melted cheddar, lettuce, caramelized onions & secret sauce'
    },
    {
      id: 'food_crispy_chicken_burger',
      name: 'Spicy Zinger Chicken Burger',
      sku: 'BUR-002',
      barcode: '8902002',
      categoryId: 'cat_burgers',
      category: 'Burgers & Sandwiches',
      sellingPrice: 340.00,
      costPrice: 155.00,
      tag: 'Extra crispy buttermilk fried chicken breast, spicy mayo, pickles & iceberg lettuce'
    },
    {
      id: 'food_bbq_bacon_burger',
      name: 'BBQ Beef Bacon Double Burger',
      sku: 'BUR-003',
      barcode: '8902003',
      categoryId: 'cat_burgers',
      category: 'Burgers & Sandwiches',
      sellingPrice: 490.00,
      costPrice: 240.00,
      tag: 'Double smashed beef patties, beef bacon strips, smoked cheddar & hickory BBQ sauce'
    },
    {
      id: 'food_grilled_club_sandwich',
      name: 'Grilled Chicken Club Sandwich',
      sku: 'BUR-004',
      barcode: '8902004',
      categoryId: 'cat_burgers',
      category: 'Burgers & Sandwiches',
      sellingPrice: 360.00,
      costPrice: 170.00,
      tag: 'Triple layer toasted bread with herb-grilled chicken, egg, cheese, lettuce & tomato'
    },
    {
      id: 'food_mushroom_melt_burger',
      name: 'Swiss Mushroom Melt Burger',
      sku: 'BUR-005',
      barcode: '8902005',
      categoryId: 'cat_burgers',
      category: 'Burgers & Sandwiches',
      sellingPrice: 420.00,
      costPrice: 200.00,
      tag: 'Beef patty topped with sautéed wild mushrooms, melted Swiss cheese and garlic aioli'
    },

    // ── Pizza & Pasta ──
    {
      id: 'food_margherita_pizza',
      name: 'Classic Margherita Pizza 12"',
      sku: 'PIZ-001',
      barcode: '8903001',
      categoryId: 'cat_pizza',
      category: 'Pizza & Pasta',
      sellingPrice: 650.00,
      costPrice: 280.00,
      tag: 'Hand-stretched dough, Italian San Marzano tomato sauce, fresh mozzarella & basil'
    },
    {
      id: 'food_pepperoni_pizza',
      name: 'Pepperoni Feast Pizza 12"',
      sku: 'PIZ-002',
      barcode: '8903002',
      categoryId: 'cat_pizza',
      category: 'Pizza & Pasta',
      sellingPrice: 780.00,
      costPrice: 340.00,
      tag: 'Generously loaded with beef pepperoni slices, mozzarella and oregano'
    },
    {
      id: 'food_bbq_chicken_pizza',
      name: 'Smoky BBQ Chicken Pizza 12"',
      sku: 'PIZ-003',
      barcode: '8903003',
      categoryId: 'cat_pizza',
      category: 'Pizza & Pasta',
      sellingPrice: 740.00,
      costPrice: 320.00,
      tag: 'Barbecue glazed roasted chicken, red onions, bell peppers and mozzarella'
    },
    {
      id: 'food_fettuccine_alfredo',
      name: 'Creamy Chicken Fettuccine Alfredo',
      sku: 'PAS-001',
      barcode: '8903004',
      categoryId: 'cat_pizza',
      category: 'Pizza & Pasta',
      sellingPrice: 480.00,
      costPrice: 210.00,
      tag: 'Al dente fettuccine pasta in rich parmesan cream sauce with grilled chicken'
    },
    {
      id: 'food_spicy_arrabbiata',
      name: 'Penne Arrabbiata with Garlic Herb',
      sku: 'PAS-002',
      barcode: '8903005',
      categoryId: 'cat_pizza',
      category: 'Pizza & Pasta',
      sellingPrice: 390.00,
      costPrice: 160.00,
      tag: 'Penne tossed in fiery garlic, red chili and crushed tomato marinara sauce'
    },
    {
      id: 'food_beef_lasagna',
      name: 'Baked Beef Lasagna Bolognese',
      sku: 'PAS-003',
      barcode: '8903006',
      categoryId: 'cat_pizza',
      category: 'Pizza & Pasta',
      sellingPrice: 520.00,
      costPrice: 240.00,
      tag: 'Layers of fresh pasta sheets, slow-cooked minced beef ragu, béchamel and cheese'
    },

    // ── Main Course & Steaks ──
    {
      id: 'food_ribeye_steak',
      name: 'Prime Grilled Ribeye Steak (250g)',
      sku: 'STE-001',
      barcode: '8904001',
      categoryId: 'cat_mains',
      category: 'Main Course & Steaks',
      sellingPrice: 1250.00,
      costPrice: 620.00,
      tag: 'Juicy ribeye steak grilled to perfection, served with mashed potato and pepper sauce'
    },
    {
      id: 'food_sizzling_chicken_steak',
      name: 'Sizzling Garlic Butter Chicken Steak',
      sku: 'STE-002',
      barcode: '8904002',
      categoryId: 'cat_mains',
      category: 'Main Course & Steaks',
      sellingPrice: 580.00,
      costPrice: 260.00,
      tag: 'Boneless chicken breast on a hot sizzling skillet with sautéed vegetables'
    },
    {
      id: 'food_butter_chicken_naan',
      name: 'Butter Chicken Masala with Garlic Naan',
      sku: 'MAI-001',
      barcode: '8904003',
      categoryId: 'cat_mains',
      category: 'Main Course & Steaks',
      sellingPrice: 460.00,
      costPrice: 200.00,
      tag: 'Tender chicken tikka pieces simmered in rich creamy tomato butter gravy with 2 naans'
    },
    {
      id: 'food_grilled_salmon',
      name: 'Norwegian Grilled Salmon Fillet',
      sku: 'MAI-002',
      barcode: '8904004',
      categoryId: 'cat_mains',
      category: 'Main Course & Steaks',
      sellingPrice: 1150.00,
      costPrice: 580.00,
      tag: 'Pan-seared Atlantic salmon with lemon butter reduction, asparagus and herb rice'
    },
    {
      id: 'food_beef_stroganoff',
      name: 'Creamy Mushroom Beef Stroganoff',
      sku: 'MAI-003',
      barcode: '8904005',
      categoryId: 'cat_mains',
      category: 'Main Course & Steaks',
      sellingPrice: 620.00,
      costPrice: 280.00,
      tag: 'Tender beef tenderloin strips sautéed with mushrooms in sour cream sauce over rice'
    },

    // ── Rice, Biryani & Platters ──
    {
      id: 'food_kacchi_biryani',
      name: 'Special Mutton Kacchi Biryani',
      sku: 'RIC-001',
      barcode: '8905001',
      categoryId: 'cat_rice',
      category: 'Rice, Biryani & Platters',
      sellingPrice: 520.00,
      costPrice: 260.00,
      tag: 'Traditional spiced dum basmati rice cooked with succulent marinated mutton chunks'
    },
    {
      id: 'food_chicken_biryani',
      name: 'Hyderabadi Chicken Dum Biryani',
      sku: 'RIC-002',
      barcode: '8905002',
      categoryId: 'cat_rice',
      category: 'Rice, Biryani & Platters',
      sellingPrice: 380.00,
      costPrice: 180.00,
      tag: 'Aromatic long-grain basmati cooked in rich saffron, yogurt and spiced tender chicken'
    },
    {
      id: 'food_fried_rice_platter',
      name: 'Mixed Fried Rice with BBQ Chicken Platter',
      sku: 'RIC-003',
      barcode: '8905003',
      categoryId: 'cat_rice',
      category: 'Rice, Biryani & Platters',
      sellingPrice: 420.00,
      costPrice: 190.00,
      tag: 'Egg & vegetable fried rice served with quarter BBQ chicken, salad and spicy dip'
    },
    {
      id: 'food_teriyaki_rice_bowl',
      name: 'Japanese Teriyaki Chicken Rice Bowl',
      sku: 'RIC-004',
      barcode: '8905004',
      categoryId: 'cat_rice',
      category: 'Rice, Biryani & Platters',
      sellingPrice: 390.00,
      costPrice: 175.00,
      tag: 'Steamed fragrant jasmine rice topped with sweet soy glazed chicken and sesame'
    },

    // ── Beverages & Drinks ──
    {
      id: 'food_mint_lemonade',
      name: 'Fresh Mint Lemonade Cooler',
      sku: 'BEV-001',
      barcode: '8906001',
      categoryId: 'cat_beverages',
      category: 'Beverages & Drinks',
      sellingPrice: 140.00,
      costPrice: 40.00,
      tag: 'Refreshing blend of freshly squeezed lemon juice, mint leaves, soda and crushed ice'
    },
    {
      id: 'food_mango_smoothie',
      name: 'Tropical Mango Yogurt Smoothie',
      sku: 'BEV-002',
      barcode: '8906002',
      categoryId: 'cat_beverages',
      category: 'Beverages & Drinks',
      sellingPrice: 220.00,
      costPrice: 75.00,
      tag: 'Sweet Alphonso mango pulp blended with creamy Greek yogurt and honey'
    },
    {
      id: 'food_oreo_shake',
      name: 'Thick Oreo Chocolate Milkshake',
      sku: 'BEV-003',
      barcode: '8906003',
      categoryId: 'cat_beverages',
      category: 'Beverages & Drinks',
      sellingPrice: 250.00,
      costPrice: 90.00,
      tag: 'Decadent shake loaded with crushed Oreo cookies, vanilla ice cream & whipped cream'
    },
    {
      id: 'food_iced_caramel_latte',
      name: 'Iced Caramel Macchiato Latte',
      sku: 'BEV-004',
      barcode: '8906004',
      categoryId: 'cat_beverages',
      category: 'Beverages & Drinks',
      sellingPrice: 240.00,
      costPrice: 85.00,
      tag: 'Fresh espresso shot poured over chilled milk, ice and rich caramel drizzle'
    },
    {
      id: 'food_coca_cola',
      name: 'Chilled Coca-Cola Can (330ml)',
      sku: 'BEV-005',
      barcode: '8906005',
      categoryId: 'cat_beverages',
      category: 'Beverages & Drinks',
      sellingPrice: 60.00,
      costPrice: 35.00,
      tag: 'Ice-cold carbonated refreshment served with lemon slice'
    },
    {
      id: 'food_mineral_water',
      name: 'Premium Mineral Water (500ml)',
      sku: 'BEV-006',
      barcode: '8906006',
      categoryId: 'cat_beverages',
      category: 'Beverages & Drinks',
      sellingPrice: 30.00,
      costPrice: 15.00,
      tag: 'Purified drinking water'
    },

    // ── Desserts & Sweets ──
    {
      id: 'food_lava_cake',
      name: 'Molten Chocolate Lava Cake',
      sku: 'DES-001',
      barcode: '8907001',
      categoryId: 'cat_desserts',
      category: 'Desserts & Sweets',
      sellingPrice: 280.00,
      costPrice: 110.00,
      tag: 'Warm chocolate cake with a molten liquid Belgian fudge center, served with ice cream'
    },
    {
      id: 'food_cheesecake',
      name: 'Classic New York Blueberry Cheesecake',
      sku: 'DES-002',
      barcode: '8907002',
      categoryId: 'cat_desserts',
      category: 'Desserts & Sweets',
      sellingPrice: 320.00,
      costPrice: 135.00,
      tag: 'Velvety cream cheese filling on a buttery graham cracker crust with blueberry compote'
    },
    {
      id: 'food_tiramisu',
      name: 'Italian Espresso Tiramisu',
      sku: 'DES-003',
      barcode: '8907003',
      categoryId: 'cat_desserts',
      category: 'Desserts & Sweets',
      sellingPrice: 340.00,
      costPrice: 140.00,
      tag: 'Ladyfingers dipped in espresso, layered with whipped mascarpone and cocoa powder'
    },
    {
      id: 'food_sizzling_brownie',
      name: 'Sizzling Hot Fudge Brownie with Vanilla Ice Cream',
      sku: 'DES-004',
      barcode: '8907004',
      categoryId: 'cat_desserts',
      category: 'Desserts & Sweets',
      sellingPrice: 310.00,
      costPrice: 125.00,
      tag: 'Warm walnut brownie served sizzling on a cast-iron skillet with cold vanilla scoop'
    }
  ];

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  console.log(`[Reseed] Inserting ${foodItems.length} restaurant dishes...`);
  for (const item of foodItems) {
    await dbQuery(`
      INSERT INTO products (
        id, name, sku, barcode, categoryId, category, 
        sellingPrice, costPrice, stock, alertQty, tag, status, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Publish', ?)
    `, [
      item.id,
      item.name,
      item.sku,
      item.barcode,
      item.categoryId,
      item.category,
      item.sellingPrice,
      item.costPrice,
      999,
      10,
      item.tag,
      now
    ]);
  }

  // 4. Create performance indexes
  console.log('[Reseed] Creating database indexes for extreme speed...');
  try {
    await dbQuery('ALTER TABLE products ADD INDEX idx_products_category (categoryId)');
  } catch (e) {}
  try {
    await dbQuery('ALTER TABLE products ADD INDEX idx_products_status_created (status, createdAt)');
  } catch (e) {}
  try {
    await dbQuery('ALTER TABLE orders ADD INDEX idx_orders_date (date)');
  } catch (e) {}
  try {
    await dbQuery('ALTER TABLE orderitems ADD INDEX idx_orderitems_orderId (orderId)');
  } catch (e) {}
  try {
    await dbQuery('ALTER TABLE orderitems ADD INDEX idx_orderitems_productId (productId)');
  } catch (e) {}

  console.log('[Reseed] Reseed successfully completed! Menu is 100% authentic food items.');
  process.exit(0);
}

reseed().catch(err => {
  console.error('[Reseed] Error:', err);
  process.exit(1);
});
