const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const config = require('./config');

const app = express();
const PORT = config.port;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Prevent index.html from caching so frontend additions are fetched immediately
app.get(['/', '/index.html'], (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve static frontend assets
app.use(express.static(path.join(__dirname)));

// ── MySQL Connection Pool ─────────────────────────
let pool;

const getPool = () => {
  if (!pool) {
    pool = mysql.createPool(config.db);
  }
  return pool;
};

// Helper query executor
const dbQuery = async (sql, params = []) => {
  const connectionPool = getPool();
  const [rows] = await connectionPool.execute(sql, params);
  return rows;
};

// ── Database Setup & Seeding ──────────────────────
const initDB = async () => {
  console.log('Connecting to MySQL and ensuring database exists...');
  
  // Connect without database selected first, to ensure database exists
  try {
    const tempConn = await mysql.createConnection({
      host: config.db.host,
      user: config.db.user,
      password: config.db.password,
      port: config.db.port
    });
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\``);
    await tempConn.end();
  } catch (err) {
    console.warn(`Warning: Could not auto-create database (${err.message}). Proceeding assuming it exists.`);
  }

  console.log(`Database "${config.db.database}" ready. Creating tables...`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    categoryId VARCHAR(50),
    costPrice DECIMAL(10,2) DEFAULT 0.00,
    sellingPrice DECIMAL(10,2) DEFAULT 0.00,
    stock INT DEFAULT 0,
    alertQty INT DEFAULT 5,
    image LONGTEXT
  )`);

  // Auto-migration check: If database already exists but lacks columns or indexes, add them.
  try {
    const columns = await dbQuery(`SHOW COLUMNS FROM products LIKE 'image'`);
    if (columns.length === 0) {
      await dbQuery(`ALTER TABLE products ADD COLUMN image LONGTEXT`);
      console.log('Database Migration: Added "image" column to products table.');
    }
    const tagColumns = await dbQuery(`SHOW COLUMNS FROM products LIKE 'tag'`);
    if (tagColumns.length === 0) {
      await dbQuery(`ALTER TABLE products ADD COLUMN tag VARCHAR(255) DEFAULT NULL`);
      console.log('Database Migration: Added "tag" column to products table.');
    }
    const createdCols = await dbQuery(`SHOW COLUMNS FROM products LIKE 'createdAt'`);
    if (createdCols.length === 0) {
      await dbQuery(`ALTER TABLE products ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP`);
      console.log('Database Migration: Added "createdAt" column to products table.');
    }
    const genericCols = await dbQuery(`SHOW COLUMNS FROM products LIKE 'generic'`);
    if (genericCols.length === 0) {
      await dbQuery(`ALTER TABLE products ADD COLUMN generic VARCHAR(255) DEFAULT NULL`);
      console.log('Database Migration: Added "generic" column to products table.');
    }
    const brandCols = await dbQuery(`SHOW COLUMNS FROM products LIKE 'brand'`);
    if (brandCols.length === 0) {
      await dbQuery(`ALTER TABLE products ADD COLUMN brand VARCHAR(255) DEFAULT NULL`);
    }
    const strengthCols = await dbQuery(`SHOW COLUMNS FROM products LIKE 'strength'`);
    if (strengthCols.length === 0) {
      await dbQuery(`ALTER TABLE products ADD COLUMN strength VARCHAR(100) DEFAULT NULL`);
    }
    const catCols = await dbQuery(`SHOW COLUMNS FROM products LIKE 'category'`);
    if (catCols.length === 0) {
      await dbQuery(`ALTER TABLE products ADD COLUMN category VARCHAR(100) DEFAULT NULL`);
    }

    // Auto-migration check: Indexes on products & variations for high-speed searching
    const pIndexes = await dbQuery(`SHOW INDEX FROM products`);
    const pIndexNames = new Set((pIndexes || []).map(i => i.Key_name));
    const ensureIndex = async (table, indexName, colDef) => {
      try {
        await dbQuery(`CREATE INDEX ${indexName} ON ${table}(${colDef})`);
      } catch (e) {
        // ignore if already exists
      }
    };
    if (!pIndexNames.has('idx_products_name')) await ensureIndex('products', 'idx_products_name', 'name(191)');
    if (!pIndexNames.has('idx_products_generic')) await ensureIndex('products', 'idx_products_generic', 'generic(191)');
    if (!pIndexNames.has('idx_products_barcode')) await ensureIndex('products', 'idx_products_barcode', 'barcode');
    if (!pIndexNames.has('idx_products_status')) await ensureIndex('products', 'idx_products_status', 'status');
    if (!pIndexNames.has('idx_products_deletedAt')) await ensureIndex('products', 'idx_products_deletedAt', 'deletedAt');
    if (!pIndexNames.has('idx_products_priority')) await ensureIndex('products', 'idx_products_priority', 'priority');

    const vIndexes = await dbQuery(`SHOW INDEX FROM variations`);
    const vIndexNames = new Set((vIndexes || []).map(i => i.Key_name));
    if (!vIndexNames.has('idx_variations_productId')) await ensureIndex('variations', 'idx_variations_productId', 'productId');
    if (!vIndexNames.has('idx_variations_sku')) await ensureIndex('variations', 'idx_variations_sku', 'sku');
    if (!vIndexNames.has('idx_variations_barcode')) await ensureIndex('variations', 'idx_variations_barcode', 'barcode');
  } catch (migErr) {
    console.warn('Warning during database column/index migration check:', migErr.message);
  }

  await dbQuery(`CREATE TABLE IF NOT EXISTS variations (
    id VARCHAR(50) PRIMARY KEY,
    productId VARCHAR(50),
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    price DECIMAL(10,2) DEFAULT 0.00,
    costPrice DECIMAL(10,2) DEFAULT 0.00,
    stock INT DEFAULT 0
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(100),
    label VARCHAR(50),
    customDiscount DECIMAL(5,2) DEFAULT 0.00,
    address TEXT
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    invoiceId VARCHAR(50) UNIQUE NOT NULL,
    customerId VARCHAR(50),
    customerName VARCHAR(255),
    customerPhone VARCHAR(50),
    date DATETIME NOT NULL,
    subtotal DECIMAL(12,2) DEFAULT 0.00,
    discountType VARCHAR(50),
    discountValue DECIMAL(10,2) DEFAULT 0.00,
    discountAmount DECIMAL(10,2) DEFAULT 0.00,
    taxPercent DECIMAL(5,2) DEFAULT 0.00,
    taxAmount DECIMAL(10,2) DEFAULT 0.00,
    grandTotal DECIMAL(12,2) DEFAULT 0.00,
    paidAmount DECIMAL(12,2) DEFAULT 0.00,
    dueAmount DECIMAL(12,2) DEFAULT 0.00,
    returnedAmount DECIMAL(12,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'completed'
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS orderItems (
    id VARCHAR(50) PRIMARY KEY,
    orderId VARCHAR(50),
    productId VARCHAR(50),
    productName VARCHAR(255),
    variationName VARCHAR(100),
    qty INT NOT NULL,
    unitPrice DECIMAL(10,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    costPrice DECIMAL(10,2) DEFAULT 0.00
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS returns (
    id VARCHAR(50) PRIMARY KEY,
    returnId VARCHAR(50) UNIQUE NOT NULL,
    orderId VARCHAR(50),
    invoiceId VARCHAR(50),
    customerName VARCHAR(255),
    customerPhone VARCHAR(50),
    date DATETIME NOT NULL,
    returnTotal DECIMAL(12,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'completed'
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS returnItems (
    id VARCHAR(50) PRIMARY KEY,
    returnId VARCHAR(50),
    orderId VARCHAR(50),
    productId VARCHAR(50),
    productName VARCHAR(255),
    variationName VARCHAR(100),
    qty INT NOT NULL,
    unitPrice DECIMAL(10,2) NOT NULL,
    returnAmount DECIMAL(12,2) NOT NULL
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    orderId VARCHAR(50),
    method VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    lastFour VARCHAR(10) DEFAULT NULL
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS counters (
    key_name VARCHAR(50) PRIMARY KEY,
    val INT DEFAULT 0
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    email VARCHAR(255)
  )`);

  try {
    const columnsPR = await dbQuery(`SHOW COLUMNS FROM password_resets LIKE 'expires_at'`);
    if (columnsPR.length > 0 && columnsPR[0].Type.toLowerCase().includes('datetime')) {
      await dbQuery(`DROP TABLE password_resets`);
      console.log('Database Migration: Dropped old password_resets table to update column types to BIGINT.');
    }
  } catch (err) {
    // Ignore
  }

  await dbQuery(`CREATE TABLE IF NOT EXISTS password_resets (
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) PRIMARY KEY,
    expires_at BIGINT NOT NULL
  )`);

  // Auto-migration check: If users lacks email column, add it.
  try {
    const columns = await dbQuery(`SHOW COLUMNS FROM users LIKE 'email'`);
    if (columns.length === 0) {
      await dbQuery(`ALTER TABLE users ADD COLUMN email VARCHAR(255)`);
      console.log('Database Migration: Added "email" column to users table.');
      // Backfill default emails for seeded users
      await dbQuery(`UPDATE users SET email = 'admin@example.com' WHERE username = 'admin'`);
      await dbQuery(`UPDATE users SET email = 'manager@example.com' WHERE username = 'manager'`);
      await dbQuery(`UPDATE users SET email = 'cashier@example.com' WHERE username = 'cashier'`);
    }
  } catch (migErr) {
    console.warn('Warning during database column migration check:', migErr.message);
  }

  // Auto-migration check: If orderItems lacks costPrice column, add it.
  try {
    const columnsOI = await dbQuery(`SHOW COLUMNS FROM orderItems LIKE 'costPrice'`);
    if (columnsOI.length === 0) {
      await dbQuery(`ALTER TABLE orderItems ADD COLUMN costPrice DECIMAL(10,2) DEFAULT 0.00`);
      console.log('Database Migration: Added "costPrice" column to orderItems table.');
    }
  } catch (migErr) {
    console.warn('Warning during orderItems costPrice migration check:', migErr.message);
  }

  // Seeding Counters
  const counters = await dbQuery(`SELECT * FROM counters`);
  if (counters.length === 0) {
    await dbQuery(`INSERT INTO counters (key_name, val) VALUES ('invoice', 0)`);
    await dbQuery(`INSERT INTO counters (key_name, val) VALUES ('return', 0)`);
  }

  // Seeding Users
  const users = await dbQuery(`SELECT * FROM users`);
  if (users.length === 0) {
    console.log('Seeding default users...');
    await dbQuery(`INSERT INTO users (id, username, password, name, role, email) VALUES 
      ('u-admin', 'admin', 'admin', 'System Admin', 'admin', 'admin@example.com'),
      ('u-mgr', 'manager', 'manager', 'Store Manager', 'manager', 'manager@example.com'),
      ('u-cash', 'cashier', 'cashier', 'Senior Cashier', 'cashier', 'cashier@example.com')`);
  }

  await dbQuery(`CREATE TABLE IF NOT EXISTS settings (
    key_name VARCHAR(100) PRIMARY KEY,
    val TEXT
  )`);

  // Create Coupons and Expenses tables
  await dbQuery(`CREATE TABLE IF NOT EXISTS coupons (
    code VARCHAR(50) PRIMARY KEY,
    discountType VARCHAR(50) NOT NULL,
    discountValue DECIMAL(10,2) NOT NULL
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(50) PRIMARY KEY,
    supplier_name VARCHAR(255) DEFAULT '',
    reason VARCHAR(255) DEFAULT '',
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    date DATETIME NOT NULL,
    payment_date DATE NULL DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'Paid',
    image LONGTEXT,
    note TEXT
  )`);

  // Auto-migration check: If expenses lacks columns, add them.
  try {
    const columns = await dbQuery(`SHOW COLUMNS FROM expenses`);
    const colNames = columns.map(c => c.Field);
    if (!colNames.includes('category')) {
      await dbQuery(`ALTER TABLE expenses ADD COLUMN category VARCHAR(100), ADD COLUMN status VARCHAR(50) DEFAULT 'Paid', ADD COLUMN image LONGTEXT`);
      console.log('Database Migration: Added category, status and image columns to expenses table.');
    }
    if (!colNames.includes('supplier_name')) {
      await dbQuery(`ALTER TABLE expenses ADD COLUMN supplier_name VARCHAR(255) DEFAULT ''`);
      console.log('Database Migration: Added supplier_name to expenses table.');
    }
    if (!colNames.includes('reason')) {
      await dbQuery(`ALTER TABLE expenses ADD COLUMN reason VARCHAR(255) DEFAULT ''`);
      console.log('Database Migration: Added reason to expenses table.');
    }
    if (!colNames.includes('paid_amount')) {
      await dbQuery(`ALTER TABLE expenses ADD COLUMN paid_amount DECIMAL(10,2) DEFAULT 0.00`);
      await dbQuery(`UPDATE expenses SET paid_amount = amount WHERE status = 'Paid'`);
      console.log('Database Migration: Added paid_amount to expenses table.');
    }
    if (!colNames.includes('payment_date')) {
      await dbQuery(`ALTER TABLE expenses ADD COLUMN payment_date DATE NULL DEFAULT NULL`);
      console.log('Database Migration: Added payment_date to expenses table.');
    }
  } catch (migErr) {
    console.warn('Warning during database column migration check:', migErr.message);
  }

  // Create supplier_payments table
  await dbQuery(`CREATE TABLE IF NOT EXISTS supplier_payments (
    id VARCHAR(50) PRIMARY KEY,
    supplier_name VARCHAR(255) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Paid',
    date DATETIME NOT NULL,
    payment_date DATE NULL DEFAULT NULL,
    image LONGTEXT,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed default coupons if empty
  const couponsCount = await dbQuery(`SELECT COUNT(*) as count FROM coupons`);
  if (couponsCount[0].count === 0) {
    await dbQuery(`INSERT INTO coupons (code, discountType, discountValue) VALUES 
      ('WELCOME10', 'percentage', 10.00),
      ('SAVE50', 'amount', 50.00)`);
  }

  // Create expense_categories table
  await dbQuery(`CREATE TABLE IF NOT EXISTS expense_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
  )`);

  // Seed default expense categories if empty
  const expCatsCount = await dbQuery(`SELECT COUNT(*) as count FROM expense_categories`);
  if (expCatsCount[0].count === 0) {
    const defaultExpCats = [
      ['exp_cat_1', 'Utilities'],
      ['exp_cat_2', 'Rent'],
      ['exp_cat_3', 'Salaries'],
      ['exp_cat_4', 'Inventory'],
      ['exp_cat_5', 'Marketing'],
      ['exp_cat_6', 'Maintenance'],
      ['exp_cat_7', 'Other']
    ];
    for (const cat of defaultExpCats) {
      await dbQuery(`INSERT INTO expense_categories (id, name) VALUES (?, ?)`, cat);
    }
  }

  const settingsCount = await dbQuery(`SELECT COUNT(*) as count FROM settings`);
  if (settingsCount[0].count === 0) {
    await dbQuery(`INSERT INTO settings (key_name, val) VALUES 
      ('store_name', 'ZenPos Store'),
      ('invoice_show_store_name', '1'),
      ('store_address', '123 Market Street, Dhaka'),
      ('store_phone', '01700000000'),
      ('store_website', 'www.zenpos.com'),
      ('invoice_note', 'Goods once sold cannot be returned or exchanged.'),
      ('invoice_logo', ''),
      ('receipt_width', '80'),
      ('invoice_width', '800'),
      ('invoice_style', 'theme-modern'),
      ('default_print_type', 'receipt'),
      ('receipt_style', 'style-1'),
      ('label_template', 'standard'),
      ('label_preset', '50x30'),
      ('label_width', '50'),
      ('label_height', '30'),
      ('label_show_store', '1'),
      ('label_show_name', '1'),
      ('label_show_barcode', '1'),
      ('label_show_human_readable', '1'),
      ('label_show_qr', '0'),
      ('label_show_sku', '1'),
      ('label_show_price', '1'),
      ('label_show_attribs', '0')`);
  } else {
    const defaultLabelKeys = {
      'invoice_show_store_name': '1',
      'store_website': 'www.zenpos.com',
      'invoice_note': 'Goods once sold cannot be returned or exchanged.',
      'invoice_logo': '',
      'receipt_width': '80',
      'invoice_width': '800',
      'invoice_style': 'theme-modern',
      'default_print_type': 'receipt',
      'receipt_style': 'style-1',
      'label_template': 'standard',
      'label_preset': '50x30',
      'label_width': '50',
      'label_height': '30',
      'label_show_store': '1',
      'label_show_name': '1',
      'label_show_barcode': '1',
      'label_show_human_readable': '1',
      'label_show_qr': '0',
      'label_show_sku': '1',
      'label_show_price': '1',
      'label_show_attribs': '0'
    };
    for (const [key, val] of Object.entries(defaultLabelKeys)) {
      await dbQuery(`INSERT IGNORE INTO settings (key_name, val) VALUES (?, ?)`, [key, val]);
    }
    await dbQuery(`INSERT IGNORE INTO settings (key_name, val) VALUES ('supplier_as_expense', '0')`);
  }

  // Seeding Catalog if empty
  // Auto-migration check: status, deletedAt, priority columns
  try {
    const statusCol = await dbQuery(`SHOW COLUMNS FROM products LIKE 'status'`);
    if (statusCol.length === 0) {
      await dbQuery(`ALTER TABLE products ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Publish'`);
      console.log('Database Migration: Added "status" column to products.');
    }
    const deletedCol = await dbQuery(`SHOW COLUMNS FROM products LIKE 'deletedAt'`);
    if (deletedCol.length === 0) {
      await dbQuery(`ALTER TABLE products ADD COLUMN deletedAt DATETIME NULL DEFAULT NULL`);
      console.log('Database Migration: Added "deletedAt" column to products.');
    } else {
      // Force modify the column to ensure DEFAULT NULL is set if it already exists with wrong default
      await dbQuery(`ALTER TABLE products MODIFY COLUMN deletedAt DATETIME NULL DEFAULT NULL`);
    }
    const priorityCol = await dbQuery(`SHOW COLUMNS FROM products LIKE 'priority'`);
    if (priorityCol.length === 0) {
      await dbQuery(`ALTER TABLE products ADD COLUMN priority INT NOT NULL DEFAULT 0`);
      console.log('Database Migration: Added "priority" column to products.');
    }
    const paymentCols = await dbQuery(`SHOW COLUMNS FROM payments LIKE 'lastFour'`);
    if (paymentCols.length === 0) {
      await dbQuery(`ALTER TABLE payments ADD COLUMN lastFour VARCHAR(10) DEFAULT NULL`);
      console.log('Database Migration: Added "lastFour" column to payments table.');
    }
  } catch (migErr) {
    console.warn('Migration error for status/deletedAt/priority/lastFour:', migErr.message);
  }

  // Auto-cleanup: Permanently delete trashed products older than 30 days
  try {
    await dbQuery(`DELETE FROM products WHERE deletedAt IS NOT NULL AND deletedAt < DATE_SUB(NOW(), INTERVAL 30 DAY)`);
  } catch (cleanupErr) {
    console.warn('Warning during database trash auto-cleanup:', cleanupErr.message);
  }

  // Data recovery fix: Reset deletedAt to NULL to restore active products
  try {
    await dbQuery(`UPDATE products SET deletedAt = NULL`);
    console.log('Database Data Fix: Restored all products from default timestamp issue.');
  } catch (err) {
    console.warn('Could not reset deletedAt values:', err.message);
  }

  const prods = await dbQuery(`SELECT count(*) as count FROM products`);
  if (prods[0].count === 0) {
    await seedCatalog();
  }

  // Create payment_methods table if not exists
  await dbQuery(`CREATE TABLE IF NOT EXISTS payment_methods (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon LONGTEXT,
    color VARCHAR(50) DEFAULT '#64748B',
    status VARCHAR(20) DEFAULT 'active',
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed default payment methods if empty
  try {
    const pmCount = await dbQuery(`SELECT COUNT(*) as count FROM payment_methods`);
    if (pmCount[0].count === 0) {
      const defaults = [
        ['pm_cash', 'Cash', '', '#10B981', 'active', 1],
        ['pm_card', 'Card', '', '#3B82F6', 'active', 2],
        ['pm_bkash', 'bKash', '', '#E2136E', 'active', 3],
        ['pm_nagad', 'Nagad', '', '#F7941D', 'active', 4],
        ['pm_rocket', 'Rocket', '', '#8C3494', 'active', 5],
        ['pm_bank', 'Bank Transfer', '', '#1E40AF', 'active', 6],
        ['pm_other', 'Other', '', '#64748B', 'active', 7]
      ];
      for (const pm of defaults) {
        await dbQuery(`INSERT INTO payment_methods (id, name, icon, color, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)`, pm);
      }
      console.log('Database Initialization: Seeded default payment methods.');
    }
  } catch (pmSeedErr) {
    console.warn('Warning seeding payment methods:', pmSeedErr.message);
  }

  // Verify and log payments table schema on startup
  try {
    const columns = await dbQuery(`DESCRIBE payments`);
    console.log('=== PAYMENTS SCHEMA DIAGNOSTICS ===');
    console.log(columns);
    console.log('===================================');
  } catch (schemaErr) {
    console.warn('Could not query payments table structure:', schemaErr.message);
  }
};

const seedCatalog = async () => {
  console.log('Seeding initial products catalog...');
  
  const cats = [
    ['cat-1', 'Clothing'],
    ['cat-2', 'Electronics'],
    ['cat-3', 'Food & Beverages'],
    ['cat-4', 'Accessories'],
    ['cat-5', 'Home & Living'],
    ['cat-6', 'Beauty & Health']
  ];
  for (const c of cats) {
    await dbQuery(`INSERT INTO categories (id, name) VALUES (?, ?)`, c);
  }

  // Add sample product
  await dbQuery(`INSERT INTO products (id, name, sku, barcode, categoryId, costPrice, sellingPrice, stock, alertQty) VALUES 
    ('p1', 'Classic T-Shirt', 'TSH-001', '8901234567890', 'cat-1', 200.00, 350.00, 120, 10),
    ('p2', 'Denim Jeans', 'JNS-001', '8901234568001', 'cat-1', 800.00, 1500.00, 60, 5),
    ('p3', 'Wireless Earbuds', 'EAR-001', '8901234569001', 'cat-2', 600.00, 1200.00, 40, 5)`);

  await dbQuery(`INSERT INTO variations (id, productId, name, sku, barcode, price, costPrice, stock) VALUES 
    ('v1a', 'p1', 'S - White', 'TSH-001-SW', '8901234567891', 350.00, 200.00, 30),
    ('v1b', 'p1', 'M - White', 'TSH-001-MW', '8901234567892', 350.00, 200.00, 30),
    ('v2a', 'p2', '30 - Blue', 'JNS-30B', '8901234568002', 1500.00, 800.00, 20),
    ('v2b', 'p2', '32 - Blue', 'JNS-32B', '8901234568003', 1500.00, 800.00, 20)`);

  await dbQuery(`INSERT INTO customers (id, name, phone, email, label, customDiscount, address) VALUES 
    ('cust-1', 'Rahim Ahmed', '01712345678', 'rahim@email.com', 'VIP', 5.00, 'Dhaka, Bangladesh'),
    ('cust-2', 'Fatima Begum', '01898765432', 'fatima@email.com', 'Elite', 10.00, 'Chittagong, Bangladesh')`);

  console.log('Seeding finished.');
};

initDB().catch(console.error);

// ── Authentication Middleware ────────────────────
// For this standalone setup, we will pass active user object as header 'x-user-role' and 'x-user-name' for validation
const verifyRole = (roles) => {
  return (req, res, next) => {
    const userRole = req.headers['x-user-role'];
    if (!userRole) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: 'Permission denied for this task' });
    }
    next();
  };
};

// ── Auth Endpoints ──────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const rows = await dbQuery(`SELECT * FROM users WHERE (username = ? OR email = ?) AND password = ?`, [username, username, password]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid username/email or password' });
    }
    const user = rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/change-password', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { oldPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing old or new password keys' });
    }

    const rows = await dbQuery(`SELECT * FROM users WHERE id = ? AND password = ?`, [userId, oldPassword]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Incorrect old password' });
    }

    await dbQuery(`UPDATE users SET password = ? WHERE id = ?`, [newPassword, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Nodemailer Transporter Setup ──────────────────
const createMailTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (host && port && user && pass) {
    return nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: parseInt(port) === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return null;
};

// ── Password Recovery Endpoints ───────────────────
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { identity } = req.body;
    if (!identity) {
      return res.status(400).json({ error: 'Username or email address is required' });
    }

    const rows = await dbQuery(`SELECT * FROM users WHERE username = ? OR email = ?`, [identity, identity]);
    if (rows.length === 0) {
      return res.json({ success: true, message: 'If a matching account exists, a password reset link has been sent.' });
    }

    const user = rows[0];
    if (!user.email) {
      return res.status(400).json({ error: 'This user account does not have an email address associated with it.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 3600000; // 1 hour from now

    console.log(`[Forgot Password] Generating reset token:`);
    console.log(`- User Email: ${user.email}`);
    console.log(`- Token: ${token}`);
    console.log(`- expiresAt (milliseconds): ${expiresAt}`);

    await dbQuery(`DELETE FROM password_resets WHERE email = ?`, [user.email]);
    await dbQuery(`INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)`, [user.email, token, expiresAt]);

    const resetLink = `${req.protocol}://${req.get('host')}/login.html?token=${token}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || '"ZenPos Support" <support@zenpos.com>',
      to: user.email,
      subject: 'ZenPos Password Recovery Link',
      text: `Hello ${user.name},\n\nYou requested to recover your password for ZenPos.\nPlease click the link below or paste it into your browser to reset your password:\n\n${resetLink}\n\nThis link is valid for 1 hour.\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nZenPos Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #5a5cea; text-align: center;">ZenPos Password Recovery</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>You requested to recover your password for your ZenPos POS account. Please click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #5a5cea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p>Or copy and paste this link in your browser's address bar:</p>
          <p style="background: #f7fafc; padding: 10px; border-radius: 4px; font-size: 13px; word-break: break-all; color: #4a5568;">${resetLink}</p>
          <p style="color: #718096; font-size: 12px; margin-top: 20px;">This link is valid for 1 hour. If you did not initiate this request, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #edf2f7; margin-top: 30px;">
          <p style="color: #a0aec0; font-size: 11px; text-align: center;">ZenPos POS System Development</p>
        </div>
      `
    };

    const transporter = createMailTransporter();
    if (transporter) {
      try {
        await transporter.sendMail(mailOptions);
        console.log(`Password reset link successfully sent via email to: ${user.email}`);
        return res.json({ success: true, message: 'If a matching account exists, a password reset link has been sent.' });
      } catch (mailErr) {
        console.error('SMTP Mail send failed. Falling back to Console logger:', mailErr.message);
      }
    }

    console.log('\n================================================================');
    console.log('📬 PASSWORD RESET EMAIL LOG (NO SMTP CONFIGURED / FAILED)');
    console.log('To:', user.email);
    console.log('Subject:', mailOptions.subject);
    console.log('Reset Link:', resetLink);
    console.log('================================================================\n');

    return res.json({
      success: true,
      message: 'If a matching account exists, a password reset link has been sent.',
      _debugLink: resetLink
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const rows = await dbQuery(`SELECT * FROM password_resets WHERE token = ?`, [token]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired password recovery token' });
    }

    const resetRequest = rows[0];
    const now = Date.now();
    const expiresAt = parseInt(resetRequest.expires_at);

    console.log(`[Reset Password] Validating token submission:`);
    console.log(`- DB Entry expires_at raw: ${resetRequest.expires_at} (type: ${typeof resetRequest.expires_at})`);
    console.log(`- parsed expiresAt: ${expiresAt}`);
    console.log(`- now: ${now}`);
    console.log(`- Is now > expiresAt? ${now > expiresAt}`);

    if (now > expiresAt) {
      await dbQuery(`DELETE FROM password_resets WHERE token = ?`, [token]);
      return res.status(400).json({ error: 'This password recovery link has expired' });
    }

    await dbQuery(`UPDATE users SET password = ? WHERE email = ?`, [newPassword, resetRequest.email]);
    await dbQuery(`DELETE FROM password_resets WHERE token = ?`, [token]);

    console.log(`Password reset successfully for user associated with email: ${resetRequest.email}`);
    res.json({ success: true, message: 'Password has been successfully updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Settings Endpoints ───────────────────────────
app.get('/api/settings', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const rows = await dbQuery(`SELECT * FROM settings`);
    const settings = {};
    rows.forEach(r => {
      settings[r.key_name] = r.val;
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const settings = req.body;
    console.log('--- UPDATING SYSTEM SETTINGS ---');
    console.log(settings);
    console.log('--------------------------------');
    for (const [key, val] of Object.entries(settings)) {
      if (val !== undefined) {
        await dbQuery(`INSERT INTO settings (key_name, val) VALUES (?, ?) ON DUPLICATE KEY UPDATE val = ?`, [key, String(val), String(val)]);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Coupons
app.get('/api/coupons', async (req, res) => {
  try {
    const rows = await dbQuery(`SELECT * FROM coupons ORDER BY code`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/coupons', verifyRole(['admin']), async (req, res) => {
  try {
    const { code, discountType, discountValue } = req.body;
    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({ error: 'Missing coupon fields' });
    }
    const cleanCode = code.trim().toUpperCase();
    await dbQuery(`INSERT INTO coupons (code, discountType, discountValue) VALUES (?, ?, ?)`,
      [cleanCode, discountType, discountValue]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/coupons/:code', verifyRole(['admin']), async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    await dbQuery(`DELETE FROM coupons WHERE code = ?`, [code]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const rows = await dbQuery(`
      SELECT 
        id, 
        COALESCE(supplier_name, '') as supplier_name,
        COALESCE(reason, name, '') as reason,
        name,
        category, 
        amount, 
        COALESCE(paid_amount, CASE WHEN status='Paid' THEN amount ELSE 0 END) as paid_amount,
        DATE_FORMAT(date, '%Y-%m-%dT%H:%i:%s.000Z') as date, 
        DATE_FORMAT(payment_date, '%Y-%m-%d') as payment_date,
        status, 
        image, 
        note 
      FROM expenses 
      ORDER BY date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const { id, supplier_name, reason, name, category, amount, paid_amount, date, payment_date, status, image, note } = req.body;
    const finalReason = reason || name || '';
    const finalName = name || reason || '';
    if (!finalReason || !date || amount === undefined) {
      return res.status(400).json({ error: 'Missing expense fields' });
    }
    const formattedDate = new Date(date).toISOString().slice(0, 19).replace('T', ' ');
    const formattedPaymentDate = payment_date ? new Date(payment_date).toISOString().slice(0, 10) : null;
    const finalPaid = paid_amount !== undefined && paid_amount !== null ? parseFloat(paid_amount) : (status === 'Paid' ? parseFloat(amount) : 0);
    const finalStatus = status || (finalPaid >= parseFloat(amount) ? 'Paid' : (finalPaid > 0 ? 'Partial' : 'Unpaid'));

    await dbQuery(
      `INSERT INTO expenses (id, supplier_name, reason, name, category, amount, paid_amount, date, payment_date, status, image, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id || 'exp_' + Math.random().toString(36).substr(2, 9),
        supplier_name || '',
        finalReason,
        finalName,
        category || 'Other',
        parseFloat(amount) || 0,
        finalPaid,
        formattedDate,
        formattedPaymentDate,
        finalStatus,
        image || '',
        note || ''
      ]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/expenses/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const eid = req.params.id;
    const { supplier_name, reason, name, category, amount, paid_amount, date, payment_date, status, image, note } = req.body;
    const finalReason = reason || name || '';
    const finalName = name || reason || '';
    if (!finalReason || !date || amount === undefined) {
      return res.status(400).json({ error: 'Missing expense fields' });
    }
    const formattedDate = new Date(date).toISOString().slice(0, 19).replace('T', ' ');
    const formattedPaymentDate = payment_date ? new Date(payment_date).toISOString().slice(0, 10) : null;
    const finalPaid = paid_amount !== undefined && paid_amount !== null ? parseFloat(paid_amount) : (status === 'Paid' ? parseFloat(amount) : 0);
    const finalStatus = status || (finalPaid >= parseFloat(amount) ? 'Paid' : (finalPaid > 0 ? 'Partial' : 'Unpaid'));

    await dbQuery(`
      UPDATE expenses 
      SET supplier_name = ?, reason = ?, name = ?, category = ?, amount = ?, paid_amount = ?, date = ?, payment_date = ?, status = ?, image = ?, note = ?
      WHERE id = ?
    `, [
      supplier_name || '',
      finalReason,
      finalName,
      category || 'Other',
      parseFloat(amount) || 0,
      finalPaid,
      formattedDate,
      formattedPaymentDate,
      finalStatus,
      image || '',
      note || '',
      eid
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const eid = req.params.id;
    await dbQuery(`DELETE FROM expenses WHERE id = ?`, [eid]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Supplier Payments Endpoints ────────────────────────────────
app.get('/api/supplier-payments', async (req, res) => {
  try {
    const rows = await dbQuery(`
      SELECT 
        id, 
        supplier_name, 
        reason, 
        amount, 
        paid_amount, 
        DATE_FORMAT(date, '%Y-%m-%dT%H:%i:%s.000Z') as date, 
        DATE_FORMAT(payment_date, '%Y-%m-%d') as payment_date, 
        status, 
        image, 
        note, 
        created_at 
      FROM supplier_payments 
      ORDER BY date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/supplier-payments', async (req, res) => {
  try {
    const { id, supplier_name, reason, amount, paid_amount, date, payment_date, status, image, note } = req.body;
    if (!supplier_name || !reason || amount === undefined || !date) {
      return res.status(400).json({ error: 'Missing supplier payment fields' });
    }
    const formattedDate = new Date(date).toISOString().slice(0, 19).replace('T', ' ');
    const formattedPaymentDate = payment_date ? new Date(payment_date).toISOString().slice(0, 10) : null;
    const finalPaid = paid_amount !== undefined && paid_amount !== null ? parseFloat(paid_amount) : (status === 'Paid' ? parseFloat(amount) : 0);
    const finalStatus = status || (finalPaid >= parseFloat(amount) ? 'Paid' : (finalPaid > 0 ? 'Partial' : 'Unpaid'));

    await dbQuery(`
      INSERT INTO supplier_payments 
        (id, supplier_name, reason, amount, paid_amount, status, date, payment_date, image, note) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id || 'sp_' + Math.random().toString(36).substr(2, 9),
      supplier_name,
      reason,
      parseFloat(amount) || 0,
      finalPaid,
      finalStatus,
      formattedDate,
      formattedPaymentDate,
      image || '',
      note || ''
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/supplier-payments/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const spId = req.params.id;
    const { supplier_name, reason, amount, paid_amount, date, payment_date, status, image, note } = req.body;
    if (!supplier_name || !reason || amount === undefined || !date) {
      return res.status(400).json({ error: 'Missing supplier payment fields' });
    }
    const formattedDate = new Date(date).toISOString().slice(0, 19).replace('T', ' ');
    const formattedPaymentDate = payment_date ? new Date(payment_date).toISOString().slice(0, 10) : null;
    const finalPaid = paid_amount !== undefined && paid_amount !== null ? parseFloat(paid_amount) : (status === 'Paid' ? parseFloat(amount) : 0);
    const finalStatus = status || (finalPaid >= parseFloat(amount) ? 'Paid' : (finalPaid > 0 ? 'Partial' : 'Unpaid'));

    await dbQuery(`
      UPDATE supplier_payments 
      SET supplier_name = ?, reason = ?, amount = ?, paid_amount = ?, status = ?, date = ?, payment_date = ?, image = ?, note = ?
      WHERE id = ?
    `, [
      supplier_name,
      reason,
      parseFloat(amount) || 0,
      finalPaid,
      finalStatus,
      formattedDate,
      formattedPaymentDate,
      image || '',
      note || '',
      spId
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/supplier-payments/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const spId = req.params.id;
    await dbQuery(`DELETE FROM supplier_payments WHERE id = ?`, [spId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Expense Categories
app.get('/api/expense-categories', async (req, res) => {
  try {
    const rows = await dbQuery(`SELECT id, name FROM expense_categories ORDER BY name`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expense-categories', async (req, res) => {
  try {
    const { id, name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const cleanName = name.trim();
    await dbQuery(`INSERT INTO expense_categories (id, name) VALUES (?, ?)`,
      [id || 'exp_cat_' + Math.random().toString(36).substr(2, 9), cleanName]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expense-categories/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const id = req.params.id;
    await dbQuery(`DELETE FROM expense_categories WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Payment Methods Management ──────────────────────────────
app.get('/api/payment-methods', async (req, res) => {
  try {
    const rows = await dbQuery(`SELECT id, name, icon, color, status, sort_order as sortOrder, DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.000Z') as createdAt FROM payment_methods ORDER BY sort_order ASC, name ASC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payment-methods', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id, name, icon, color, status, sortOrder } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Payment method name is required' });
    }
    const cleanId = id || ('pm_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5));
    const cleanName = name.trim();
    const cleanIcon = icon || '';
    const cleanColor = color || '#64748B';
    const cleanStatus = status || 'active';
    const cleanSort = parseInt(sortOrder) || 0;

    await dbQuery(`INSERT INTO payment_methods (id, name, icon, color, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name), icon = VALUES(icon), color = VALUES(color), status = VALUES(status), sort_order = VALUES(sort_order)`,
      [cleanId, cleanName, cleanIcon, cleanColor, cleanStatus, cleanSort]);

    res.json({ success: true, id: cleanId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/payment-methods/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const id = req.params.id;
    const { name, icon, color, status, sortOrder } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Payment method name is required' });
    }
    await dbQuery(`UPDATE payment_methods SET name = ?, icon = ?, color = ?, status = ?, sort_order = ? WHERE id = ?`,
      [name.trim(), icon || '', color || '#64748B', status || 'active', parseInt(sortOrder) || 0, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/payment-methods/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const id = req.params.id;
    await dbQuery(`DELETE FROM payment_methods WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Users Management (Admin Only)
app.get('/api/users', verifyRole(['admin']), async (req, res) => {
  try {
    const rows = await dbQuery(`SELECT id, username, name, role, email FROM users ORDER BY name`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', verifyRole(['admin']), async (req, res) => {
  try {
    const { id, username, password, name, role, email } = req.body;
    await dbQuery(`INSERT INTO users (id, username, password, name, role, email) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, username, password, name, role, email || null]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', verifyRole(['admin']), async (req, res) => {
  try {
    const uid = req.params.id;
    const { username, password, name, role, email } = req.body;
    if (password) {
      await dbQuery(`UPDATE users SET username = ?, password = ?, name = ?, role = ?, email = ? WHERE id = ?`,
        [username, password, name, role, email || null, uid]);
    } else {
      await dbQuery(`UPDATE users SET username = ?, name = ?, role = ?, email = ? WHERE id = ?`,
        [username, name, role, email || null, uid]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', verifyRole(['admin']), async (req, res) => {
  try {
    const uid = req.params.id;
    if (uid === 'u-admin') {
      return res.status(400).json({ error: 'Cannot delete primary admin account' });
    }
    await dbQuery(`DELETE FROM users WHERE id = ?`, [uid]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Generic API Endpoints ───────────────────────

// Counters
app.get('/api/counters/next/:prefix', async (req, res) => {
  try {
    const prefix = req.params.prefix.toUpperCase();
    const key = prefix === 'INV-' ? 'invoice' : 'return';
    const rows = await dbQuery(`SELECT val FROM counters WHERE key_name = ?`, [key]);
    const nextVal = (rows.length > 0 ? rows[0].val : 0) + 1;
    res.json({ nextId: prefix + String(nextVal).padStart(4, '0') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Categories
app.get('/api/categories', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const rows = await dbQuery(`SELECT * FROM categories ORDER BY name`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id, name } = req.body;
    await dbQuery(`INSERT INTO categories (id, name) VALUES (?, ?)`, [id, name]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const cid = req.params.id;
    await dbQuery(`DELETE FROM categories WHERE id = ?`, [cid]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Products
// ── Dedicated High-Performance Server-Side Product Search ─────────────
app.get('/api/products/search', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const q = (req.query.q || req.query.query || '').toString().trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100);
    const includeTrashed = req.query.includeTrashed === 'true';

    if (!q) {
      return res.json([]);
    }

    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
      return res.json([]);
    }

    let sql = `SELECT p.* FROM products p WHERE 1=1`;
    const params = [];

    if (!includeTrashed) {
      sql += ` AND (p.deletedAt IS NULL OR p.deletedAt = '0000-00-00 00:00:00')`;
    }

    for (const token of tokens) {
      const t = '%' + token + '%';
      sql += ` AND (
        LOWER(p.name) LIKE ? 
        OR LOWER(COALESCE(p.generic, '')) LIKE ? 
        OR LOWER(COALESCE(p.strength, '')) LIKE ? 
        OR LOWER(COALESCE(p.brand, '')) LIKE ? 
        OR LOWER(COALESCE(p.category, '')) LIKE ? 
        OR LOWER(p.sku) LIKE ? 
        OR LOWER(COALESCE(p.barcode, '')) LIKE ? 
        OR LOWER(COALESCE(p.tag, '')) LIKE ? 
        OR EXISTS (
          SELECT 1 FROM variations v 
          WHERE v.productId = p.id 
          AND (LOWER(v.name) LIKE ? OR LOWER(COALESCE(v.sku, '')) LIKE ? OR LOWER(COALESCE(v.barcode, '')) LIKE ?)
        )
      )`;
      params.push(t, t, t, t, t, t, t, t, t, t, t);
    }

    sql += ` ORDER BY p.priority DESC, p.name ASC LIMIT ${limit}`;

    const products = await dbQuery(sql, params);

    // Attach variations ONLY for the matched products (never 20,000!)
    if (products.length > 0) {
      const pids = products.map(p => p.id);
      const placeholders = pids.map(() => '?').join(',');
      const variations = await dbQuery(`SELECT * FROM variations WHERE productId IN (${placeholders})`, pids);
      products.forEach(p => {
        p.variations = variations.filter(v => v.productId === p.id);
      });
    }

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Main Products Endpoint (Server-Side Paginated & Filtered or Full List Fallback) ──
app.get('/api/products', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const isPaginated = req.query.page !== undefined || req.query.limit !== undefined || req.query.paginate === 'true';

    if (isPaginated) {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 500);
      const offset = (page - 1) * limit;

      const tab = req.query.tab || req.query.status || 'all';
      const search = (req.query.search || req.query.q || '').toString().trim();
      const genericFilter = (req.query.generic || '').toString().trim();
      const categoryFilter = (req.query.category || req.query.categoryId || '').toString().trim();

      let whereClauses = [];
      let queryParams = [];

      // 1. Tab / soft-delete filtering in MySQL
      if (tab === 'Trash') {
        whereClauses.push(`(p.deletedAt IS NOT NULL AND p.deletedAt != '0000-00-00 00:00:00')`);
      } else {
        whereClauses.push(`(p.deletedAt IS NULL OR p.deletedAt = '0000-00-00 00:00:00')`);
        if (tab === 'Publish' || tab === 'Draft') {
          whereClauses.push(`p.status = ?`);
          queryParams.push(tab);
        }
      }

      // 2. Generic filter in MySQL
      if (genericFilter && genericFilter !== 'all') {
        whereClauses.push(`p.generic = ?`);
        queryParams.push(genericFilter);
      }

      // 3. Category filter in MySQL
      if (categoryFilter && categoryFilter !== 'all') {
        whereClauses.push(`(p.categoryId = ? OR p.category = ?)`);
        queryParams.push(categoryFilter, categoryFilter);
      }

      // 4. Tokenized search in MySQL
      if (search) {
        const tokens = search.toLowerCase().split(/\s+/).filter(Boolean);
        for (const token of tokens) {
          const t = '%' + token + '%';
          whereClauses.push(`(
            LOWER(p.name) LIKE ? 
            OR LOWER(COALESCE(p.generic, '')) LIKE ? 
            OR LOWER(COALESCE(p.strength, '')) LIKE ? 
            OR LOWER(COALESCE(p.brand, '')) LIKE ? 
            OR LOWER(COALESCE(p.category, '')) LIKE ? 
            OR LOWER(p.sku) LIKE ? 
            OR LOWER(COALESCE(p.barcode, '')) LIKE ? 
            OR LOWER(COALESCE(p.tag, '')) LIKE ? 
            OR EXISTS (
              SELECT 1 FROM variations v 
              WHERE v.productId = p.id 
              AND (LOWER(v.name) LIKE ? OR LOWER(COALESCE(v.sku, '')) LIKE ? OR LOWER(COALESCE(v.barcode, '')) LIKE ?)
            )
          )`);
          queryParams.push(t, t, t, t, t, t, t, t, t, t, t);
        }
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Global count metrics for tabs (unfiltered by search so tabs always show true counts)
      const [allCountRow] = await dbQuery(`SELECT COUNT(*) as c FROM products WHERE (deletedAt IS NULL OR deletedAt = '0000-00-00 00:00:00')`);
      const [pubCountRow] = await dbQuery(`SELECT COUNT(*) as c FROM products WHERE (deletedAt IS NULL OR deletedAt = '0000-00-00 00:00:00') AND status = 'Publish'`);
      const [draftCountRow] = await dbQuery(`SELECT COUNT(*) as c FROM products WHERE (deletedAt IS NULL OR deletedAt = '0000-00-00 00:00:00') AND status = 'Draft'`);
      const [trashCountRow] = await dbQuery(`SELECT COUNT(*) as c FROM products WHERE (deletedAt IS NOT NULL AND deletedAt != '0000-00-00 00:00:00')`);

      // Filtered total count
      const countSql = `SELECT COUNT(*) as total FROM products p ${whereSql}`;
      const [totalRow] = await dbQuery(countSql, queryParams);
      const total = totalRow ? totalRow.total : 0;
      const totalPages = Math.ceil(total / limit) || 1;

      // Paginated items query
      const itemsSql = `SELECT p.* FROM products p ${whereSql} ORDER BY p.priority DESC, p.createdAt DESC, p.name ASC LIMIT ${limit} OFFSET ${offset}`;
      const items = await dbQuery(itemsSql, queryParams);

      if (items.length > 0) {
        const pids = items.map(p => p.id);
        const placeholders = pids.map(() => '?').join(',');
        const variations = await dbQuery(`SELECT * FROM variations WHERE productId IN (${placeholders})`, pids);
        items.forEach(p => {
          p.variations = variations.filter(v => v.productId === p.id);
        });
      }

      return res.json({
        items,
        total,
        page,
        limit,
        totalPages,
        counts: {
          all: allCountRow ? allCountRow.c : 0,
          publish: pubCountRow ? pubCountRow.c : 0,
          draft: draftCountRow ? draftCountRow.c : 0,
          trash: trashCountRow ? trashCountRow.c : 0
        }
      });
    }

    // ── Non-paginated legacy fallback (filtered in MySQL directly) ──
    const includeTrashed = req.query.includeTrashed === 'true';
    const statusFilter = req.query.status;

    let sql = `SELECT p.* FROM products p`;
    const params = [];
    if (!includeTrashed) {
      sql += ` WHERE (p.deletedAt IS NULL OR p.deletedAt = '0000-00-00 00:00:00')`;
      if (statusFilter) {
        sql += ` AND p.status = ?`;
        params.push(statusFilter);
      }
    } else {
      if (statusFilter === 'Trash') {
        sql += ` WHERE (p.deletedAt IS NOT NULL AND p.deletedAt != '0000-00-00 00:00:00')`;
      } else if (statusFilter) {
        sql += ` WHERE (p.deletedAt IS NULL OR p.deletedAt = '0000-00-00 00:00:00') AND p.status = ?`;
        params.push(statusFilter);
      }
    }

    sql += ` ORDER BY p.priority DESC, p.createdAt DESC, p.id DESC`;

    const prods = await dbQuery(sql, params);
    
    // Attach variations
    if (prods.length > 0 && prods.length <= 500) {
      const pids = prods.map(p => p.id);
      const placeholders = pids.map(() => '?').join(',');
      const vars = await dbQuery(`SELECT * FROM variations WHERE productId IN (${placeholders})`, pids);
      prods.forEach(p => {
        p.variations = vars.filter(v => v.productId === p.id);
      });
    } else if (prods.length > 0) {
      const vars = await dbQuery(`SELECT * FROM variations`);
      prods.forEach(p => {
        p.variations = vars.filter(v => v.productId === p.id);
      });
    }

    res.json(prods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id, name, sku, barcode, categoryId, costPrice, sellingPrice, stock, alertQty, image, tag, status, priority, variations } = req.body;
    
    // Safely default undefined fields to prevent MySQL driver bind errors
    const nameVal = name !== undefined ? name : '';
    const skuVal = sku !== undefined ? sku : '';
    const barcodeVal = barcode !== undefined ? barcode : null;
    const catIdVal = categoryId !== undefined ? categoryId : null;
    const costVal = costPrice !== undefined ? costPrice : 0.00;
    const sellVal = sellingPrice !== undefined ? sellingPrice : 0.00;
    const stockVal = stock !== undefined ? stock : 0;
    const alertVal = alertQty !== undefined ? alertQty : 5;
    const imageVal = image !== undefined ? image : null;
    const tagVal = tag !== undefined ? tag : null;
    const statusVal = status !== undefined ? status : 'Publish';
    const priorityVal = priority !== undefined ? parseInt(priority) : 0;

    await dbQuery(`INSERT INTO products (id, name, sku, barcode, categoryId, costPrice, sellingPrice, stock, alertQty, image, tag, status, priority) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, nameVal, skuVal, barcodeVal, catIdVal, costVal, sellVal, stockVal, alertVal, imageVal, tagVal, statusVal, priorityVal]);

    if (variations && variations.length > 0) {
      for (const v of variations) {
        const vSku = v.sku !== undefined ? v.sku : null;
        const vBarcode = v.barcode !== undefined ? v.barcode : null;
        const vPrice = v.price !== undefined ? v.price : 0.00;
        const vCost = v.costPrice !== undefined ? v.costPrice : 0.00;
        const vStock = v.stock !== undefined ? v.stock : 0;

        await dbQuery(`INSERT INTO variations (id, productId, name, sku, barcode, price, costPrice, stock) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [v.id, id, v.name, vSku, vBarcode, vPrice, vCost, vStock]);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products/bulk', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const products = req.body;
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Body must be an array of products' });
    }

    for (const item of products) {
      const { name, sku, barcode, categoryName, costPrice, sellingPrice, stock, alertQty, tag, variations } = item;
      if (!sku) continue;

      // 1. Check or create category
      let categoryId = 'cat-uncategorized';
      if (categoryName) {
        const catRows = await dbQuery(`SELECT id FROM categories WHERE name = ?`, [categoryName]);
        if (catRows.length > 0) {
          categoryId = catRows[0].id;
        } else {
          categoryId = 'cat_' + Math.random().toString(36).substr(2, 9);
          await dbQuery(`INSERT INTO categories (id, name) VALUES (?, ?)`, [categoryId, categoryName]);
        }
      }

      // 2. Check if product with this SKU exists
      const prodRows = await dbQuery(`SELECT id FROM products WHERE sku = ?`, [sku]);
      let pid;
      if (prodRows.length > 0) {
        pid = prodRows[0].id;
        // Update existing product
        await dbQuery(`UPDATE products SET name = ?, categoryId = ?, costPrice = ?, sellingPrice = ?, stock = ?, alertQty = ?, tag = ? WHERE id = ?`,
          [name || `Product ${sku}`, categoryId, costPrice || 0, sellingPrice || 0, stock || 0, alertQty || 5, tag || null, pid]);
      } else {
        pid = 'prod_' + Math.random().toString(36).substr(2, 9);
        // Insert new product
        await dbQuery(`INSERT INTO products (id, name, sku, barcode, categoryId, costPrice, sellingPrice, stock, alertQty, image, tag) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?)`,
          [pid, name || `Product ${sku}`, sku, barcode || null, categoryId, costPrice || 0, sellingPrice || 0, stock || 0, alertQty || 5, tag || null]);
      }

      // 3. Process variations if variations are specified in payload
      if (variations && variations.length > 0) {
        // Clear old variations of this product
        await dbQuery(`DELETE FROM variations WHERE productId = ?`, [pid]);
        
        for (const v of variations) {
          const vid = 'var_' + Math.random().toString(36).substr(2, 9);
          await dbQuery(`INSERT INTO variations (id, productId, name, sku, barcode, price, costPrice, stock) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [vid, pid, v.name || 'Default', v.sku, v.barcode || null, v.price || 0, v.costPrice || 0, v.stock || 0]);
        }

        // Sum up and save total variations stock as the main product stock
        const totalVarStock = variations.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
        await dbQuery(`UPDATE products SET stock = ? WHERE id = ?`, [totalVarStock, pid]);
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const pid = req.params.id;
    const { name, sku, barcode, categoryId, costPrice, sellingPrice, stock, alertQty, image, tag, status, priority, variations } = req.body;

    // Safely default undefined fields to prevent MySQL driver bind errors
    const nameVal = name !== undefined ? name : '';
    const skuVal = sku !== undefined ? sku : '';
    const barcodeVal = barcode !== undefined ? barcode : null;
    const catIdVal = categoryId !== undefined ? categoryId : null;
    const costVal = costPrice !== undefined ? costPrice : 0.00;
    const sellVal = sellingPrice !== undefined ? sellingPrice : 0.00;
    const stockVal = stock !== undefined ? stock : 0;
    const alertVal = alertQty !== undefined ? alertQty : 5;
    const imageVal = image !== undefined ? image : null;
    const tagVal = tag !== undefined ? tag : null;
    const statusVal = status !== undefined ? status : 'Publish';
    const priorityVal = priority !== undefined ? parseInt(priority) : 0;

    await dbQuery(`UPDATE products SET name = ?, sku = ?, barcode = ?, categoryId = ?, costPrice = ?, 
      sellingPrice = ?, stock = ?, alertQty = ?, image = ?, tag = ?, status = ?, priority = ? WHERE id = ?`,
      [nameVal, skuVal, barcodeVal, catIdVal, costVal, sellVal, stockVal, alertVal, imageVal, tagVal, statusVal, priorityVal, pid]);

    await dbQuery(`DELETE FROM variations WHERE productId = ?`, [pid]);
    if (variations && variations.length > 0) {
      for (const v of variations) {
        const vSku = v.sku !== undefined ? v.sku : null;
        const vBarcode = v.barcode !== undefined ? v.barcode : null;
        const vPrice = v.price !== undefined ? v.price : 0.00;
        const vCost = v.costPrice !== undefined ? v.costPrice : 0.00;
        const vStock = v.stock !== undefined ? v.stock : 0;

        await dbQuery(`INSERT INTO variations (id, productId, name, sku, barcode, price, costPrice, stock) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [v.id, pid, v.name, vSku, vBarcode, vPrice, vCost, vStock]);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear Product Image (Admin/Manager only)
app.delete('/api/products/:id/image', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const pid = req.params.id;
    await dbQuery(`UPDATE products SET image = NULL WHERE id = ?`, [pid]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const pid = req.params.id;
    const permanent = req.query.permanent === 'true';
    if (permanent) {
      await dbQuery(`DELETE FROM products WHERE id = ?`, [pid]);
      await dbQuery(`DELETE FROM variations WHERE productId = ?`, [pid]);
    } else {
      await dbQuery(`UPDATE products SET deletedAt = NOW() WHERE id = ?`, [pid]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products/:id/restore', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const pid = req.params.id;
    await dbQuery(`UPDATE products SET deletedAt = NULL WHERE id = ?`, [pid]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk scan resolve and exact search endpoints
app.get(['/api/products/resolve-scan', '/api/products/search-exact'], async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }

    const code = String(query).trim();

    // 1. Try variations first
    const varRows = await dbQuery(`
      SELECT v.id as variationId, v.productId, v.name as variationName, v.sku, v.barcode, v.price as variationPrice,
             p.name as productName, p.image, p.sellingPrice, v.stock
      FROM variations v
      JOIN products p ON v.productId = p.id
      WHERE v.sku = ? OR v.barcode = ?
    `, [code, code]);

    if (varRows.length > 0) {
      const row = varRows[0];
      return res.json({
        success: true,
        item: {
          type: 'variation',
          id: row.variationId,
          productId: row.productId,
          productName: row.productName,
          variationName: row.variationName,
          name: `${row.productName} (${row.variationName})`,
          sku: row.sku || '',
          barcode: row.barcode || '',
          price: (row.variationPrice !== null && row.variationPrice !== undefined && row.variationPrice !== '') ? parseFloat(row.variationPrice) : parseFloat(row.sellingPrice || 0),
          image: row.image || '',
          currentStock: row.stock || 0
        }
      });
    }

    // 2. Try products
    const prodRows = await dbQuery(`
      SELECT id as productId, name as productName, image, sku, barcode, stock, sellingPrice
      FROM products
      WHERE sku = ? OR barcode = ?
    `, [code, code]);

    if (prodRows.length > 0) {
      const row = prodRows[0];
      return res.json({
        success: true,
        item: {
          type: 'product',
          id: row.productId,
          productId: row.productId,
          productName: row.productName,
          variationName: '',
          name: row.productName,
          sku: row.sku || '',
          barcode: row.barcode || '',
          price: parseFloat(row.sellingPrice || 0),
          image: row.image || '',
          currentStock: row.stock || 0
        }
      });
    }

    res.json({ success: false, error: 'No matching product or variation found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products/bulk-stock-update', verifyRole(['admin', 'manager', 'cashier']), async (req, res) => {
  try {
    const updates = req.body;
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Body must be an array of updates' });
    }

    const parentProductIdsToRecalculate = new Set();

    for (const update of updates) {
      const { type, id, qty, action } = update;
      let amount = parseInt(qty) || 0;
      if (amount === 0) continue;
      if (action === 'remove' || action === 'deduct') {
        amount = -Math.abs(amount);
      }

      if (type === 'product') {
        await dbQuery(`UPDATE products SET stock = GREATEST(0, stock + ?) WHERE id = ?`, [amount, id]);
      } else if (type === 'variation') {
        await dbQuery(`UPDATE variations SET stock = GREATEST(0, stock + ?) WHERE id = ?`, [amount, id]);
        const varRows = await dbQuery(`SELECT productId FROM variations WHERE id = ?`, [id]);
        if (varRows.length > 0) {
          parentProductIdsToRecalculate.add(varRows[0].productId);
        }
      }
    }

    // Recalculate parent product stocks
    for (const pid of parentProductIdsToRecalculate) {
      const sumRows = await dbQuery(`SELECT SUM(stock) as totalStock FROM variations WHERE productId = ?`, [pid]);
      const totalStock = parseInt(sumRows[0].totalStock) || 0;
      await dbQuery(`UPDATE products SET stock = ? WHERE id = ?`, [totalStock, pid]);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customers
app.get('/api/customers', async (req, res) => {
  try {
    const rows = await dbQuery(`SELECT * FROM customers ORDER BY name`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', verifyRole(['admin', 'manager', 'cashier']), async (req, res) => {
  try {
    const { id, name, phone, email, label, customDiscount, address } = req.body;
    await dbQuery(`INSERT INTO customers (id, name, phone, email, label, customDiscount, address) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, name, phone, email, label, customDiscount, address]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', verifyRole(['admin', 'manager', 'cashier']), async (req, res) => {
  try {
    const cid = req.params.id;
    const { name, phone, email, label, customDiscount, address } = req.body;
    await dbQuery(`UPDATE customers SET name = ?, phone = ?, email = ?, label = ?, 
      customDiscount = ?, address = ? WHERE id = ?`, [name, phone, email, label, customDiscount, address, cid]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', verifyRole(['admin', 'manager', 'cashier']), async (req, res) => {
  try {
    const cid = req.params.id;
    await dbQuery(`DELETE FROM customers WHERE id = ?`, [cid]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Orders
app.get('/api/orders', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const rows = await dbQuery(`SELECT id, invoiceId, customerId, customerName, customerPhone, DATE_FORMAT(date, '%Y-%m-%dT%H:%i:%s.000Z') as date, subtotal, discountType, discountValue, discountAmount, taxPercent, taxAmount, grandTotal, paidAmount, dueAmount, returnedAmount, status FROM orders ORDER BY date DESC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orderItems', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const rows = await dbQuery(`SELECT * FROM orderItems`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Category sales aggregation for dashboard pie chart
app.get('/api/dashboard/category-sales', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const { from, to } = req.query;
    let whereClauses = ["(o.status IS NULL OR o.status NOT IN ('cancelled', 'void'))"];
    const params = [];
    if (from) {
      whereClauses.push(`DATE(o.date) >= ?`);
      params.push(from);
    }
    if (to) {
      whereClauses.push(`DATE(o.date) <= ?`);
      params.push(to);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const sql = `
      SELECT 
        COALESCE(
          NULLIF(TRIM(c.name), ''), 
          NULLIF(TRIM(p.category), ''), 
          'General / Uncategorized'
        ) AS categoryName,
        ROUND(SUM(oi.total), 2) AS totalAmount,
        SUM(oi.qty) AS totalQty,
        COUNT(DISTINCT oi.orderId) AS orderCount
      FROM orderItems oi
      INNER JOIN orders o ON oi.orderId = o.id
      LEFT JOIN products p ON oi.productId = p.id
      LEFT JOIN categories c ON p.categoryId = c.id
      ${whereSql}
      GROUP BY categoryName
      ORDER BY totalAmount DESC
    `;
    const rows = await dbQuery(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all custom order items with order details
app.get('/api/custom-order-items', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const rows = await dbQuery(`
      SELECT 
        oi.id,
        oi.orderId,
        oi.productId,
        oi.productName,
        oi.variationName,
        oi.qty,
        oi.unitPrice,
        oi.total,
        COALESCE(oi.costPrice, 0.00) AS costPrice,
        o.invoiceId,
        o.date AS orderDate,
        o.customerName,
        o.customerPhone
      FROM orderItems oi
      LEFT JOIN orders o ON oi.orderId = o.id
      WHERE oi.productId LIKE 'custom_%'
      ORDER BY o.date DESC, oi.id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update cost price for a specific order item
app.put('/api/order-items/:id/cost-price', verifyRole(['admin', 'manager', 'cashier']), async (req, res) => {
  try {
    const { costPrice } = req.body;
    const numCost = parseFloat(costPrice) || 0;
    await dbQuery(`UPDATE orderItems SET costPrice = ? WHERE id = ?`, [numCost, req.params.id]);
    res.json({ success: true, id: req.params.id, costPrice: numCost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk update cost prices for order items
app.post('/api/order-items/bulk-cost-price', verifyRole(['admin', 'manager', 'cashier']), async (req, res) => {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const { items } = req.body;
    if (!Array.isArray(items)) {
      throw new Error('Invalid payload: items array required');
    }
    for (const itm of items) {
      if (itm && itm.id) {
        const numCost = parseFloat(itm.costPrice) || 0;
        await connection.execute(`UPDATE orderItems SET costPrice = ? WHERE id = ?`, [numCost, itm.id]);
      }
    }
    await connection.commit();
    res.json({ success: true, updatedCount: items.length });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.get('/api/payments', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const rows = await dbQuery(`SELECT * FROM payments`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Order (Admin only)
app.delete('/api/orders/:id', verifyRole(['admin']), async (req, res) => {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const oid = req.params.id;

    // 1. Get order items to restore stocks
    const items = await connection.execute(`SELECT * FROM orderItems WHERE orderId = ?`, [oid]);
    const orderItems = items[0] || [];

    for (const item of orderItems) {
      if (item.productId && !item.productId.startsWith('custom_')) {
        if (item.variationName) {
          await connection.execute(`UPDATE variations SET stock = stock + ? WHERE productId = ? AND name = ?`,
            [item.qty, item.productId, item.variationName]);
        }
        await connection.execute(`UPDATE products SET stock = stock + ? WHERE id = ?`, [item.qty, item.productId]);
      }
    }

    // 2. Delete payments, orderItems, and the order itself
    await connection.execute(`DELETE FROM payments WHERE orderId = ?`, [oid]);
    await connection.execute(`DELETE FROM orderItems WHERE orderId = ?`, [oid]);
    await connection.execute(`DELETE FROM orders WHERE id = ?`, [oid]);

    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.post('/api/orders', async (req, res) => {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const { order, items, payments } = req.body;

    // Convert date string to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
    const formattedDate = new Date(order.date).toISOString().slice(0, 19).replace('T', ' ');

    await connection.execute(`INSERT INTO orders (
      id, invoiceId, customerId, customerName, customerPhone, date, subtotal, discountType, 
      discountValue, discountAmount, taxPercent, taxAmount, grandTotal, paidAmount, dueAmount, returnedAmount, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [order.id, order.invoiceId, order.customerId, order.customerName, order.customerPhone, formattedDate, order.subtotal,
      order.discountType, order.discountValue, order.discountAmount, order.taxPercent, order.taxAmount, order.grandTotal,
      order.paidAmount, order.dueAmount, order.returnedAmount, order.status]);

    for (const item of items) {
      await connection.execute(`INSERT INTO orderItems (id, orderId, productId, productName, variationName, qty, unitPrice, total, costPrice) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, order.id, item.productId, item.productName, item.variationName, item.qty, item.unitPrice, item.total, parseFloat(item.costPrice) || 0.00]);

      if (item.productId && !item.productId.startsWith('custom_')) {
        if (item.variationName) {
          await connection.execute(`UPDATE variations SET stock = stock - ? WHERE productId = ? AND name = ?`,
            [item.qty, item.productId, item.variationName]);
        }
        await connection.execute(`UPDATE products SET stock = stock - ? WHERE id = ?`, [item.qty, item.productId]);
      }
    }

    for (const p of payments) {
      await connection.execute(`INSERT INTO payments (id, orderId, method, amount, lastFour) VALUES (?, ?, ?, ?, ?)`,
        [p.id, order.id, p.method, p.amount, p.lastFour || p.lastfour || null]);
    }

    await connection.execute(`UPDATE counters SET val = val + 1 WHERE key_name = 'invoice'`);

    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.put('/api/orders/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  const oid = req.params.id;
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const { order, items, payments } = req.body;

    // 1. Revert old stock changes
    const [oldItems] = await connection.execute(`SELECT * FROM orderItems WHERE orderId = ?`, [oid]);
    for (const item of oldItems) {
      if (item.productId && !item.productId.startsWith('custom_')) {
        if (item.variationName) {
          await connection.execute(`UPDATE variations SET stock = stock + ? WHERE productId = ? AND name = ?`,
            [item.qty, item.productId, item.variationName]);
        }
        await connection.execute(`UPDATE products SET stock = stock + ? WHERE id = ?`, [item.qty, item.productId]);
      }
    }

    // 2. Delete old records
    await connection.execute(`DELETE FROM orders WHERE id = ?`, [oid]);
    await connection.execute(`DELETE FROM orderItems WHERE orderId = ?`, [oid]);
    await connection.execute(`DELETE FROM payments WHERE orderId = ?`, [oid]);

    // 3. Insert new records
    const formattedDate = new Date(order.date).toISOString().slice(0, 19).replace('T', ' ');

    await connection.execute(`INSERT INTO orders (
      id, invoiceId, customerId, customerName, customerPhone, date, subtotal, discountType, 
      discountValue, discountAmount, taxPercent, taxAmount, grandTotal, paidAmount, dueAmount, returnedAmount, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [oid, order.invoiceId, order.customerId, order.customerName, order.customerPhone, formattedDate, order.subtotal,
      order.discountType, order.discountValue, order.discountAmount, order.taxPercent, order.taxAmount, order.grandTotal,
      order.paidAmount, order.dueAmount, order.returnedAmount, order.status]);

    for (const item of items) {
      await connection.execute(`INSERT INTO orderItems (id, orderId, productId, productName, variationName, qty, unitPrice, total, costPrice) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, oid, item.productId, item.productName, item.variationName, item.qty, item.unitPrice, item.total, parseFloat(item.costPrice) || 0.00]);

      if (item.productId && !item.productId.startsWith('custom_')) {
        if (item.variationName) {
          await connection.execute(`UPDATE variations SET stock = stock - ? WHERE productId = ? AND name = ?`,
            [item.qty, item.productId, item.variationName]);
        }
        await connection.execute(`UPDATE products SET stock = stock - ? WHERE id = ?`, [item.qty, item.productId]);
      }
    }

    for (const p of payments) {
      await connection.execute(`INSERT INTO payments (id, orderId, method, amount, lastFour) VALUES (?, ?, ?, ?, ?)`,
        [p.id, oid, p.method, p.amount, p.lastFour || p.lastfour || null]);
    }

    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Returns
app.get('/api/returns', async (req, res) => {
  try {
    const rows = await dbQuery(`SELECT id, returnId, orderId, invoiceId, customerName, customerPhone, DATE_FORMAT(date, '%Y-%m-%dT%H:%i:%s.000Z') as date, returnTotal, status FROM returns ORDER BY date DESC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/returnItems', async (req, res) => {
  try {
    const rows = await dbQuery(`SELECT * FROM returnItems`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/returns', async (req, res) => {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const { returnRecord, items } = req.body;
    const formattedDate = new Date(returnRecord.date).toISOString().slice(0, 19).replace('T', ' ');

    await connection.execute(`INSERT INTO returns (id, returnId, orderId, invoiceId, customerName, customerPhone, date, returnTotal, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [returnRecord.id, returnRecord.returnId, returnRecord.orderId, returnRecord.invoiceId, returnRecord.customerName,
      returnRecord.customerPhone, formattedDate, returnRecord.returnTotal, returnRecord.status]);

    for (const item of items) {
      await connection.execute(`INSERT INTO returnItems (id, returnId, orderId, productId, productName, variationName, qty, unitPrice, returnAmount) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, returnRecord.id, returnRecord.orderId, item.productId, item.productName, item.variationName, item.qty, item.unitPrice, item.returnAmount]);

      if (item.variationName) {
        await connection.execute(`UPDATE variations SET stock = stock + ? WHERE productId = ? AND name = ?`,
          [item.qty, item.productId, item.variationName]);
      }
      await connection.execute(`UPDATE products SET stock = stock + ? WHERE id = ?`, [item.qty, item.productId]);
    }

    await connection.execute(`UPDATE orders SET returnedAmount = returnedAmount + ? WHERE id = ?`,
      [returnRecord.returnTotal, returnRecord.orderId]);

    await connection.execute(`UPDATE counters SET val = val + 1 WHERE key_name = 'return'`);

    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Backup
app.get('/api/backup/export', verifyRole(['admin']), async (req, res) => {
  try {
    const categories = await dbQuery(`SELECT * FROM categories`);
    const products = await dbQuery(`SELECT * FROM products`);
    const variations = await dbQuery(`SELECT * FROM variations`);
    const customers = await dbQuery(`SELECT * FROM customers`);
    const orders = await dbQuery(`SELECT * FROM orders`);
    const orderItems = await dbQuery(`SELECT * FROM orderItems`);
    const returns = await dbQuery(`SELECT * FROM returns`);
    const returnItems = await dbQuery(`SELECT * FROM returnItems`);
    const payments = await dbQuery(`SELECT * FROM payments`);
    const counters = await dbQuery(`SELECT * FROM counters`);
    const users = await dbQuery(`SELECT id, username, name, role FROM users`);

    res.json({
      categories,
      products,
      variations,
      customers,
      orders,
      orderItems,
      returns,
      returnItems,
      payments,
      counters,
      users
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backup/import', verifyRole(['admin']), async (req, res) => {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const { categories, products, variations, customers, orders, orderItems, returns, returnItems, payments, counters, users } = req.body;

    await connection.execute(`DELETE FROM categories`);
    await connection.execute(`DELETE FROM products`);
    await connection.execute(`DELETE FROM variations`);
    await connection.execute(`DELETE FROM customers`);
    await connection.execute(`DELETE FROM orders`);
    await connection.execute(`DELETE FROM orderItems`);
    await connection.execute(`DELETE FROM returns`);
    await connection.execute(`DELETE FROM returnItems`);
    await connection.execute(`DELETE FROM payments`);
    await connection.execute(`DELETE FROM counters`);
    await connection.execute(`DELETE FROM users`);

    for (const c of categories || []) await connection.execute(`INSERT INTO categories (id, name) VALUES (?, ?)`, [c.id, c.name]);
    for (const p of products || []) {
      await connection.execute(`INSERT INTO products (id, name, sku, barcode, categoryId, costPrice, sellingPrice, stock, alertQty, image) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [p.id, p.name, p.sku, p.barcode, p.categoryId, p.costPrice, p.sellingPrice, p.stock, p.alertQty, p.image || null]);
    }
    for (const v of variations || []) {
      await connection.execute(`INSERT INTO variations (id, productId, name, sku, barcode, price, costPrice, stock) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [v.id, v.productId, v.name, v.sku, v.barcode, v.price, v.costPrice, v.stock]);
    }
    for (const c of customers || []) {
      await connection.execute(`INSERT INTO customers (id, name, phone, email, label, customDiscount, address) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`, [c.id, c.name, c.phone, c.email, c.label, c.customDiscount, c.address]);
    }
    for (const o of orders || []) {
      const formattedDate = new Date(o.date).toISOString().slice(0, 19).replace('T', ' ');
      await connection.execute(`INSERT INTO orders (id, invoiceId, customerId, customerName, customerPhone, date, subtotal, discountType, discountValue, discountAmount, taxPercent, taxAmount, grandTotal, paidAmount, dueAmount, returnedAmount, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [o.id, o.invoiceId, o.customerId, o.customerName, o.customerPhone, formattedDate, o.subtotal, o.discountType, o.discountValue, o.discountAmount, o.taxPercent, o.taxAmount, o.grandTotal, o.paidAmount, o.dueAmount, o.returnedAmount, o.status]);
    }
    for (const i of orderItems || []) {
      await connection.execute(`INSERT INTO orderItems (id, orderId, productId, productName, variationName, qty, unitPrice, total, costPrice) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [i.id, i.orderId, i.productId, i.productName, i.variationName, i.qty, i.unitPrice, i.total, parseFloat(i.costPrice) || 0.00]);
    }
    for (const r of returns || []) {
      const formattedDate = new Date(r.date).toISOString().slice(0, 19).replace('T', ' ');
      await connection.execute(`INSERT INTO returns (id, returnId, orderId, invoiceId, customerName, customerPhone, date, returnTotal, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [r.id, r.returnId, r.orderId, r.invoiceId, r.customerName, r.customerPhone, formattedDate, r.returnTotal, r.status]);
    }
    for (const i of returnItems || []) {
      await connection.execute(`INSERT INTO returnItems (id, returnId, orderId, productId, productName, variationName, qty, unitPrice, returnAmount) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [i.id, i.returnId, i.orderId, i.productId, i.productName, i.variationName, i.qty, i.unitPrice, i.returnAmount]);
    }
    for (const p of payments || []) {
      await connection.execute(`INSERT INTO payments (id, orderId, method, amount) VALUES (?, ?, ?, ?)`, [p.id, p.orderId, p.method, p.amount]);
    }
    for (const c of counters || []) {
      await connection.execute(`INSERT INTO counters (key_name, val) VALUES (?, ?)`, [c.key_name, c.val]);
    }
    for (const u of users || []) {
      // Default placeholder passwords if missing during backup import
      await connection.execute(`INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)`,
        [u.id, u.username, u.password || 'password123', u.name, u.role]);
    }

    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Wildcard fallback to serve index.html for HTML5 History API routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Listener
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
