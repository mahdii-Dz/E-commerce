import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

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
      name VARCHAR(255) NOT NULL UNIQUE
    )`);
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);
    console.log('  ✓ reviews');

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
      offer_text VARCHAR(255) DEFAULT ''
    )`);
    console.log('  ✓ lefted_orders');

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

    // ============ 13. BALADIYAS ============
    await connection.execute(`CREATE TABLE IF NOT EXISTS baladiyas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      wilaya_code VARCHAR(10) NOT NULL,
      name VARCHAR(255) NOT NULL,
      has_stopdesk TINYINT(1) DEFAULT 0,
      FOREIGN KEY (wilaya_code) REFERENCES wilayas(code) ON DELETE CASCADE
    )`);
    console.log('  ✓ baladiyas');

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

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
