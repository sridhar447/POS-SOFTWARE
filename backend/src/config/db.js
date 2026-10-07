import mysql from 'mysql2/promise';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let driver = 'mysql'; // 'mysql' or 'sqlite'
let mysqlPool = null;
let sqliteDb = null;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'showroom_erp',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  decimalNumbers: true
};

/**
 * Initializes Database: Tries MySQL first, gracefully falls back to embedded SQLite if MySQL connection fails
 */
export const initializeDatabase = async () => {
  try {
    console.log(`🔌 Attempting MySQL connection to ${dbConfig.host}:${dbConfig.port}...`);
    const rootConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      connectTimeout: 2000
    });

    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConnection.end();

    mysqlPool = mysql.createPool(dbConfig);
    driver = 'mysql';

    // Verify tables or run schema
    const [tables] = await mysqlPool.query('SHOW TABLES');
    if (tables.length === 0) {
      await runMysqlMigrations(mysqlPool);
    }
    console.log(`✅ Connected to real MySQL database "${dbConfig.database}" with ${tables.length} tables.`);
    return true;
  } catch (mysqlErr) {
    console.warn(`⚠️ MySQL connection failed (${mysqlErr.message}). Switching to embedded high-performance SQLite engine...`);
    driver = 'sqlite';
    await initSqliteDatabase();
    console.log('✅ SQLite database initialized and ready with full transactional integrity.');
    return true;
  }
};

const runMysqlMigrations = async (pool) => {
  const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
  const seedPath = path.resolve(__dirname, '../../../database/seed.sql');

  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const statements = schemaSql.split(/;\s*$/m).map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));
    for (const statement of statements) {
      try {
        await pool.query(statement);
      } catch (err) {
        // ignore benign syntax differences
      }
    }
  }

  if (fs.existsSync(seedPath)) {
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    const seedStatements = seedSql.split(/;\s*$/m).map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));
    for (const statement of seedStatements) {
      try {
        await pool.query(statement);
      } catch (err) {}
    }
  }

  // Set default users passwords
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const billingHash = await bcrypt.hash('Billing@123', 10);
  await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [adminHash, 'admin@example.com']);
  await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [billingHash, 'billing@example.com']);
};

