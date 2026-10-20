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

// ── Process Crash Safeguards ──────────────────────
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

// ── Dual Database Adapter (MySQL + SQLite Fallback) ──
const { dbQuery, getPool, isMySQL } = require('./db');

// Helper to safely format date strings into MySQL DATETIME ('YYYY-MM-DD HH:MM:SS') in Bangladesh GMT+6 Time
const getBangladeshDateTimeString = (dateVal = new Date()) => {
  const d = (dateVal instanceof Date) ? dateVal : new Date(dateVal);
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    return formatter.format(validDate).replace(',', '');
  } catch (e) {
    const bdMillis = validDate.getTime() + (validDate.getTimezoneOffset() * 60000) + (6 * 3600000);
    const bdDate = new Date(bdMillis);
    const pad = n => String(n).padStart(2, '0');
    return `${bdDate.getFullYear()}-${pad(bdDate.getMonth() + 1)}-${pad(bdDate.getDate())} ${pad(bdDate.getHours())}:${pad(bdDate.getMinutes())}:${pad(bdDate.getSeconds())}`;
  }
};

const getBangladeshDateOnlyString = (dateVal = new Date()) => {
  const d = (dateVal instanceof Date) ? dateVal : new Date(dateVal);
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(validDate);
  } catch (e) {
    const bdMillis = validDate.getTime() + (validDate.getTimezoneOffset() * 60000) + (6 * 3600000);
    const bdDate = new Date(bdMillis);
    const pad = n => String(n).padStart(2, '0');
    return `${bdDate.getFullYear()}-${pad(bdDate.getMonth() + 1)}-${pad(bdDate.getDate())}`;
  }
};

const formatToMySQLDateTime = (dateVal) => {
  if (!dateVal) {
    return getBangladeshDateTimeString(new Date());
  }
  if (typeof dateVal === 'string') {
    const clean = dateVal.trim();
    const m = clean.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2}:\d{2})/);
    if (m && !clean.endsWith('Z') && !clean.includes('+') && !clean.match(/[T\s]\d{2}:\d{2}:\d{2}-\d{2}/)) {
      return `${m[1]} ${m[2]}`;
    }
    const mDate = clean.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (mDate) {
      return `${mDate[1]} 12:00:00`;
    }
  }
  return getBangladeshDateTimeString(dateVal);
};

