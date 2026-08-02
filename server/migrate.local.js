import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { WILAYA_SEED, BALADIYA_SEED } from './wilaya-seed.js';

dotenv.config();

async function migrate() {
  const dbName = process.env.DB_DATABASE || 'e_commerce';

  const initConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  await initConn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  console.log(`  ✓ database "${dbName}" ensured`);
  await initConn.end();

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
  });

  try {
    console.log('Connected to MySQL');

    // ============ 1. CATEGORIES ============
    await connection.execute(`CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      image_url TEXT DEFAULT NULL
    )`);

    const checkCategoryImageColumn = await connection.execute("SHOW COLUMNS FROM categories LIKE 'image_url'");
    const hasCategoryImageColumn = Array.isArray(checkCategoryImageColumn[0]) && checkCategoryImageColumn[0].length > 0;
    if (!hasCategoryImageColumn) {
      await connection.execute("ALTER TABLE categories ADD COLUMN image_url TEXT DEFAULT NULL");
      console.log('  ✓ categories image_url column added');
    } else {
      console.log('  - categories image_url column already exists, skipping');
    }
    console.log('  ✓ categories');

    // ============ 2. PRODUCTS ============
    await connection.execute(`CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      big_description TEXT,
      price DECIMAL(10,2) NOT NULL,
      compare_price DECIMAL(10,2) DEFAULT 0,
      discount_percentage INT DEFAULT 0,
      type VARCHAR(50),
      image_url TEXT,
      images JSON,
      landing_page_image TEXT,
      thumbnail TEXT,
      colors JSON,
      offers JSON,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);
    console.log('  ✓ products');

    // ============ 3. PRODUCT_CATEGORIES ============
    await connection.execute(`CREATE TABLE IF NOT EXISTS product_categories (
      product_id INT NOT NULL,
      category_id INT NOT NULL,
      PRIMARY KEY (product_id, category_id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )`);
    console.log('  ✓ product_categories');

    // ============ 4. BANNERS ============
    await connection.execute(`CREATE TABLE IF NOT EXISTS banners (
      position INT NOT NULL PRIMARY KEY,
      url TEXT NOT NULL,
      public_id VARCHAR(255),
      linked_product_id INT DEFAULT NULL
    )`);
    console.log('  ✓ banners');

    // Add package_naming column to products if missing
    try {
      await connection.execute("ALTER TABLE products ADD COLUMN package_naming JSON DEFAULT NULL AFTER offers");
      console.log('  ✓ package_naming column added to products');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.error('  package_naming column error:', e.message);
    }

    // ============ 5. SHOP WORKERS ============
    await connection.execute(`CREATE TABLE IF NOT EXISTS shop_workers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('owner', 'worker') DEFAULT 'worker',
      permissions JSON DEFAULT NULL,
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);
    console.log('  ✓ shop_workers');

    // Seed default owner
    const [ownerRows] = await connection.execute("SELECT id FROM shop_workers WHERE email = ?", ['mafrouchat.la.maison.dor@gmail.com']);
    if (ownerRows.length === 0) {
      const hashedPassword = await bcrypt.hash('hamza2026', 10);
      await connection.execute(
        "INSERT INTO shop_workers (full_name, email, password, role, permissions, status) VALUES (?, ?, ?, 'owner', ?, 'active')",
        ['wassim hadjidj', 'mafrouchat.la.maison.dor@gmail.com', hashedPassword, JSON.stringify(['*'])]
      );
      console.log('  ✓ default owner seeded');
    } else {
      console.log('  - owner already exists, skipping');
    }

    // ============ 6. WORKER SESSIONS ============
    await connection.execute(`CREATE TABLE IF NOT EXISTS worker_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      worker_id INT NOT NULL,
      token VARCHAR(64) NOT NULL UNIQUE,
      expires_at BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (worker_id) REFERENCES shop_workers(id) ON DELETE CASCADE
    )`);
    console.log('  ✓ worker_sessions');

    // ============ 7. SHOP HEADER ============
    await connection.execute(`CREATE TABLE IF NOT EXISTS shop_header (
      id INT AUTO_INCREMENT PRIMARY KEY,
      content TEXT NOT NULL,
      background_color VARCHAR(7) DEFAULT '#000000',
      is_active TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);
    console.log('  ✓ shop_header');

    // ============ 8. ORDER INFO ============
    await connection.execute(`CREATE TABLE IF NOT EXISTS order_info (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) DEFAULT NULL,
      phone VARCHAR(50) NOT NULL,
      wilaya VARCHAR(255) NOT NULL,
      baladiya VARCHAR(255) NOT NULL,
      delivery_type VARCHAR(50) DEFAULT 'domicile',
      delivery_Price DECIMAL(10,2) DEFAULT 0,
      free_delivery TINYINT(1) DEFAULT 0,
      wilaya_code VARCHAR(10) DEFAULT NULL,
      current_status VARCHAR(50) DEFAULT 'new',
      order_number VARCHAR(50) NOT NULL,
      delivery_sent TINYINT(1) DEFAULT 0,
      telegram_notified TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);
    console.log('  ✓ order_info');

    // ============ 9. ORDER ITEMS ============
    await connection.execute(`CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL,
      price_per_unit DECIMAL(10,2) NOT NULL,
      color_name VARCHAR(255) DEFAULT NULL,
      color_hex VARCHAR(7) DEFAULT NULL,
      offer_text VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES order_info(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);
    console.log('  ✓ order_items');

    // ============ 10. REVIEWS ============
    await connection.execute(`CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      review_text TEXT NOT NULL,
      stars TINYINT NOT NULL,
      image_url TEXT DEFAULT NULL,
      is_admin TINYINT(1) DEFAULT 0,
      is_approved TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);
    console.log('  ✓ reviews');

    // Add is_approved column if missing (for existing tables)
    try {
      await connection.execute("ALTER TABLE reviews ADD COLUMN is_approved TINYINT(1) DEFAULT 0 AFTER is_admin");
      console.log('  ✓ is_approved column added to reviews');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.error('  is_approved column error:', e.message);
    }

    // ============ 11. LEFTED ORDERS ============
    await connection.execute(`CREATE TABLE IF NOT EXISTS lefted_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phone VARCHAR(50) NOT NULL,
      first_name VARCHAR(255) DEFAULT '',
      last_name VARCHAR(255) DEFAULT '',
      wilaya VARCHAR(255) DEFAULT '',
      wilaya_code VARCHAR(10) DEFAULT '',
      baladiya VARCHAR(255) DEFAULT '',
      delivery_type VARCHAR(50) DEFAULT 'domicile',
      product_id INT DEFAULT NULL,
      product_name VARCHAR(255) DEFAULT '',
      product_price DECIMAL(10,2) DEFAULT 0,
      quantity INT DEFAULT 1,
      color_name VARCHAR(255) DEFAULT '',
      color_hex VARCHAR(7) DEFAULT '',
      colors JSON DEFAULT NULL,
      delivery_price DECIMAL(10,2) DEFAULT 0,
      offer_text VARCHAR(255) DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('  ✓ lefted_orders');

    // Widen color_hex column for lefted_orders and order_items (supports multiple hex values joined by comma)
    try {
      await connection.execute("ALTER TABLE lefted_orders MODIFY COLUMN color_hex VARCHAR(255) DEFAULT ''");
      console.log('  ✓ color_hex widened to VARCHAR(255) in lefted_orders');
    } catch (e) {
      if (!e.message.includes('Duplicate column') && !e.message.includes('Unknown column')) console.error('  color_hex widen error:', e.message);
    }
    try {
      await connection.execute("ALTER TABLE order_items MODIFY COLUMN color_hex VARCHAR(255) DEFAULT NULL");
      console.log('  ✓ color_hex widened to VARCHAR(255) in order_items');
    } catch (e) {
      if (!e.message.includes('Duplicate column') && !e.message.includes('Unknown column')) console.error('  color_hex widen error:', e.message);
    }

    // ============ 12. WILAYAS ============
    await connection.execute(`CREATE TABLE IF NOT EXISTS wilayas (
      code VARCHAR(10) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      home_delivery_price DECIMAL(10,2) DEFAULT 0,
      stopdesk_delivery_price DECIMAL(10,2) DEFAULT 0,
      free_delivery TINYINT(1) DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1
    )`);
    console.log('  ✓ wilayas');

    // Seed default wilayas on a fresh database
    const [wilayaCountRows] = await connection.execute('SELECT COUNT(*) AS total FROM wilayas');
    if (Number(wilayaCountRows[0].total) < 58 && WILAYA_SEED.length > 0) {
      for (let i = 0; i < WILAYA_SEED.length; i += 500) {
        const chunk = WILAYA_SEED.slice(i, i + 500);
        await connection.query('INSERT INTO wilayas (code, name, home_delivery_price, stopdesk_delivery_price, free_delivery, is_active) VALUES ?',
          [chunk.map(w => [w.code, w.name, w.home_delivery_price, w.stopdesk_delivery_price, w.free_delivery, w.is_active])]);
      }
      console.log(`  ✓ ${WILAYA_SEED.length} wilayas seeded`);
    } else {
      console.log(`  - wilayas table has ${wilayaCountRows[0].total} rows, skipping seed`);
    }

    // ============ 13. BALADIYAS ============
    await connection.execute(`CREATE TABLE IF NOT EXISTS baladiyas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      wilaya_code VARCHAR(10) NOT NULL,
      name VARCHAR(255) NOT NULL,
      has_stopdesk TINYINT(1) DEFAULT 0,
      FOREIGN KEY (wilaya_code) REFERENCES wilayas(code) ON DELETE CASCADE
    )`);
    console.log('  ✓ baladiyas');

    // Seed default baladiyas on a fresh database (wilayas seeded first, FK-safe)
    const [baladiyaCountRows] = await connection.execute('SELECT COUNT(*) AS total FROM baladiyas');
    if (Number(baladiyaCountRows[0].total) < 1542 && BALADIYA_SEED.length > 0) {
      for (let i = 0; i < BALADIYA_SEED.length; i += 500) {
        const chunk = BALADIYA_SEED.slice(i, i + 500);
        await connection.query('INSERT INTO baladiyas (id, wilaya_code, name, has_stopdesk) VALUES ?',
          [chunk.map(b => [b.id, b.wilaya_code, b.name, b.has_stopdesk])]);
      }
      console.log(`  ✓ ${BALADIYA_SEED.length} baladiyas seeded`);
    } else {
      console.log(`  - baladiyas table has ${baladiyaCountRows[0].total} rows, skipping seed`);
    }

    // ============ 14. GOOGLE CREDENTIALS ============
    await connection.execute(`CREATE TABLE IF NOT EXISTS google_credentials (
      id INT PRIMARY KEY DEFAULT 1,
      credentials JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);
    console.log('  ✓ google_credentials');

    // ============ 15. GOOGLE SHEETS ============
    await connection.execute(`CREATE TABLE IF NOT EXISTS google_sheets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      file_name VARCHAR(255) NOT NULL,
      file_id VARCHAR(255) NOT NULL,
      paper_name VARCHAR(255) NOT NULL,
      is_active TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);
    console.log('  ✓ google_sheets');

    // ============ 16. SECONDARY INDEXES ============
    const indexes = [
      { table: 'order_info', name: 'idx_current_status', sql: 'ALTER TABLE order_info ADD INDEX idx_current_status (current_status)' },
      { table: 'order_info', name: 'idx_created_at', sql: 'ALTER TABLE order_info ADD INDEX idx_created_at (created_at)' },
      { table: 'lefted_orders', name: 'idx_phone', sql: 'ALTER TABLE lefted_orders ADD INDEX idx_phone (phone)' },
      { table: 'lefted_orders', name: 'idx_created_at', sql: 'ALTER TABLE lefted_orders ADD INDEX idx_created_at (created_at)' },
      { table: 'reviews', name: 'idx_product_approved', sql: 'ALTER TABLE reviews ADD INDEX idx_product_approved (product_id, is_approved)' },
      { table: 'products', name: 'idx_is_active', sql: 'ALTER TABLE products ADD INDEX idx_is_active (is_active)' },
    ];
    for (const { table, name, sql } of indexes) {
      try {
        await connection.execute(sql);
        console.log(`  ✓ ${name} index added to ${table}`);
      } catch (e) {
        if (!e.message.includes('Duplicate key name')) console.error(`  ${name} index error:`, e.message);
      }
    }

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