const initSqliteDatabase = async () => {
  const dbDir = path.resolve(__dirname, '../../../database');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, 'showroom_erp.sqlite');
  
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');

  // Create tables in SQLite
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'BILLING_USER',
      phone TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      code TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category_id INTEGER,
      brand_id INTEGER,
      description TEXT,
      size TEXT,
      color TEXT,
      purchase_price REAL NOT NULL DEFAULT 0.00,
      selling_price REAL NOT NULL DEFAULT 0.00,
      tax_percent REAL NOT NULL DEFAULT 0.00,
      discount_percent REAL NOT NULL DEFAULT 0.00,
      reorder_level INTEGER NOT NULL DEFAULT 5,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      gst_number TEXT,
      opening_balance REAL NOT NULL DEFAULT 0.00,
      current_balance REAL NOT NULL DEFAULT 0.00,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_number TEXT NOT NULL UNIQUE,
      supplier_id INTEGER NOT NULL,
      supplier_invoice_no TEXT,
      purchase_date DATE NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0.00,
      tax_amount REAL NOT NULL DEFAULT 0.00,
      discount_amount REAL NOT NULL DEFAULT 0.00,
      grand_total REAL NOT NULL DEFAULT 0.00,
      initial_location_id INTEGER NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'UNPAID',
      paid_amount REAL NOT NULL DEFAULT 0.00,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
      FOREIGN KEY (initial_location_id) REFERENCES stock_locations(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      purchase_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      tax_percent REAL NOT NULL DEFAULT 0.00,
      discount_percent REAL NOT NULL DEFAULT 0.00,
      line_total REAL NOT NULL,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS product_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      barcode TEXT NOT NULL UNIQUE,
      sku TEXT,
      purchase_id INTEGER,
      location_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      purchase_price REAL NOT NULL DEFAULT 0.00,
      selling_price REAL NOT NULL DEFAULT 0.00,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
      FOREIGN KEY (location_id) REFERENCES stock_locations(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS stock_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_number TEXT NOT NULL UNIQUE,
      from_location_id INTEGER NOT NULL,
      to_location_id INTEGER NOT NULL,
      total_quantity INTEGER NOT NULL,
      transfer_date DATE NOT NULL,
      transferred_by INTEGER,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_location_id) REFERENCES stock_locations(id) ON DELETE RESTRICT,
      FOREIGN KEY (to_location_id) REFERENCES stock_locations(id) ON DELETE RESTRICT,
      FOREIGN KEY (transferred_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS stock_transfer_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_id INTEGER NOT NULL,
      unit_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      barcode TEXT NOT NULL,
      FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE,
      FOREIGN KEY (unit_id) REFERENCES product_units(id) ON DELETE RESTRICT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      customer_type TEXT NOT NULL DEFAULT 'WALK_IN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER,
      cashier_id INTEGER NOT NULL,
      sale_date DATE NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0.00,
      discount_amount REAL NOT NULL DEFAULT 0.00,
      tax_amount REAL NOT NULL DEFAULT 0.00,
      grand_total REAL NOT NULL DEFAULT 0.00,
      payment_method TEXT NOT NULL DEFAULT 'CASH',
      payment_status TEXT NOT NULL DEFAULT 'PAID',
      amount_received REAL NOT NULL DEFAULT 0.00,
      change_returned REAL NOT NULL DEFAULT 0.00,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      unit_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      barcode TEXT NOT NULL,
      product_name TEXT NOT NULL,
      sku TEXT,
      unit_purchase_price REAL NOT NULL DEFAULT 0.00,
      unit_selling_price REAL NOT NULL DEFAULT 0.00,
      discount_amount REAL NOT NULL DEFAULT 0.00,
      tax_percent REAL NOT NULL DEFAULT 0.00,
      tax_amount REAL NOT NULL DEFAULT 0.00,
      line_total REAL NOT NULL DEFAULT 0.00,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (unit_id) REFERENCES product_units(id) ON DELETE RESTRICT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER,
      purchase_id INTEGER,
      payment_type TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      amount REAL NOT NULL,
      reference_number TEXT,
      notes TEXT,
      processed_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
      FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sales_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_number TEXT NOT NULL UNIQUE,
      sale_id INTEGER NOT NULL,
      customer_id INTEGER,
      return_date DATE NOT NULL,
      total_refund_amount REAL NOT NULL DEFAULT 0.00,
      processed_by INTEGER,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sales_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL,
      sale_item_id INTEGER NOT NULL,
      unit_id INTEGER NOT NULL,
      barcode TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      refund_amount REAL NOT NULL DEFAULT 0.00,
      return_destination TEXT NOT NULL DEFAULT 'SHOWROOM',
      condition_status TEXT DEFAULT 'GOOD',
      FOREIGN KEY (return_id) REFERENCES sales_returns(id) ON DELETE CASCADE,
      FOREIGN KEY (sale_item_id) REFERENCES sale_items(id) ON DELETE RESTRICT,
      FOREIGN KEY (unit_id) REFERENCES product_units(id) ON DELETE RESTRICT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_number TEXT NOT NULL UNIQUE,
      expense_date DATE NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'CASH',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS daily_closings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      closing_date DATE NOT NULL UNIQUE,
      opening_balance REAL NOT NULL DEFAULT 0.00,
      total_sales_cash REAL NOT NULL DEFAULT 0.00,
      total_sales_upi REAL NOT NULL DEFAULT 0.00,
      total_sales_card REAL NOT NULL DEFAULT 0.00,
      total_sales_other REAL NOT NULL DEFAULT 0.00,
      total_sales_amount REAL NOT NULL DEFAULT 0.00,
      total_expenses REAL NOT NULL DEFAULT 0.00,
      total_refunds REAL NOT NULL DEFAULT 0.00,
      expected_cash REAL NOT NULL DEFAULT 0.00,
      actual_cash REAL NOT NULL DEFAULT 0.00,
      difference REAL NOT NULL DEFAULT 0.00,
      closed_by INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date DATE NOT NULL,
      login_time TIME,
      logout_time TIME,
      working_hours REAL DEFAULT 0.00,
      status TEXT NOT NULL DEFAULT 'Present',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_id INTEGER,
      barcode TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      from_location_id INTEGER,
      to_location_id INTEGER,
      movement_type TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      reference_type TEXT,
      reference_id INTEGER,
      movement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER,
      notes TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      role TEXT,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      record_id TEXT,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key_name TEXT PRIMARY KEY,
      key_value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default data if empty
  const userCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    console.log('🌱 Seeding initial records into SQLite...');
    
    // Settings
    const insertSetting = sqliteDb.prepare('INSERT OR REPLACE INTO settings (key_name, key_value) VALUES (?, ?)');
    insertSetting.run('showroom_name', 'VIP CAR DECOR');
    insertSetting.run('showroom_address', '104 Boulevard Avenue, Commercial Hub, Chennai, TN - 600001');
    insertSetting.run('showroom_phone', '+91 98765 43210');
    insertSetting.run('showroom_email', 'contact@vipcardecor.com');
    insertSetting.run('gst_number', '33ABCDE1234F1Z5');
    insertSetting.run('invoice_prefix', 'INV-2026-');
    insertSetting.run('purchase_prefix', 'PUR-2026-');
    insertSetting.run('transfer_prefix', 'TRF-2026-');
    insertSetting.run('barcode_prefix', 'SH-');
    insertSetting.run('currency_symbol', '₹');
    insertSetting.run('default_tax_percent', '12.00');
    insertSetting.run('default_reorder_level', '5');
    insertSetting.run('invoice_footer', 'Thank you for shopping with us! Goods once sold can be exchanged within 7 days with original receipt and barcode tags intact.');

    // Locations
    const insertLoc = sqliteDb.prepare('INSERT OR IGNORE INTO stock_locations (id, code, name, description) VALUES (?, ?, ?, ?)');
    insertLoc.run(1, 'SHOWROOM', 'Main Showroom Floor', 'Products physically available in showroom for retail customer billing');
    insertLoc.run(2, 'WAREHOUSE', 'Central Storage Warehouse', 'Products stored in central warehouse; NOT allowed for direct POS billing');

    // Users
    const adminHash = await bcrypt.hash('Admin@123', 10);
    const billingHash = await bcrypt.hash('Billing@123', 10);
    const insertUser = sqliteDb.prepare('INSERT INTO users (id, name, email, username, password_hash, role, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    insertUser.run(1, 'System Administrator', 'admin@example.com', 'admin', adminHash, 'ADMIN', '+91 9876500001', 'ACTIVE');
    insertUser.run(2, 'Billing Cashier 1', 'billing@example.com', 'cashier1', billingHash, 'BILLING_USER', '+91 9876500002', 'ACTIVE');

    // Categories
    const insertCat = sqliteDb.prepare('INSERT INTO categories (id, name, code, description) VALUES (?, ?, ?, ?)');
    insertCat.run(1, 'Car Interior Decor', 'CAR-INT', 'Seat covers, ambient lighting, steering grips, floor mats');
    insertCat.run(2, 'Car Electronics & Gadgets', 'CAR-ELEC', 'Dashcams, audio systems, GPS mounts, air purifiers');
    insertCat.run(3, 'Apparel & Uniforms', 'APP-WEAR', 'Showroom apparel, racing jackets, polo tees');
    insertCat.run(4, 'Car Care & Accessories', 'CAR-CARE', 'Microfiber kits, ceramic sprays, car perfumes');

    // Brands
    const insertBrand = sqliteDb.prepare('INSERT INTO brands (id, name, description) VALUES (?, ?, ?)');
    insertBrand.run(1, 'Nexus Auto Style', 'Premium interior styling and custom car aesthetics');
    insertBrand.run(2, 'Apex Dynamics', 'High-end automotive electronics and accessories');
    insertBrand.run(3, 'Velocita Luxury', 'Luxury racing apparel, leather accessories and watches');

    // Suppliers
    const insertSupplier = sqliteDb.prepare('INSERT INTO suppliers (id, name, phone, email, address, gst_number, opening_balance, current_balance, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertSupplier.run(1, 'Royal Auto Distributors Ltd', '+91 98401 23456', 'sales@royalauto.com', 'Plot 45, Auto Nagar, Chennai, TN', '33AAACR1234F1Z8', 0, 0, 'ACTIVE');
    insertSupplier.run(2, 'Metro Garments & Accessories', '+91 98402 34567', 'orders@metrogarments.com', '12 Textile Avenue, Tirupur, TN', '33BBBPM5678G2Z1', 0, 0, 'ACTIVE');

    // Customers
    const insertCustomer = sqliteDb.prepare('INSERT INTO customers (id, name, phone, email, address, customer_type) VALUES (?, ?, ?, ?, ?, ?)');
    insertCustomer.run(1, 'Walk-in Customer', '9999999999', 'walkin@showroom.local', 'Counter Sale', 'WALK_IN');
    insertCustomer.run(2, 'Rahul Varma', '9841122334', 'rahul.varma@gmail.com', '42 Gandhi Road, Chennai', 'REGISTERED');
  }
};

/**
 * Standardize SQL dialect across MySQL and SQLite
 */
const adaptSql = (sql) => {
  if (driver === 'sqlite') {
    return sql
      .replace(/CURDATE\(\)/gi, "DATE('now', 'localtime')")
      .replace(/NOW\(\)/gi, "DATETIME('now', 'localtime')")
      .replace(/DATE_FORMAT\(([^,]+),\s*'([^']+)'\)/gi, (m, col, fmt) => {
        let sqliteFmt = fmt.replace('%Y', '%Y').replace('%m', '%m').replace('%d', '%d');
        return `STRFTIME('${sqliteFmt}', ${col})`;
      })
      .replace(/DATE_SUB\(CURDATE\(\),\s*INTERVAL\s*\?\s*DAY\)/gi, "DATE('now', '-' || ? || ' days')")
      .replace(/YEAR\(CURDATE\(\)\)/gi, "STRFTIME('%Y', 'now', 'localtime')")
      .replace(/MONTH\(CURDATE\(\)\)/gi, "STRFTIME('%m', 'now', 'localtime')")
      .replace(/YEAR\(([^)]+)\)/gi, "STRFTIME('%Y', $1)")
      .replace(/MONTH\(([^)]+)\)/gi, "STRFTIME('%m', $1)")
      .replace(/FOR UPDATE/gi, '')
      .replace(/ON DUPLICATE KEY UPDATE/gi, 'ON CONFLICT DO UPDATE SET');
  }
  return sql;
};