const formatToMySQLDateOnly = (dateVal) => {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') {
    const clean = dateVal.trim();
    const m = clean.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m && !clean.endsWith('Z') && !clean.includes('+')) {
      return m[1];
    }
  }
  return getBangladeshDateOnlyString(dateVal);
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

  // Auto-migration check: If database already exists but lacks columns, add them safely.
  try {
    const pCols = await dbQuery(`SHOW COLUMNS FROM products`);
    const pColNames = new Set((pCols || []).map(c => c.Field));

    const addCol = async (field, typeDef) => {
      if (!pColNames.has(field)) {
        try {
          await dbQuery(`ALTER TABLE products ADD COLUMN ${field} ${typeDef}`);
          console.log(`Database Migration: Added "${field}" column to products table.`);
        } catch (e) {
          console.warn(`Database Migration Notice: Could not add column ${field}:`, e.message);
        }
      }
    };

    await addCol('image', 'LONGTEXT');
    await addCol('tag', 'VARCHAR(255) DEFAULT NULL');
    await addCol('createdAt', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
    await addCol('generic', 'VARCHAR(255) DEFAULT NULL');
    await addCol('brand', 'VARCHAR(255) DEFAULT NULL');
    await addCol('strength', 'VARCHAR(100) DEFAULT NULL');
    await addCol('category', 'VARCHAR(100) DEFAULT NULL');
    await addCol('status', "VARCHAR(50) NOT NULL DEFAULT 'Publish'");
    await addCol('deletedAt', 'DATETIME NULL DEFAULT NULL');
    await addCol('priority', 'INT NOT NULL DEFAULT 0');
    await addCol('description', 'TEXT DEFAULT NULL');

    // Auto-fix: Ensure deletedAt is nullable and reset any bad default timestamps for active products
    try {
      await dbQuery(`ALTER TABLE products MODIFY COLUMN deletedAt DATETIME NULL DEFAULT NULL`);
    } catch (e) { /* ignore */ }

    try {
      await dbQuery(`UPDATE products SET deletedAt = NULL WHERE status != 'Trash' OR status IS NULL OR status = ''`);
      await dbQuery(`UPDATE products SET status = 'Publish' WHERE status IS NULL OR status = '' OR status = 'active'`);
    } catch (e) {
      console.warn('Update deletedAt/status notice:', e.message);
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

  // Auto-migration check: If users lacks permissions column, add it.
  try {
    const columnsP = await dbQuery(`SHOW COLUMNS FROM users LIKE 'permissions'`);
    if (columnsP.length === 0) {
      await dbQuery(`ALTER TABLE users ADD COLUMN permissions LONGTEXT NULL`);
      console.log('Database Migration: Added "permissions" column to users table.');
    }
  } catch (migErr) {
    console.warn('Warning during database users permissions column migration check:', migErr.message);
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

  // Create expired_wastes table
  await dbQuery(`CREATE TABLE IF NOT EXISTS expired_wastes (
    id VARCHAR(50) PRIMARY KEY,
    itemName VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    costPrice DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    totalCost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    supplierName VARCHAR(255) DEFAULT '',
    compensationAmount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    note TEXT,
    date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create gallery tables
  await dbQuery(`CREATE TABLE IF NOT EXISTS gallery_folders (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS gallery_images (
    id VARCHAR(50) PRIMARY KEY,
    folder_id VARCHAR(50) DEFAULT 'default',
    name VARCHAR(255) NOT NULL,
    data LONGTEXT NOT NULL,
    size VARCHAR(50) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  try {
    const requiredFolders = [
      ['default', 'General'],
      ['folder_items', 'Items'],
      ['folder_categories', 'Categories'],
      ['folder_payment_methods', 'Payment Methods'],
      ['folder_expenses', 'Expenses'],
      ['folder_ingredient_costs', 'Ingredient Costs'],
      ['folder_suppliers', 'Suppliers'],
      ['folder_store_invoices', 'Store & Invoices'],
      ['folder_expired_wastes', 'Expired & Waste']
    ];
    for (const [fid, fname] of requiredFolders) {
      await dbQuery(`INSERT IGNORE INTO gallery_folders (id, name) VALUES (?, ?)`, [fid, fname]);
    }
  } catch (gfErr) {
    console.warn('Warning seeding gallery folders:', gfErr.message);
  }

  // Create restaurant_tables table
  await dbQuery(`CREATE TABLE IF NOT EXISTS restaurant_tables (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    zone VARCHAR(100) DEFAULT 'Main Dining',
    seats INT DEFAULT 4,
    sort_order INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  try {
    const tblCount = await dbQuery(`SELECT COUNT(*) as count FROM restaurant_tables`);
    if (tblCount[0].count === 0) {
      const defaultTables = [
        ['tbl_01', 'Table 01', 'Main Dining', 4, 1, 'active'],
        ['tbl_02', 'Table 02', 'Main Dining', 2, 2, 'active'],
        ['tbl_03', 'Table 03', 'Main Dining', 4, 3, 'active'],
        ['tbl_04', 'Table 04', 'Main Dining', 4, 4, 'active'],
        ['tbl_05', 'Table 05', 'Main Dining', 6, 5, 'active'],
        ['tbl_06', 'Table 06', 'Main Dining', 6, 6, 'active'],
        ['tbl_07', 'Table 07', 'Main Dining', 2, 7, 'active'],
        ['tbl_08', 'Table 08', 'Main Dining', 4, 8, 'active'],
        ['tbl_patio1', 'Patio 01', 'Outdoor Patio', 4, 9, 'active'],
        ['tbl_patio2', 'Patio 02', 'Outdoor Patio', 4, 10, 'active'],
        ['tbl_vip1', 'VIP 01', 'VIP Lounge', 8, 11, 'active'],
        ['tbl_vip2', 'VIP 02', 'VIP Lounge', 8, 12, 'active']
      ];
      for (const t of defaultTables) {
        await dbQuery(`INSERT INTO restaurant_tables (id, name, zone, seats, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)`, t);
      }
    }
  } catch (tblErr) {
    console.warn('Warning seeding restaurant tables:', tblErr.message);
  }

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
  // Auto-migration check: lastFour column in payments
  try {
    const paymentCols = await dbQuery(`SHOW COLUMNS FROM payments LIKE 'lastFour'`);
    if (paymentCols.length === 0) {
      await dbQuery(`ALTER TABLE payments ADD COLUMN lastFour VARCHAR(10) DEFAULT NULL`);
      console.log('Database Migration: Added "lastFour" column to payments table.');
    }
  } catch (migErr) {
    console.warn('Migration error for lastFour in payments:', migErr.message);
  }

  // Create ingredient_categories and ingredient_costs tables
  await dbQuery(`CREATE TABLE IF NOT EXISTS ingredient_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS ingredient_costs (
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

  // Seed default ingredient categories if empty
  try {
    const ingCatsCount = await dbQuery(`SELECT COUNT(*) as count FROM ingredient_categories`);
    if (ingCatsCount[0].count === 0) {
      const defaultIngCats = [
        ['ing_cat_1', 'Fresh Produce & Vegetables'],
        ['ing_cat_2', 'Meat, Beef & Poultry'],
        ['ing_cat_3', 'Seafood & Fish'],
        ['ing_cat_4', 'Dairy, Cheese & Milk'],
        ['ing_cat_5', 'Bakery & Burger Buns'],
        ['ing_cat_6', 'Spices, Herbs & Seasoning'],
        ['ing_cat_7', 'Oils, Mayo & Sauces'],
        ['ing_cat_8', 'Takeaway Packaging & Boxes'],
        ['ing_cat_9', 'Beverage Syrups & Coffee Beans'],
        ['ing_cat_10', 'Kitchen Supplies & Cleaning']
      ];
      for (const cat of defaultIngCats) {
        await dbQuery(`INSERT INTO ingredient_categories (id, name) VALUES (?, ?)`, cat);
      }
    }
  } catch (ingCatErr) {
    console.warn('Warning seeding ingredient categories:', ingCatErr.message);
  }

  // Seed sample ingredient costs if empty
  try {
    const ingCostCount = await dbQuery(`SELECT COUNT(*) as count FROM ingredient_costs`);
    if (ingCostCount[0].count === 0) {
      const todayStr = getBangladeshDateTimeString(new Date());
      const sampleIngredients = [
        ['ing_1', 'Brioche Bakery Co.', 'Fresh Brioche Burger Buns (200 pcs)', 'Brioche Buns', 'Bakery & Burger Buns', 45.00, 45.00, todayStr, 'Paid'],
        ['ing_2', 'Prime Choice Meats', 'Grass-Fed Ground Beef Patties (15 kg)', 'Beef Patties', 'Meat, Beef & Poultry', 125.00, 125.00, todayStr, 'Paid'],
        ['ing_3', 'FarmFresh Poultry', 'Fresh Chicken Breast & Wings (20 kg)', 'Chicken Breast & Wings', 'Meat, Beef & Poultry', 85.00, 85.00, todayStr, 'Paid'],
        ['ing_4', 'Valley Dairy Ltd.', 'Real Cheddar Cheese Slices (10 packs)', 'Cheddar Cheese', 'Dairy, Cheese & Milk', 38.50, 38.50, todayStr, 'Paid'],
        ['ing_5', 'Green Valley Organics', 'Crispy Iceberg Lettuce & Ripe Tomatoes', 'Lettuce & Tomatoes', 'Fresh Produce & Vegetables', 26.00, 26.00, todayStr, 'Paid'],
        ['ing_6', 'Gourmet Sauces Inc.', 'Signature Smoky BBQ & Chipotle Mayo (10 L)', 'Signature Sauces', 'Oils, Mayo & Sauces', 34.00, 34.00, todayStr, 'Paid'],
        ['ing_7', 'EcoPack Supplies', 'Food Grade Burger Boxes & Cups (500 pcs)', 'Takeaway Boxes & Cups', 'Takeaway Packaging & Boxes', 55.00, 55.00, todayStr, 'Paid']
      ];
      for (const row of sampleIngredients) {
        await dbQuery(`INSERT INTO ingredient_costs (id, supplier_name, reason, name, category, amount, paid_amount, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, row);
      }
    }
  } catch (ingCostErr) {
    console.warn('Warning seeding ingredient costs:', ingCostErr.message);
  }

  // Auto-migration: ensure orderType and tableName exist on orders
  try {
    const oCols = await dbQuery(`SHOW COLUMNS FROM orders`);
    const oColNames = new Set((oCols || []).map(c => c.Field));
    if (!oColNames.has('orderType')) {
      await dbQuery(`ALTER TABLE orders ADD COLUMN orderType VARCHAR(50) DEFAULT 'Dine In'`);
    }
    if (!oColNames.has('tableName')) {
      await dbQuery(`ALTER TABLE orders ADD COLUMN tableName VARCHAR(50) DEFAULT 'Table 01'`);
    }
    if (!oColNames.has('tokenNo')) {
      await dbQuery(`ALTER TABLE orders ADD COLUMN tokenNo INT DEFAULT 1`);
    }
  } catch (err) { /* ignore */ }

  // Auto-migration: ensure image and icon exist on categories
  try {
    const cCols = await dbQuery(`SHOW COLUMNS FROM categories`);
    const cColNames = new Set((cCols || []).map(c => c.Field));
    if (!cColNames.has('image')) {
      await dbQuery(`ALTER TABLE categories ADD COLUMN image LONGTEXT`);
    }
    if (!cColNames.has('icon')) {
      await dbQuery(`ALTER TABLE categories ADD COLUMN icon VARCHAR(100)`);
    }
  } catch (err) { /* ignore */ }

  // Auto-cleanup: Permanently delete trashed products older than 30 days ONLY if status is Trash
  try {
    await dbQuery(`DELETE FROM products WHERE status = 'Trash' AND deletedAt IS NOT NULL AND deletedAt < DATE_SUB(NOW(), INTERVAL 30 DAY)`);
  } catch (cleanupErr) {
    console.warn('Warning during database trash auto-cleanup:', cleanupErr.message);
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
        ['pm_card', 'Credit/Debit Card', '', '#3B82F6', 'active', 2],
        ['pm_mobile', 'Mobile Pay', '', '#E05A2B', 'active', 3],
        ['pm_other', 'Gift / Other', '', '#64748B', 'active', 4]
      ];
      for (const pm of defaults) {
        await dbQuery(`INSERT INTO payment_methods (id, name, icon, color, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)`, pm);
      }
    }
  } catch (pmSeedErr) {
    console.warn('Warning seeding payment methods:', pmSeedErr.message);
  }

  // Enterprise Database Indexing for High-Concurrency & Multi-Million Rows Performance
  try {
    const ensureTableIndex = async (table, indexName, colDef) => {
      try {
        const rows = await dbQuery(`SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`, [indexName]);
        if (!rows || rows.length === 0) {
          await dbQuery(`CREATE INDEX \`${indexName}\` ON \`${table}\`(${colDef})`);
          console.log(`[Index Migration] Created index ${indexName} on ${table}(${colDef})`);
        }
      } catch (err) {
        // Safe to ignore if index already exists
      }
    };

    // Orders indexes (critical for 1-2 million orders)
    await ensureTableIndex('orders', 'idx_orders_date', 'date');
    await ensureTableIndex('orders', 'idx_orders_status_date', 'status, date');
    await ensureTableIndex('orders', 'idx_orders_invoiceId', 'invoiceId');
    await ensureTableIndex('orders', 'idx_orders_customerPhone', 'customerPhone');
    await ensureTableIndex('orders', 'idx_orders_customerId', 'customerId');
    await ensureTableIndex('orders', 'idx_orders_tokenNo_date', 'tokenNo, date');

    // OrderItems indexes (order matching, item performance, search)
    await ensureTableIndex('orderItems', 'idx_orderItems_orderId', 'orderId');
    await ensureTableIndex('orderItems', 'idx_orderItems_productId', 'productId');
    await ensureTableIndex('orderItems', 'idx_orderItems_productName', 'productName(191)');

    // Payments indexes
    await ensureTableIndex('payments', 'idx_payments_orderId', 'orderId');
    await ensureTableIndex('payments', 'idx_payments_method', 'method');

    // Expenses indexes
    await ensureTableIndex('expenses', 'idx_expenses_date', 'date');
    await ensureTableIndex('expenses', 'idx_expenses_category', 'category');
    await ensureTableIndex('expenses', 'idx_expenses_status', 'status');

    // Ingredient Costs indexes
    await ensureTableIndex('ingredient_costs', 'idx_ingredient_costs_date', 'date');
    await ensureTableIndex('ingredient_costs', 'idx_ingredient_costs_category', 'category');
    await ensureTableIndex('ingredient_costs', 'idx_ingredient_costs_status', 'status');

    // Expired Wastes indexes
    await ensureTableIndex('expired_wastes', 'idx_expired_wastes_date', 'date');
    await ensureTableIndex('expired_wastes', 'idx_expired_wastes_itemName', 'itemName(191)');

    // Customers indexes
    await ensureTableIndex('customers', 'idx_customers_phone', 'phone');
    await ensureTableIndex('customers', 'idx_customers_name', 'name(100)');

    // Supplier Payments indexes
    await ensureTableIndex('supplier_payments', 'idx_supplier_payments_date', 'date');
  } catch (idxErr) {
    console.warn('Notice during database index setup:', idxErr.message);
  }
};

const seedCatalog = async () => {
  console.log('Seeding restaurant products and categories catalog...');
  
  const cats = [
    ['cat_burger', 'Burger'],
    ['cat_chicken', 'Fried Chicken'],
    ['cat_drink', 'Drink'],
    ['cat_coffee', 'Coffee'],
    ['cat_dessert', 'Dessert'],
    ['cat_sides', 'Sides & Fries']
  ];
  for (const c of cats) {
    await dbQuery(`INSERT INTO categories (id, name) VALUES (?, ?)`, c);
  }

  // Restaurant Menu items exactly matching the ClaPos tablet reference picture
  const restaurantItems = [
    ['p_deluxe_crispy', 'Deluxe Crispy Burger', 'BUR-001', '8901001', 'cat_burger', 0, 4.99, 99999, 0, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80', 'Crispy golden chicken filet with melted cheddar, fresh lettuce & house sauce', 'Publish', 20],
    ['p_classic_crispy', 'Classic Crispy Burger', 'BUR-002', '8901002', 'cat_burger', 0, 4.75, 99999, 0, 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80', 'Hand-breaded crunchy crispy filet with pickles & mayo', 'Publish', 19],
    ['p_special_crispy', 'Special Crispy Burger', 'BUR-003', '8901003', 'cat_burger', 0, 5.75, 99999, 0, 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=80', 'Crispy fried filet with melted pepper jack cheese & spicy relish', 'Publish', 18],
    ['p_special_burger', 'Special Burger', 'BUR-004', '8901004', 'cat_burger', 0, 4.49, 99999, 0, 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=500&auto=format&fit=crop&q=80', 'Signature seasoned beef patty with caramelized onions & secret glaze', 'Publish', 17],
    ['p_spicy_chicken', 'Spicy Chicken Burger', 'BUR-005', '8901005', 'cat_burger', 0, 5.49, 99999, 0, 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=500&auto=format&fit=crop&q=80', 'Fiery Nashville style chicken with jalapeños & creamy coleslaw', 'Publish', 16],
    ['p_cheeseburger', 'Cheeseburger', 'BUR-006', '8901006', 'cat_burger', 0, 4.20, 99999, 0, 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=500&auto=format&fit=crop&q=80', 'Juicy smashed beef patty with double American cheddar & mustard relish', 'Publish', 15],
    ['p_combo_drums', 'Combo Drumsticks', 'CHK-001', '8902001', 'cat_chicken', 0, 7.50, 99999, 0, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop&q=80', '4 pcs golden crisp chicken drumsticks with french fries & dip', 'Publish', 14],
    ['p_double_cheese', 'Double Cheeseburger', 'BUR-007', '8901007', 'cat_burger', 0, 7.25, 99999, 0, 'https://images.unsplash.com/photo-1583032015879-bf728634ff94?w=500&auto=format&fit=crop&q=80', 'Two 100% Angus beef patties, double aged cheddar & special burger sauce', 'Publish', 13],
    ['p_coca_cola', 'Coca Cola', 'DRK-001', '8903001', 'cat_drink', 0, 2.00, 99999, 0, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80', 'Chilled ice cold Coca Cola (330ml can)', 'Publish', 12],
    ['p_cheese_fries', 'Classic Cheese Fries', 'SID-001', '8904001', 'cat_sides', 0, 4.99, 99999, 0, 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&auto=format&fit=crop&q=80', 'Crispy shoestring fries drenched in warm melted cheddar cheese', 'Publish', 11],
    ['p_cheese_wings', '3 Cheese Wings', 'CHK-002', '8902002', 'cat_chicken', 0, 3.49, 99999, 0, 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500&auto=format&fit=crop&q=80', '3 pcs jumbo chicken wings tossed in rich three-cheese coating', 'Publish', 10],
    ['p_sprite', 'Sprite', 'DRK-002', '8903002', 'cat_drink', 0, 2.00, 99999, 0, 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=500&auto=format&fit=crop&q=80', 'Crisp, refreshing lemon-lime Sprite (330ml can)', 'Publish', 9],
    ['p_choco_shake', 'Chocolate Milkshake', 'DRK-003', '8903003', 'cat_drink', 0, 3.50, 99999, 0, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80', 'Thick creamy Belgian chocolate shake topped with whipped cream', 'Publish', 8],
    ['p_3_drumsticks', '3 Drumstick', 'CHK-003', '8902003', 'cat_chicken', 0, 4.75, 99999, 0, 'https://images.unsplash.com/photo-1527477321005-4d45d724b8c4?w=500&auto=format&fit=crop&q=80', '3 pcs signature spicy crunchy fried chicken drumsticks', 'Publish', 7],
    ['p_cappuccino', 'Cappuccino', 'COF-001', '8905001', 'cat_coffee', 0, 3.25, 99999, 0, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&auto=format&fit=crop&q=80', 'Rich espresso steamed with velvety silky milk foam & cocoa dusting', 'Publish', 6],
    ['p_vanilla_sundae', 'Vanilla Sundae', 'DES-001', '8906001', 'cat_dessert', 0, 3.50, 99999, 0, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop&q=80', 'Creamy soft vanilla bean ice cream with warm fudge drizzle', 'Publish', 5],
    ['p_bbq_bacon', 'BBQ Bacon Burger', 'BUR-008', '8901008', 'cat_burger', 0, 6.49, 99999, 0, 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500&auto=format&fit=crop&q=80', 'Charbroiled beef patty with crispy smoked bacon strips & sweet BBQ sauce', 'Publish', 4],
    ['p_onion_rings', 'Crispy Onion Rings', 'SID-002', '8904002', 'cat_sides', 0, 3.00, 99999, 0, 'https://images.unsplash.com/photo-1639024471287-035186f55480?w=500&auto=format&fit=crop&q=80', 'Beer-battered golden crisp sweet onion rings with dip', 'Publish', 3],
    ['p_iced_latte', 'Iced Caramel Latte', 'COF-002', '8905002', 'cat_coffee', 0, 4.00, 99999, 0, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=80', 'Espresso over chilled milk, ice and buttery caramel ribbon', 'Publish', 2],
    ['p_choco_brownie', 'Warm Molten Brownie', 'DES-002', '8906002', 'cat_dessert', 0, 4.50, 99999, 0, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=80', 'Warm decadent chocolate brownie served with vanilla ice cream', 'Publish', 1]
  ];

  for (const item of restaurantItems) {
    await dbQuery(`INSERT INTO products (id, name, sku, barcode, categoryId, costPrice, sellingPrice, stock, alertQty, image, tag, status, priority) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, item);
  }

  // Update default restaurant settings
  await dbQuery(`INSERT INTO settings (key_name, val) VALUES 
    ('store_name', 'ZenPos Gourmet Bistro'),
    ('store_address', 'Gulshan-2, Dhaka, Bangladesh'),
    ('store_phone', '+880 1711-000000'),
    ('store_website', 'www.zenpos.restaurant'),
    ('invoice_note', 'Thank you for dining with us! Please visit again.')
    ON DUPLICATE KEY UPDATE val = VALUES(val)`);

  await dbQuery(`UPDATE settings SET val = 'ZenPos Gourmet Bistro' WHERE key_name = 'store_name' AND val LIKE '%ClaPos%'`).catch(() => {});
  await dbQuery(`UPDATE settings SET val = 'www.zenpos.restaurant' WHERE key_name = 'store_website' AND val LIKE '%clapos%'`).catch(() => {});

  console.log('Restaurant Catalog seeding finished.');
};

initDB().catch(console.error);

// ── Authentication Middleware & Module Permissions ───
const ALL_MODULES = [
  'pos', 'sales_list',
  'products', 'tables',
  'dashboard', 'expenses', 'ingredient_costs', 'suppliers', 'reports',
  'gallery', 'customers', 'coupons', 'invoice_settings',
  'payment_methods', 'report_settings', 'users'
];

const getDefaultPermissions = (role) => {
  if (role === 'admin') return ['*'];
  if (role === 'manager') {
    return [
      'dashboard', 'pos', 'sales_list',
      'products', 'tables',
      'expenses', 'ingredient_costs', 'suppliers', 'customers', 'invoice_settings',
      'payment_methods', 'gallery', 'report_settings'
    ];
  }
  if (role === 'cashier') {
    return ['pos', 'sales_list', 'products', 'gallery'];
  }
  return [];
};

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
    let perms = [];
    if (user.permissions) {
      try { perms = JSON.parse(user.permissions); } catch (e) { perms = []; }
    }
    if (!Array.isArray(perms) || perms.length === 0) {
      perms = getDefaultPermissions(user.role);
    }
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        permissions: perms
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
      if (val !== undefined && val !== null) {
        await dbQuery(`INSERT INTO settings (key_name, val) VALUES (?, ?) ON DUPLICATE KEY UPDATE val = VALUES(val)`, [key, String(val)]);
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
    const { from, to, search } = req.query;
    let whereClauses = [];
    let params = [];

    if (from) {
      whereClauses.push(`DATE(date) >= ?`);
      params.push(from);
    }
    if (to) {
      whereClauses.push(`DATE(date) <= ?`);
      params.push(to);
    }
    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      whereClauses.push(`(LOWER(COALESCE(supplier_name, '')) LIKE ? OR LOWER(COALESCE(reason, name, '')) LIKE ? OR LOWER(COALESCE(note, '')) LIKE ?)`);
      params.push(s, s, s);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const rows = await dbQuery(`
      SELECT 
        id, 
        COALESCE(supplier_name, '') as supplier_name,
        COALESCE(reason, name, '') as reason,
        name,
        category, 
        amount, 
        COALESCE(paid_amount, CASE WHEN status='Paid' THEN amount ELSE 0 END) as paid_amount,
        DATE_FORMAT(date, '%Y-%m-%d %H:%i:%s') as date, 
        DATE_FORMAT(payment_date, '%Y-%m-%d') as payment_date,
        status, 
        image, 
        note 
      FROM expenses 
      ${whereSql}
      ORDER BY date DESC
    `, params);
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
    const formattedDate = formatToMySQLDateTime(date);
    const formattedPaymentDate = payment_date ? formatToMySQLDateOnly(payment_date) : null;
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
    const formattedDate = formatToMySQLDateTime(date);
    const formattedPaymentDate = payment_date ? formatToMySQLDateOnly(payment_date) : null;
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

// ── Ingredient Cost Endpoints (Restaurant Culinary Supplies) ──
app.get('/api/ingredient-categories', async (req, res) => {
  try {
    const rows = await dbQuery(`SELECT id, name FROM ingredient_categories ORDER BY name`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ingredient-categories', async (req, res) => {
  try {
    const { id, name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const cleanId = id || ('ing_cat_' + Math.random().toString(36).substr(2, 9));
    await dbQuery(`INSERT INTO ingredient_categories (id, name) VALUES (?, ?)`, [cleanId, name.trim()]);
    res.json({ success: true, id: cleanId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ingredient-categories/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    await dbQuery(`DELETE FROM ingredient_categories WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ingredient-costs', async (req, res) => {
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
        DATE_FORMAT(date, '%Y-%m-%d %H:%i:%s') as date, 
        DATE_FORMAT(payment_date, '%Y-%m-%d') as payment_date,
        status, 
        image, 
        note 
      FROM ingredient_costs 
      ORDER BY date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ingredient-costs', async (req, res) => {
  try {
    const { id, supplier_name, reason, name, category, amount, paid_amount, date, payment_date, status, image, note } = req.body;
    const finalReason = reason || name || '';
    const finalName = name || reason || '';
    if (!finalReason || !date || amount === undefined) {
      return res.status(400).json({ error: 'Missing ingredient cost fields' });
    }
    const formattedDate = formatToMySQLDateTime(date);
    const formattedPaymentDate = payment_date ? formatToMySQLDateOnly(payment_date) : null;
    const finalPaid = paid_amount !== undefined && paid_amount !== null ? parseFloat(paid_amount) : (status === 'Paid' ? parseFloat(amount) : 0);
    const finalStatus = status || (finalPaid >= parseFloat(amount) ? 'Paid' : (finalPaid > 0 ? 'Partial' : 'Unpaid'));

    await dbQuery(
      `INSERT INTO ingredient_costs (id, supplier_name, reason, name, category, amount, paid_amount, date, payment_date, status, image, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id || 'ing_' + Math.random().toString(36).substr(2, 9),
        supplier_name || '',
        finalReason,
        finalName,
        category || 'General',
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

app.put('/api/ingredient-costs/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const iid = req.params.id;
    const { supplier_name, reason, name, category, amount, paid_amount, date, payment_date, status, image, note } = req.body;
    const finalReason = reason || name || '';
    const finalName = name || reason || '';
    if (!finalReason || !date || amount === undefined) {
      return res.status(400).json({ error: 'Missing ingredient cost fields' });
    }
    const formattedDate = formatToMySQLDateTime(date);
    const formattedPaymentDate = payment_date ? formatToMySQLDateOnly(payment_date) : null;
    const finalPaid = paid_amount !== undefined && paid_amount !== null ? parseFloat(paid_amount) : (status === 'Paid' ? parseFloat(amount) : 0);
    const finalStatus = status || (finalPaid >= parseFloat(amount) ? 'Paid' : (finalPaid > 0 ? 'Partial' : 'Unpaid'));

    await dbQuery(`
      UPDATE ingredient_costs 
      SET supplier_name = ?, reason = ?, name = ?, category = ?, amount = ?, paid_amount = ?, date = ?, payment_date = ?, status = ?, image = ?, note = ?
      WHERE id = ?
    `, [
      supplier_name || '',
      finalReason,
      finalName,
      category || 'General',
      parseFloat(amount) || 0,
      finalPaid,
      formattedDate,
      formattedPaymentDate,
      finalStatus,
      image || '',
      note || '',
      iid
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ingredient-costs/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    await dbQuery(`DELETE FROM ingredient_costs WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Expired & Waste Endpoints ────────────────────────────────
app.get('/api/expired-wastes', async (req, res) => {
  try {
    const rows = await dbQuery(`
      SELECT 
        id, 
        itemName, 
        quantity, 
        costPrice, 
        totalCost, 
        COALESCE(supplierName, '') as supplierName, 
        COALESCE(compensationAmount, 0) as compensationAmount, 
        COALESCE(note, '') as note, 
        DATE_FORMAT(date, '%Y-%m-%d %H:%i:%s') as date, 
        created_at 
      FROM expired_wastes 
      ORDER BY date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expired-wastes', async (req, res) => {
  try {
    const { id, itemName, quantity, costPrice, supplierName, compensationAmount, note, date } = req.body;
    if (!itemName || quantity === undefined || costPrice === undefined) {
      return res.status(400).json({ error: 'Item name, quantity and cost price are required' });
    }
    const finalId = id || ('ew-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6));
    const qty = parseFloat(quantity) || 0;
    const cost = parseFloat(costPrice) || 0;
    const total = qty * cost;
    const comp = parseFloat(compensationAmount) || 0;
    const formattedDate = date ? formatToMySQLDateTime(date) : new Date().toISOString().slice(0, 19).replace('T', ' ');

    await dbQuery(`
      INSERT INTO expired_wastes (id, itemName, quantity, costPrice, totalCost, supplierName, compensationAmount, note, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [finalId, itemName, qty, cost, total, supplierName || '', comp, note || '', formattedDate]);

    res.json({ success: true, id: finalId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/expired-wastes/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const { itemName, quantity, costPrice, supplierName, compensationAmount, note, date } = req.body;
    if (!itemName || quantity === undefined || costPrice === undefined) {
      return res.status(400).json({ error: 'Item name, quantity and cost price are required' });
    }
    const qty = parseFloat(quantity) || 0;
    const cost = parseFloat(costPrice) || 0;
    const total = qty * cost;
    const comp = parseFloat(compensationAmount) || 0;
    const formattedDate = date ? formatToMySQLDateTime(date) : null;

    let updateSql = `
      UPDATE expired_wastes 
      SET itemName = ?, quantity = ?, costPrice = ?, totalCost = ?, supplierName = ?, compensationAmount = ?, note = ?
    `;
    const params = [itemName, qty, cost, total, supplierName || '', comp, note || ''];
    if (formattedDate) {
      updateSql += `, date = ?`;
      params.push(formattedDate);
    }
    updateSql += ` WHERE id = ?`;
    params.push(req.params.id);

    await dbQuery(updateSql, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expired-wastes/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    await dbQuery(`DELETE FROM expired_wastes WHERE id = ?`, [req.params.id]);
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
        DATE_FORMAT(date, '%Y-%m-%d %H:%i:%s') as date, 
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
    const formattedDate = formatToMySQLDateTime(date);
    const formattedPaymentDate = payment_date ? formatToMySQLDateOnly(payment_date) : null;
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
    const formattedDate = formatToMySQLDateTime(date);
    const formattedPaymentDate = payment_date ? formatToMySQLDateOnly(payment_date) : null;
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
    const cleanName = name.trim();

    // Look up previous name for cascading update
    const existingRows = await dbQuery(`SELECT name FROM payment_methods WHERE id = ?`, [id]);
    const oldName = existingRows && existingRows[0] ? existingRows[0].name : null;

    await dbQuery(`UPDATE payment_methods SET name = ?, icon = ?, color = ?, status = ?, sort_order = ? WHERE id = ?`,
      [cleanName, icon || '', color || '#64748B', status || 'active', parseInt(sortOrder) || 0, id]);

    // If payment method was renamed, cascade rename to all historical payments
    if (oldName && oldName.toLowerCase() !== cleanName.toLowerCase()) {
      await dbQuery(`UPDATE payments SET method = ? WHERE LOWER(method) = LOWER(?)`, [cleanName, oldName]);
      console.log(`[Payment Method Cascade] Renamed method from "${oldName}" to "${cleanName}" across payments table.`);
    }

    res.json({ success: true, oldName, newName: cleanName });
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
    const rows = await dbQuery(`SELECT id, username, name, role, email, permissions FROM users ORDER BY name`);
    const users = rows.map(u => {
      let perms = [];
      if (u.permissions) {
        try { perms = JSON.parse(u.permissions); } catch (e) { perms = []; }
      }
      if (!Array.isArray(perms) || perms.length === 0) {
        perms = getDefaultPermissions(u.role);
      }
      return {
        ...u,
        permissions: perms
      };
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', verifyRole(['admin']), async (req, res) => {
  try {
    const { id, username, password, name, role, email, permissions } = req.body;
    const permsJson = JSON.stringify(Array.isArray(permissions) ? permissions : getDefaultPermissions(role));
    await dbQuery(`INSERT INTO users (id, username, password, name, role, email, permissions) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, username, password, name, role, email || null, permsJson]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', verifyRole(['admin']), async (req, res) => {
  try {
    const uid = req.params.id;
    const { username, password, name, role, email, permissions } = req.body;
    const permsJson = JSON.stringify(Array.isArray(permissions) ? permissions : getDefaultPermissions(role));
    if (password) {
      await dbQuery(`UPDATE users SET username = ?, password = ?, name = ?, role = ?, email = ?, permissions = ? WHERE id = ?`,
        [username, password, name, role, email || null, permsJson, uid]);
    } else {
      await dbQuery(`UPDATE users SET username = ?, name = ?, role = ?, email = ?, permissions = ? WHERE id = ?`,
        [username, name, role, email || null, permsJson, uid]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', verifyRole(['admin']), async (req, res) => {
  try {
    const uid = req.params.id;
    const rows = await dbQuery(`SELECT id, role, name FROM users WHERE id = ?`, [uid]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const targetUser = rows[0];

    // Any admin is deletable, BUT the last remaining administrator cannot be deleted
    if (targetUser.role === 'admin') {
      const adminCountRows = await dbQuery(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`);
      const adminCount = (adminCountRows && adminCountRows[0]) ? adminCountRows[0].count : 0;
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'The last remaining administrator cannot be deleted. The system must retain at least one admin account.' });
      }
    }

    await dbQuery(`DELETE FROM users WHERE id = ?`, [uid]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Gallery Management ──────────────────────────────────────
app.get('/api/gallery/folders', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const rows = await dbQuery(`
      SELECT f.id, f.name, f.created_at, 
             (SELECT COUNT(*) FROM gallery_images i WHERE i.folder_id = f.id) as imageCount 
      FROM gallery_folders f 
      ORDER BY f.created_at ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gallery/folders', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    const cleanName = name.trim();
    const id = 'gf_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    await dbQuery(`INSERT INTO gallery_folders (id, name) VALUES (?, ?)`, [id, cleanName]);
    res.json({ success: true, folder: { id, name: cleanName, imageCount: 0 } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/gallery/folders/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const fid = req.params.id;
    if (fid === 'default') {
      return res.status(400).json({ error: 'Cannot delete the default folder' });
    }
    // Move any images from this folder to the default folder
    await dbQuery(`UPDATE gallery_images SET folder_id = 'default' WHERE folder_id = ?`, [fid]);
    await dbQuery(`DELETE FROM gallery_folders WHERE id = ?`, [fid]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gallery/images', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const folderId = req.query.folderId;
    let sql = `SELECT id, folder_id, name, data, size, DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.000Z') as created_at FROM gallery_images`;
    const params = [];
    if (folderId && folderId !== 'all') {
      sql += ` WHERE folder_id = ?`;
      params.push(folderId);
    }
    sql += ` ORDER BY created_at DESC`;
    const rows = await dbQuery(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gallery/images', async (req, res) => {
  try {
    const { folder_id, name, data, size } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Image data is required' });
    }
    const id = 'gimg_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const folderId = folder_id || 'default';
    const imgName = name || ('Photo_' + Date.now().toString(36));
    await dbQuery(`INSERT INTO gallery_images (id, folder_id, name, data, size) VALUES (?, ?, ?, ?, ?)`,
      [id, folderId, imgName, data, size || null]);
    res.json({ success: true, image: { id, folder_id: folderId, name: imgName, data, size } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/gallery/images/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const id = req.params.id;
    await dbQuery(`DELETE FROM gallery_images WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/gallery/images/:id/move', async (req, res) => {
  try {
    const id = req.params.id;
    const { folder_id } = req.body;
    if (!folder_id) {
      return res.status(400).json({ error: 'Target folder is required' });
    }
    await dbQuery(`UPDATE gallery_images SET folder_id = ? WHERE id = ?`, [folder_id, id]);
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
    const { id, name, icon, image } = req.body;
    await dbQuery(`INSERT INTO categories (id, name, icon, image) VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name), icon = VALUES(icon), image = VALUES(image)`,
      [id, name, icon || null, image || null]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const cid = req.params.id;
    const { name, icon, image } = req.body;
    await dbQuery(`UPDATE categories SET name = ?, icon = ?, image = ? WHERE id = ?`,
      [name, icon || null, image || null, cid]);
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

// ── Restaurant Dining Tables Management ───────────────────
app.get('/api/tables', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const rows = await dbQuery(`SELECT * FROM restaurant_tables ORDER BY sort_order ASC, name ASC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tables', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id, name, zone, seats, sort_order, status } = req.body;
    const tid = id || ('tbl_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4));
    await dbQuery(`INSERT INTO restaurant_tables (id, name, zone, seats, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name), zone = VALUES(zone), seats = VALUES(seats), sort_order = VALUES(sort_order), status = VALUES(status)`,
      [tid, name, zone || 'Main Dining', parseInt(seats) || 4, parseInt(sort_order) || 1, status || 'active']);
    res.json({ success: true, table: { id: tid, name, zone, seats, sort_order, status } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tables/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const tid = req.params.id;
    const { name, zone, seats, sort_order, status } = req.body;
    await dbQuery(`UPDATE restaurant_tables SET name = ?, zone = ?, seats = ?, sort_order = ?, status = ? WHERE id = ?`,
      [name, zone || 'Main Dining', parseInt(seats) || 4, parseInt(sort_order) || 1, status || 'active', tid]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tables/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const tid = req.params.id;
    await dbQuery(`DELETE FROM restaurant_tables WHERE id = ?`, [tid]);
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
      sql += ` AND (p.status != 'Trash' OR p.status IS NULL)`;
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
    console.error('Error in /api/products/search:', err);
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
      const isAll = req.query.limit === 'all';
      const limit = isAll ? 100000 : Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100000);
      const offset = isAll ? 0 : (page - 1) * limit;

      const tab = req.query.tab || req.query.status || 'all';
      const search = (req.query.search || req.query.q || '').toString().trim();
      const genericFilter = (req.query.generic || '').toString().trim();
      const categoryFilter = (req.query.category || req.query.categoryId || '').toString().trim();

      let whereClauses = [];
      let queryParams = [];

      // 1. Tab filtering in MySQL (Clean status check, immune to zero-date and timestamp bugs)
      if (tab === 'Trash') {
        whereClauses.push(`p.status = 'Trash'`);
      } else if (tab === 'Draft') {
        whereClauses.push(`p.status = 'Draft'`);
      } else if (tab === 'Publish') {
        whereClauses.push(`(p.status = 'Publish' OR p.status IS NULL OR p.status = '' OR p.status = 'active')`);
      } else {
        // tab === 'all'
        whereClauses.push(`(p.status != 'Trash' OR p.status IS NULL)`);
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
      const [allCountRow] = await dbQuery(`SELECT COUNT(*) as c FROM products WHERE (status != 'Trash' OR status IS NULL)`);
      const [pubCountRow] = await dbQuery(`SELECT COUNT(*) as c FROM products WHERE (status = 'Publish' OR status IS NULL OR status = '' OR status = 'active')`);
      const [draftCountRow] = await dbQuery(`SELECT COUNT(*) as c FROM products WHERE status = 'Draft'`);
      const [trashCountRow] = await dbQuery(`SELECT COUNT(*) as c FROM products WHERE status = 'Trash'`);

      // Filtered total count
      const countSql = `SELECT COUNT(*) as total FROM products p ${whereSql}`;
      const [totalRow] = await dbQuery(countSql, queryParams);
      const total = totalRow ? totalRow.total : 0;
      const totalPages = Math.ceil(total / limit) || 1;

      // Paginated items query organized by add date (newest first)
      const itemsSql = `SELECT p.* FROM products p ${whereSql} ORDER BY p.createdAt DESC, p.id DESC LIMIT ${limit} OFFSET ${offset}`;
      const items = await dbQuery(itemsSql, queryParams);

      if (items.length > 0) {
        try {
          const pids = items.map(p => p.id);
          const placeholders = pids.map(() => '?').join(',');
          const variations = await dbQuery(`SELECT * FROM variations WHERE productId IN (${placeholders})`, pids);
          const varMap = new Map();
          for (let i = 0; i < variations.length; i++) {
            const v = variations[i];
            if (!varMap.has(v.productId)) varMap.set(v.productId, []);
            varMap.get(v.productId).push(v);
          }
          items.forEach(p => {
            p.variations = varMap.get(p.id) || [];
          });
        } catch (vErr) {
          console.warn('Variations load notice for paginated products:', vErr.message);
          items.forEach(p => { p.variations = p.variations || []; });
        }
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
      if (statusFilter === 'Trash') {
        sql += ` WHERE p.status = 'Trash'`;
      } else if (statusFilter) {
        sql += ` WHERE p.status = ?`;
        params.push(statusFilter);
      } else {
        sql += ` WHERE (p.status != 'Trash' OR p.status IS NULL)`;
      }
    } else {
      if (statusFilter === 'Trash') {
        sql += ` WHERE p.status = 'Trash'`;
      } else if (statusFilter) {
        sql += ` WHERE p.status = ?`;
        params.push(statusFilter);
      }
    }

    sql += ` ORDER BY p.createdAt DESC, p.id DESC`;

    const prods = await dbQuery(sql, params);
    
    // Attach variations safely
    if (prods.length > 0) {
      try {
        let vars = [];
        if (prods.length <= 500) {
          const pids = prods.map(p => p.id);
          const placeholders = pids.map(() => '?').join(',');
          vars = await dbQuery(`SELECT * FROM variations WHERE productId IN (${placeholders})`, pids);
        } else {
          vars = await dbQuery(`SELECT * FROM variations`);
        }
        const varMap = new Map();
        for (let i = 0; i < vars.length; i++) {
          const v = vars[i];
          if (!varMap.has(v.productId)) varMap.set(v.productId, []);
          varMap.get(v.productId).push(v);
        }
        for (let i = 0; i < prods.length; i++) {
          prods[i].variations = varMap.get(prods[i].id) || [];
        }
      } catch (vErr) {
        console.warn('Variations load notice for full products list:', vErr.message);
        prods.forEach(p => { p.variations = p.variations || []; });
      }
    }

    res.json(prods);
  } catch (err) {
    console.error('Error in /api/products:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ── Database Diagnostics & Self-Healing Endpoint (Public, Accessible in Browser) ──
app.all(['/api/system/fix-products', '/api/debug/fix-products'], async (req, res) => {
  try {
    const results = [];
    
    // 1. Check and add columns
    const cols = await dbQuery(`SHOW COLUMNS FROM products`);
    const colNames = new Set((cols || []).map(c => c.Field));

    const addCol = async (field, typeDef) => {
      if (!colNames.has(field)) {
        try {
          await dbQuery(`ALTER TABLE products ADD COLUMN ${field} ${typeDef}`);
          results.push(`Added missing column: ${field}`);
        } catch (e) {
          results.push(`Could not add column ${field}: ${e.message}`);
        }
      }
    };

    await addCol('image', 'LONGTEXT');
    await addCol('tag', 'VARCHAR(255) DEFAULT NULL');
    await addCol('createdAt', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
    await addCol('generic', 'VARCHAR(255) DEFAULT NULL');
    await addCol('brand', 'VARCHAR(255) DEFAULT NULL');
    await addCol('strength', 'VARCHAR(100) DEFAULT NULL');
    await addCol('category', 'VARCHAR(100) DEFAULT NULL');
    await addCol('status', "VARCHAR(50) NOT NULL DEFAULT 'Publish'");
    await addCol('deletedAt', 'DATETIME NULL DEFAULT NULL');
    await addCol('priority', 'INT NOT NULL DEFAULT 0');

    // 2. Ensure deletedAt is nullable
    try {
      await dbQuery(`ALTER TABLE products MODIFY COLUMN deletedAt DATETIME NULL DEFAULT NULL`);
      results.push('Ensured deletedAt column is NULLABLE');
    } catch (e) {
      results.push(`ALTER deletedAt notice: ${e.message}`);
    }

    // 3. Reset timestamps and ensure Publish status
    try {
      const r1 = await dbQuery(`UPDATE products SET deletedAt = NULL WHERE status != 'Trash' OR status IS NULL OR status = ''`);
      results.push(`Reset deletedAt = NULL for active products (Affected: ${r1.affectedRows || 0})`);
    } catch (e) {
      results.push(`Update deletedAt notice: ${e.message}`);
    }

    try {
      const r2 = await dbQuery(`UPDATE products SET status = 'Publish' WHERE status IS NULL OR status = '' OR status = 'active'`);
      results.push(`Normalized status = 'Publish' (Affected: ${r2.affectedRows || 0})`);
    } catch (e) {
      results.push(`Update status notice: ${e.message}`);
    }

    // 4. Verification counts
    const [totalRow] = await dbQuery(`SELECT COUNT(*) as c FROM products`);
    const [activeRow] = await dbQuery(`SELECT COUNT(*) as c FROM products WHERE status != 'Trash' OR status IS NULL`);
    const [trashRow] = await dbQuery(`SELECT COUNT(*) as c FROM products WHERE status = 'Trash'`);
    const sample = await dbQuery(`SELECT id, name, sku, stock, costPrice, sellingPrice, status, deletedAt FROM products LIMIT 5`);

    res.json({
      success: true,
      message: 'Product database self-healing completed successfully!',
      timestamp: new Date().toISOString(),
      counts: {
        totalProducts: totalRow ? totalRow.c : 0,
        activeProducts: activeRow ? activeRow.c : 0,
        trashedProducts: trashRow ? trashRow.c : 0
      },
      diagnosticLog: results,
      sampleProducts: sample
    });
  } catch (err) {
    console.error('Error in /api/system/fix-products:', err);
    res.status(500).json({ success: false, error: err.message, stack: err.stack });
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

// ── Bulk Status Update (Publish, Draft, Trash) ────
app.post('/api/products/bulk-status', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required and must not be empty' });
    }

    const validStatuses = ['Publish', 'Draft', 'Trash'];
    const targetStatus = validStatuses.includes(status) ? status : 'Publish';

    const placeholders = ids.map(() => '?').join(',');
    if (targetStatus === 'Trash') {
      const nowVal = getBangladeshDateTimeString(new Date());
      await dbQuery(
        `UPDATE products SET status = 'Trash', deletedAt = ? WHERE id IN (${placeholders})`,
        [nowVal, ...ids]
      );
    } else {
      await dbQuery(
        `UPDATE products SET status = ?, deletedAt = NULL WHERE id IN (${placeholders})`,
        [targetStatus, ...ids]
      );
    }

    res.json({ success: true, updatedCount: ids.length, status: targetStatus });
  } catch (err) {
    console.error('Error in /api/products/bulk-status:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Import Products with Duplicate Name Detection & Auto-Update ──
app.post('/api/products/import', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Body must be a non-empty array of products' });
    }

    let addedCount = 0;
    let updatedCount = 0;
    const results = [];

    // Pre-cache all categories for fast lookup
    const catRows = await dbQuery(`SELECT id, name FROM categories`);
    const catMap = new Map();
    for (const c of catRows) {
      if (c.name) catMap.set(c.name.trim().toLowerCase(), c.id);
    }

    for (const raw of items) {
      const name = (raw.name || raw.itemName || raw.dishName || raw.dish || '').toString().trim();
      if (!name) continue; // Skip items without a name

      const categoryName = (raw.category || raw.categoryName || 'Starters & Appetizers').toString().trim();
      const sellingPrice = parseFloat(raw.sellingPrice !== undefined ? raw.sellingPrice : (raw.price !== undefined ? raw.price : 0)) || 0;
      const description = (raw.description !== undefined ? raw.description : (raw.tag || '')).toString().trim();

      // Normalize status
      let status = (raw.status || 'Publish').toString().trim();
      const statusLower = status.toLowerCase();
      if (statusLower === 'draft' || statusLower === 'inactive') {
        status = 'Draft';
      } else if (statusLower === 'trash' || statusLower === 'deleted') {
        status = 'Trash';
      } else {
        status = 'Publish';
      }

      const priority = parseInt(raw.priority) || 10;
      const image = (raw.image || raw.imageUrl || raw.image_url || '').toString().trim();

      // Find or create category
      let categoryId = 'cat_mains';
      if (categoryName) {
        const catKey = categoryName.toLowerCase();
        if (catMap.has(catKey)) {
          categoryId = catMap.get(catKey);
        } else {
          categoryId = 'cat_' + Math.random().toString(36).substr(2, 9);
          await dbQuery(`INSERT INTO categories (id, name, icon) VALUES (?, ?, '🍽️')`, [categoryId, categoryName]);
          catMap.set(catKey, categoryId);
        }
      }

      // Check duplicate by name (case-insensitive)
      const existing = await dbQuery(
        `SELECT id, name, sku, image FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1`,
        [name]
      );

      if (existing.length > 0) {
        // Edit existing product!
        const prod = existing[0];
        const finalImage = image || prod.image || null;
        await dbQuery(
          `UPDATE products SET 
            categoryId = ?, 
            category = ?, 
            sellingPrice = ?, 
            tag = ?, 
            description = ?, 
            status = ?, 
            priority = ?, 
            image = ? 
           WHERE id = ?`,
          [categoryId, categoryName, sellingPrice, description, description, status, priority, finalImage, prod.id]
        );
        updatedCount++;
        results.push({ id: prod.id, name, action: 'updated', status });
      } else {
        // Insert new product!
        const newId = 'prod_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        const newSku = 'DISH-' + Math.floor(1000 + Math.random() * 9000);
        await dbQuery(
          `INSERT INTO products (id, name, sku, barcode, categoryId, category, costPrice, sellingPrice, stock, alertQty, image, tag, description, status, priority)
           VALUES (?, ?, ?, ?, ?, ?, 0.00, ?, 99999, 0, ?, ?, ?, ?, ?)`,
          [newId, name, newSku, newSku, categoryId, categoryName, sellingPrice, image || null, description, description, status, priority]
        );
        addedCount++;
        results.push({ id: newId, name, action: 'added', status });
      }
    }

    res.json({
      success: true,
      total: items.length,
      added: addedCount,
      updated: updatedCount,
      results
    });
  } catch (err) {
    console.error('Error in /api/products/import:', err);
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
      const nowVal = getBangladeshDateTimeString(new Date());
      await dbQuery(`UPDATE products SET status = 'Trash', deletedAt = ? WHERE id = ?`, [nowVal, pid]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error moving product to trash:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products/:id/restore', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const pid = req.params.id;
    await dbQuery(`UPDATE products SET status = 'Publish', deletedAt = NULL WHERE id = ?`, [pid]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error restoring product:', err);
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
    const { search, limit } = req.query;
    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      const maxLimit = Math.min(parseInt(limit) || 20, 50);
      const rows = await dbQuery(
        `SELECT id, name, phone, email, label, customDiscount, address 
         FROM customers 
         WHERE LOWER(name) LIKE ? OR phone LIKE ? 
         ORDER BY name 
         LIMIT ?`,
        [s, s, maxLimit]
      );
      return res.json(rows);
    }
    const rows = await dbQuery(`SELECT * FROM customers ORDER BY name`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    let { id, name, phone, email, label, customDiscount, address } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    const cleanName = name.trim();
    const cleanPhone = (phone || '').trim();
    if (!id) {
      id = 'c_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    }

    // Deduplicate by phone if phone is provided
    if (cleanPhone) {
      const existing = await dbQuery(`SELECT id FROM customers WHERE phone = ? LIMIT 1`, [cleanPhone]);
      if (existing && existing.length > 0) {
        await dbQuery(`UPDATE customers SET name = ?, email = COALESCE(?, email), label = COALESCE(?, label), customDiscount = COALESCE(?, customDiscount), address = COALESCE(?, address) WHERE id = ?`,
          [cleanName, email || null, label || null, customDiscount !== undefined ? parseFloat(customDiscount) : null, address || null, existing[0].id]);
        return res.json({ success: true, id: existing[0].id, updated: true });
      }
    }

    await dbQuery(`INSERT INTO customers (id, name, phone, email, label, customDiscount, address) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`, 
      [id, cleanName, cleanPhone || null, email || null, label || 'Regular', parseFloat(customDiscount) || 0.00, address || null]);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Instant customer save from New Order
app.post('/api/customers/quick-save', async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    const cleanName = name.trim();
    const cleanPhone = (phone || '').trim();

    if (cleanPhone) {
      const existing = await dbQuery(`SELECT id, name, phone FROM customers WHERE phone = ? LIMIT 1`, [cleanPhone]);
      if (existing && existing.length > 0) {
        await dbQuery(`UPDATE customers SET name = ? WHERE id = ?`, [cleanName, existing[0].id]);
        return res.json({ success: true, customer: { id: existing[0].id, name: cleanName, phone: cleanPhone } });
      }
    }

    const newId = 'c_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    await dbQuery(`INSERT INTO customers (id, name, phone, label, customDiscount) VALUES (?, ?, ?, 'Regular', 0.00)`,
      [newId, cleanName, cleanPhone || null]);
    res.json({ success: true, customer: { id: newId, name: cleanName, phone: cleanPhone } });
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

// Orders - High-speed Server-side Indexed Querying & Search
app.get('/api/orders', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const { from, to, search, paymentMethod, minTotal, maxTotal, page, limit } = req.query;

    let whereClauses = [];
    let queryParams = [];

    // Date range filter
    if (from) {
      whereClauses.push(`DATE(o.date) >= ?`);
      queryParams.push(from);
    }
    if (to) {
      whereClauses.push(`DATE(o.date) <= ?`);
      queryParams.push(to);
    }

    // Grand total range
    if (minTotal !== undefined && minTotal !== '') {
      whereClauses.push(`o.grandTotal >= ?`);
      queryParams.push(parseFloat(minTotal) || 0);
    }
    if (maxTotal !== undefined && maxTotal !== '') {
      whereClauses.push(`o.grandTotal <= ?`);
      queryParams.push(parseFloat(maxTotal) || 0);
    }

    // Payment method filter
    if (paymentMethod && paymentMethod !== 'all') {
      whereClauses.push(`EXISTS (SELECT 1 FROM payments p WHERE p.orderId = o.id AND LOWER(p.method) = LOWER(?))`);
      queryParams.push(paymentMethod);
    }

    // Search filter across invoice, customer name, phone, table, order type, AND sold product name
    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      whereClauses.push(`(
        LOWER(o.invoiceId) LIKE ? OR
        LOWER(COALESCE(o.customerName, '')) LIKE ? OR
        LOWER(COALESCE(o.customerPhone, '')) LIKE ? OR
        LOWER(COALESCE(o.tableName, '')) LIKE ? OR
        LOWER(COALESCE(o.orderType, '')) LIKE ? OR
        EXISTS (SELECT 1 FROM orderItems oi WHERE oi.orderId = o.id AND LOWER(oi.productName) LIKE ?)
      )`);
      queryParams.push(s, s, s, s, s, s);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Calculate aggregated metrics on MySQL side
    const summaryRows = await dbQuery(
      `SELECT COUNT(*) AS totalOrders, COALESCE(SUM(grandTotal), 0) AS totalSalesAmount FROM orders o ${whereSql}`,
      queryParams
    );
    const summary = summaryRows && summaryRows[0] ? summaryRows[0] : { totalOrders: 0, totalSalesAmount: 0 };

    // Also get today's total sales
    const todayStr = getBangladeshDateOnlyString(new Date());
    const todayRows = await dbQuery(
      `SELECT COUNT(*) AS todayOrders, COALESCE(SUM(grandTotal), 0) AS todaySalesAmount FROM orders WHERE DATE(date) = ? AND (status IS NULL OR status NOT IN ('cancelled', 'void'))`,
      [todayStr]
    );
    const todaySummary = todayRows && todayRows[0] ? todayRows[0] : { todayOrders: 0, todaySalesAmount: 0 };

    // Check pagination
    const isPaginated = page !== undefined || (limit !== undefined && limit !== 'all');
    let limitSql = '';
    if (isPaginated && limit !== 'all') {
      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 1000);
      const offset = (pageNum - 1) * limitNum;
      limitSql = `LIMIT ${limitNum} OFFSET ${offset}`;
    }

    // Retrieve order list with attached payments summary
    const sql = `
      SELECT 
        o.id, 
        o.invoiceId, 
        o.customerId, 
        o.customerName, 
        o.customerPhone, 
        DATE_FORMAT(o.date, '%Y-%m-%d %H:%i:%s') as date, 
        o.subtotal, 
        o.discountType, 
        o.discountValue, 
        o.discountAmount, 
        o.taxPercent, 
        o.taxAmount, 
        o.grandTotal, 
        o.paidAmount, 
        o.dueAmount, 
        o.returnedAmount, 
        o.status, 
        COALESCE(o.orderType, 'Dine In') as orderType, 
        COALESCE(o.tableName, 'Table 01') as tableName, 
        COALESCE(o.tokenNo, 1) as tokenNo,
        (
          SELECT GROUP_CONCAT(CONCAT(p.method, ':', p.amount, IF(p.lastFour IS NOT NULL AND p.lastFour != '', CONCAT(' (', p.lastFour, ')'), '')) SEPARATOR '; ')
          FROM payments p WHERE p.orderId = o.id
        ) AS paymentMethodsSummary
      FROM orders o
      ${whereSql}
      ORDER BY o.date DESC
      ${limitSql}
    `;

    const rows = await dbQuery(sql, queryParams);

    if (req.query.withSummary === 'true') {
      return res.json({
        orders: rows,
        totalOrders: Number(summary.totalOrders) || 0,
        totalSalesAmount: parseFloat(summary.totalSalesAmount) || 0,
        todayOrders: Number(todaySummary.todayOrders) || 0,
        todaySalesAmount: parseFloat(todaySummary.todaySalesAmount) || 0
      });
    }

    // Attach headers and return rows
    res.setHeader('x-total-sales', String(summary.totalSalesAmount || 0));
    res.setHeader('x-total-orders', String(summary.totalOrders || 0));
    res.setHeader('x-today-sales', String(todaySummary.todaySalesAmount || 0));
    res.setHeader('x-today-orders', String(todaySummary.todayOrders || 0));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fast Order Metrics Endpoint (Calculates in 1 millisecond on MySQL)
app.get('/api/orders/metrics', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const { from, to, search, paymentMethod } = req.query;
    const todayStr = getBangladeshDateOnlyString(new Date());

    // 1. Today's sales
    const todayRows = await dbQuery(
      `SELECT COUNT(*) AS count, COALESCE(SUM(grandTotal), 0) AS total FROM orders WHERE DATE(date) = ? AND (status IS NULL OR status NOT IN ('cancelled', 'void'))`,
      [todayStr]
    );

    // 2. Filtered range sales
    let whereClauses = ["(status IS NULL OR status NOT IN ('cancelled', 'void'))"];
    let params = [];
    if (from) {
      whereClauses.push(`DATE(date) >= ?`);
      params.push(from);
    }
    if (to) {
      whereClauses.push(`DATE(date) <= ?`);
      params.push(to);
    }
    if (paymentMethod && paymentMethod !== 'all') {
      whereClauses.push(`EXISTS (SELECT 1 FROM payments p WHERE p.orderId = orders.id AND LOWER(p.method) = LOWER(?))`);
      params.push(paymentMethod);
    }
    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      whereClauses.push(`(
        LOWER(invoiceId) LIKE ? OR
        LOWER(COALESCE(customerName, '')) LIKE ? OR
        LOWER(COALESCE(customerPhone, '')) LIKE ? OR
        LOWER(COALESCE(tableName, '')) LIKE ? OR
        EXISTS (SELECT 1 FROM orderItems oi WHERE oi.orderId = orders.id AND LOWER(oi.productName) LIKE ?)
      )`);
      params.push(s, s, s, s, s);
    }

    const filteredRows = await dbQuery(
      `SELECT COUNT(*) AS count, COALESCE(SUM(grandTotal), 0) AS total FROM orders WHERE ${whereClauses.join(' AND ')}`,
      params
    );

    const todayR = todayRows && todayRows[0] ? todayRows[0] : { count: 0, total: 0 };
    const filteredR = filteredRows && filteredRows[0] ? filteredRows[0] : { count: 0, total: 0 };

    res.json({
      todaySales: parseFloat(todayR.total) || 0,
      todayOrders: Number(todayR.count) || 0,
      filteredSales: parseFloat(filteredR.total) || 0,
      filteredOrders: Number(filteredR.count) || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fast Server-side Dashboard Metrics Aggregation Endpoint (Under 5ms)
app.get('/api/dashboard/metrics', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const today = getBangladeshDateOnlyString(new Date());
    const from = req.query.from || today;
    const to = req.query.to || today;

    const [
      salesRows,
      ingCostRows,
      wasteRows,
      expenseRows,
      supplierRows,
      unitsRows,
      paymentsRows
    ] = await Promise.all([
      // 1. Sales & Revenue
      dbQuery(
        `SELECT 
           COALESCE(SUM(grandTotal), 0) AS totalSales, 
           COUNT(*) AS orderCount, 
           COALESCE(AVG(grandTotal), 0) AS aov 
         FROM orders 
         WHERE DATE(date) >= ? AND DATE(date) <= ? AND (status IS NULL OR status NOT IN ('cancelled', 'void'))`,
        [from, to]
      ),
      // 2. Ingredient Costs
      dbQuery(
        `SELECT 
           COALESCE(SUM(amount), 0) AS totalAmount, 
           COALESCE(SUM(paid_amount), 0) AS paidAmount, 
           COUNT(*) AS count 
         FROM ingredient_costs 
         WHERE DATE(date) >= ? AND DATE(date) <= ?`,
        [from, to]
      ),
      // 3. Expired & Waste
      dbQuery(
        `SELECT 
           COALESCE(SUM(totalCost), 0) AS totalCost, 
           COALESCE(SUM(compensationAmount), 0) AS totalCompensation, 
           COALESCE(SUM(quantity), 0) AS totalQuantity, 
           COUNT(*) AS count 
         FROM expired_wastes 
         WHERE DATE(date) >= ? AND DATE(date) <= ?`,
        [from, to]
      ),
      // 4. Expenses
      dbQuery(
        `SELECT 
           COALESCE(SUM(amount), 0) AS totalAmount, 
           COALESCE(SUM(paid_amount), 0) AS paidAmount, 
           COUNT(*) AS count 
         FROM expenses 
         WHERE DATE(date) >= ? AND DATE(date) <= ?`,
        [from, to]
      ),
      // 5. Supplier Payments
      dbQuery(
        `SELECT 
           COALESCE(SUM(amount), 0) AS totalAmount, 
           COALESCE(SUM(paid_amount), 0) AS paidAmount, 
           COUNT(*) AS count 
         FROM supplier_payments 
         WHERE DATE(date) >= ? AND DATE(date) <= ?`,
        [from, to]
      ),
      // 6. Units Sold & Unique SKUs
      dbQuery(
        `SELECT 
           COALESCE(SUM(oi.qty), 0) AS totalUnits, 
           COUNT(DISTINCT oi.productId) AS uniqueSkus 
         FROM orderItems oi 
         INNER JOIN orders o ON oi.orderId = o.id 
         WHERE DATE(o.date) >= ? AND DATE(o.date) <= ? AND (o.status IS NULL OR o.status NOT IN ('cancelled', 'void'))`,
        [from, to]
      ),
      // 7. Payment breakdown
      dbQuery(
        `SELECT 
           p.method, 
           COALESCE(SUM(p.amount), 0) AS totalAmount, 
           COUNT(*) AS count 
         FROM payments p 
         INNER JOIN orders o ON p.orderId = o.id 
         WHERE DATE(o.date) >= ? AND DATE(o.date) <= ? AND (o.status IS NULL OR o.status NOT IN ('cancelled', 'void')) 
         GROUP BY p.method`,
        [from, to]
      )
    ]);

    const sales = salesRows[0] || {};
    const ing = ingCostRows[0] || {};
    const waste = wasteRows[0] || {};
    const exp = expenseRows[0] || {};
    const sup = supplierRows[0] || {};
    const units = unitsRows[0] || {};

    const totalSales = parseFloat(sales.totalSales) || 0;
    const orderCount = parseInt(sales.orderCount) || 0;
    const aov = parseFloat(sales.aov) || 0;

    const totalIngredientCost = parseFloat(ing.totalAmount) || 0;
    const paidIngredientCost = parseFloat(ing.paidAmount) || 0;
    const unpaidIngredientCost = Math.max(0, totalIngredientCost - paidIngredientCost);

    const totalWasteCost = parseFloat(waste.totalCost) || 0;
    const totalCompensation = parseFloat(waste.totalCompensation) || 0;
    const netWasteLoss = Math.max(0, totalWasteCost - totalCompensation);
    const wasteQuantity = parseFloat(waste.totalQuantity) || 0;
    const wasteCount = parseInt(waste.count) || 0;

    const totalExpenses = parseFloat(exp.totalAmount) || 0;
    const paidExpenses = parseFloat(exp.paidAmount) || 0;
    const unpaidExpenses = Math.max(0, totalExpenses - paidExpenses);

    const totalSupplierPayments = parseFloat(sup.totalAmount) || 0;
    const paidSupplierPayments = parseFloat(sup.paidAmount) || 0;
    const unpaidSupplierPayments = Math.max(0, totalSupplierPayments - paidSupplierPayments);

    const totalUnitsSold = parseInt(units.totalUnits) || 0;
    const uniqueSkusSold = parseInt(units.uniqueSkus) || 0;

    const paymentBreakdown = {};
    const paymentCount = {};
    (paymentsRows || []).forEach(r => {
      paymentBreakdown[r.method] = parseFloat(r.totalAmount) || 0;
      paymentCount[r.method] = parseInt(r.count) || 0;
    });

    res.json({
      from,
      to,
      totalSales,
      orderCount,
      aov,
      totalIngredientCost,
      paidIngredientCost,
      unpaidIngredientCost,
      totalWasteCost,
      totalCompensation,
      netWasteLoss,
      wasteQuantity,
      wasteCount,
      totalExpenses,
      paidExpenses,
      unpaidExpenses,
      totalSupplierPayments,
      paidSupplierPayments,
      unpaidSupplierPayments,
      totalUnitsSold,
      uniqueSkusSold,
      paymentBreakdown,
      paymentCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fast Server-side Reports Analytics Endpoint
app.get('/api/reports/analytics', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const { from, to } = req.query;
    let whereClauses = ["(o.status IS NULL OR o.status NOT IN ('cancelled', 'void'))"];
    let params = [];
    if (from) {
      whereClauses.push(`DATE(o.date) >= ?`);
      params.push(from);
    }
    if (to) {
      whereClauses.push(`DATE(o.date) <= ?`);
      params.push(to);
    }
    const whereSql = 'WHERE ' + whereClauses.join(' AND ');

    // Item-level top performers
    const itemSales = await dbQuery(`
      SELECT 
        oi.productName,
        COALESCE(c.name, 'General') AS categoryName,
        SUM(oi.qty) AS totalQty,
        SUM(oi.total) AS totalRevenue,
        COUNT(DISTINCT oi.orderId) AS orderCount
      FROM orderItems oi
      INNER JOIN orders o ON oi.orderId = o.id
      LEFT JOIN products p ON oi.productId = p.id
      LEFT JOIN categories c ON p.categoryId = c.id
      ${whereSql}
      GROUP BY oi.productName, categoryName
      ORDER BY totalRevenue DESC
      LIMIT 100
    `, params);

    // Day-by-day sales trend
    const salesTrend = await dbQuery(`
      SELECT 
        DATE(o.date) AS saleDate,
        COUNT(*) AS orderCount,
        SUM(o.grandTotal) AS totalSales
      FROM orders o
      ${whereSql}
      GROUP BY DATE(o.date)
      ORDER BY saleDate ASC
    `, params);

    res.json({ itemSales, salesTrend });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daily Resetting Token Number
app.get('/api/next-token', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const today = getBangladeshDateOnlyString(new Date());
    const rows = await dbQuery(`SELECT COALESCE(MAX(tokenNo), 0) + 1 AS nextToken FROM orders WHERE DATE(date) = ?`, [today]);
    const nextToken = (rows && rows[0] && rows[0].nextToken) ? Number(rows[0].nextToken) : 1;
    res.json({ tokenNo: nextToken });
  } catch (err) {
    res.json({ tokenNo: 1 });
  }
});

app.get('/api/orderItems', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const { orderId, from, to } = req.query;
    let whereClauses = [];
    let params = [];
    if (orderId) {
      whereClauses.push('oi.orderId = ?');
      params.push(orderId);
    }
    if (from || to) {
      whereClauses.push(`EXISTS (SELECT 1 FROM orders o WHERE o.id = oi.orderId ${from ? 'AND DATE(o.date) >= ?' : ''} ${to ? 'AND DATE(o.date) <= ?' : ''})`);
      if (from) params.push(from);
      if (to) params.push(to);
    }
    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const rows = await dbQuery(`SELECT oi.* FROM orderItems oi ${whereSql}`, params);
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
        DATE_FORMAT(o.date, '%Y-%m-%d %H:%i:%s') AS orderDate,
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
    const { orderId, from, to } = req.query;
    let whereClauses = [];
    let params = [];
    if (orderId) {
      whereClauses.push('p.orderId = ?');
      params.push(orderId);
    }
    if (from || to) {
      whereClauses.push(`EXISTS (SELECT 1 FROM orders o WHERE o.id = p.orderId ${from ? 'AND DATE(o.date) >= ?' : ''} ${to ? 'AND DATE(o.date) <= ?' : ''})`);
      if (from) params.push(from);
      if (to) params.push(to);
    }
    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const rows = await dbQuery(`SELECT p.* FROM payments p ${whereSql}`, params);
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
    const formattedDate = formatToMySQLDateTime(order.date);

    // Calculate daily resetting token number (resets every midnight)
    const orderDatePrefix = formattedDate ? formattedDate.substring(0, 10) : new Date().toISOString().substring(0, 10);
    const [tokenRows] = await connection.execute(
      `SELECT COALESCE(MAX(tokenNo), 0) + 1 AS nextToken FROM orders WHERE DATE(date) = ?`,
      [orderDatePrefix]
    );
    const nextToken = (tokenRows && tokenRows[0] && tokenRows[0].nextToken) ? Number(tokenRows[0].nextToken) : 1;

    const finalCustName = (order.customerName && order.customerName.trim()) ? order.customerName.trim() : '';
    const finalCustPhone = (order.customerPhone || '').trim();

    await connection.execute(`INSERT INTO orders (
      id, invoiceId, customerId, customerName, customerPhone, date, subtotal, discountType, 
      discountValue, discountAmount, taxPercent, taxAmount, grandTotal, paidAmount, dueAmount, returnedAmount, status, orderType, tableName, tokenNo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [order.id, order.invoiceId, order.customerId || null, finalCustName, finalCustPhone, formattedDate, order.subtotal,
      order.discountType, order.discountValue, order.discountAmount, order.taxPercent, order.taxAmount, order.grandTotal,
      order.paidAmount, order.dueAmount, order.returnedAmount, order.status || 'completed', order.orderType || 'Dine In', order.tableName || 'Table 01', nextToken]);

    // Automatically save or update customer in customers table ONLY if full phone and real name provided
    if (finalCustName && finalCustPhone && finalCustPhone.replace(/\D/g, '').length >= 7 && finalCustName.toLowerCase() !== 'guest') {
      try {
        const [existingCust] = await connection.execute(`SELECT id FROM customers WHERE phone = ? LIMIT 1`, [finalCustPhone]);
        if (existingCust && existingCust.length > 0) {
          await connection.execute(`UPDATE customers SET name = ? WHERE id = ?`, [finalCustName, existingCust[0].id]);
        } else {
          const newCustId = order.customerId || ('c_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6));
          await connection.execute(`INSERT INTO customers (id, name, phone, label, customDiscount) VALUES (?, ?, ?, 'Regular', 0.00)`,
            [newCustId, finalCustName, finalCustPhone]);
        }
      } catch (custErr) {
        console.warn('Customer auto-save notice during order creation:', custErr.message);
      }
    }

    for (const item of items) {
      await connection.execute(`INSERT INTO orderItems (id, orderId, productId, productName, variationName, qty, unitPrice, total, costPrice) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, order.id, item.productId, item.productName, item.variationName || '', item.qty, item.unitPrice, item.total, parseFloat(item.costPrice) || 0.00]);

      // Stock tracking completely removed for restaurant POS
    }

    for (const p of payments) {
      await connection.execute(`INSERT INTO payments (id, orderId, method, amount, lastFour) VALUES (?, ?, ?, ?, ?)`,
        [p.id, order.id, p.method, p.amount, p.lastFour || p.lastfour || null]);
    }

    await connection.execute(`UPDATE counters SET val = val + 1 WHERE key_name = 'invoice'`);

    await connection.commit();
    res.json({ success: true, tokenNo: nextToken, invoiceId: order.invoiceId });
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
    const formattedDate = formatToMySQLDateTime(order.date);

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
    const rows = await dbQuery(`SELECT id, returnId, orderId, invoiceId, customerName, customerPhone, DATE_FORMAT(date, '%Y-%m-%d %H:%i:%s') as date, returnTotal, status FROM returns ORDER BY date DESC`);
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
    const formattedDate = formatToMySQLDateTime(returnRecord.date);

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
      const formattedDate = formatToMySQLDateTime(o.date);
      await connection.execute(`INSERT INTO orders (id, invoiceId, customerId, customerName, customerPhone, date, subtotal, discountType, discountValue, discountAmount, taxPercent, taxAmount, grandTotal, paidAmount, dueAmount, returnedAmount, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [o.id, o.invoiceId, o.customerId, o.customerName, o.customerPhone, formattedDate, o.subtotal, o.discountType, o.discountValue, o.discountAmount, o.taxPercent, o.taxAmount, o.grandTotal, o.paidAmount, o.dueAmount, o.returnedAmount, o.status]);
    }
    for (const i of orderItems || []) {
      await connection.execute(`INSERT INTO orderItems (id, orderId, productId, productName, variationName, qty, unitPrice, total, costPrice) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [i.id, i.orderId, i.productId, i.productName, i.variationName, i.qty, i.unitPrice, i.total, parseFloat(i.costPrice) || 0.00]);
    }
    for (const r of returns || []) {
      const formattedDate = formatToMySQLDateTime(r.date);
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