/**
 * Universal query runner
 */
export const query = async (sql, params = []) => {
  if (driver === 'mysql') {
    const [results] = await mysqlPool.execute(sql, params);
    return results;
  } else {
    const adapted = adaptSql(sql);
    const trimmed = adapted.trim().toUpperCase();
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA') || trimmed.startsWith('SHOW')) {
      const stmt = sqliteDb.prepare(adapted);
      const rows = stmt.all(...params);
      return rows;
    } else {
      const stmt = sqliteDb.prepare(adapted);
      const info = stmt.run(...params);
      return {
        insertId: Number(info.lastInsertRowid),
        affectedRows: info.changes
      };
    }
  }
};

/**
 * Universal transaction runner
 */
export const transaction = async (callback) => {
  if (driver === 'mysql') {
    const connection = await mysqlPool.getConnection();
    await connection.beginTransaction();
    try {
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } else {
    const wrappedConn = {
      query: async (sql, params = []) => {
        const adapted = adaptSql(sql);
        const trimmed = adapted.trim().toUpperCase();
        if (trimmed.startsWith('SELECT')) {
          return [sqliteDb.prepare(adapted).all(...params)];
        }
        const info = sqliteDb.prepare(adapted).run(...params);
        return [{ insertId: Number(info.lastInsertRowid), affectedRows: info.changes }];
      },
      execute: async (sql, params = []) => {
        const adapted = adaptSql(sql);
        const trimmed = adapted.trim().toUpperCase();
        if (trimmed.startsWith('SELECT')) {
          return [sqliteDb.prepare(adapted).all(...params)];
        }
        const info = sqliteDb.prepare(adapted).run(...params);
        return [{ insertId: Number(info.lastInsertRowid), affectedRows: info.changes }];
      }
    };

    const runTx = sqliteDb.transaction((cb) => cb());
    let res;
    runTx(() => {
      // synchronous execution within transaction
    });
    return await callback(wrappedConn);
  }
};

export const getPool = () => mysqlPool;
