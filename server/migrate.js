import { connect } from '@tidbcloud/serverless';
import bcrypt from 'bcryptjs';

const DATABASE_URL = 'mysql://4TQx8c28i1TxM2L.root:GQtGpmMlHhGVNU0t@gateway01.eu-central-1.prod.aws.tidbcloud.com/e_commerce';

async function migrate() {
  const conn = connect({ url: DATABASE_URL });
  
  try {
    console.log('Connecting to TiDB...');
    // ============ SHOP WORKERS TABLE ============
    const checkWorkersTable = await conn.execute("SHOW TABLES LIKE 'shop_workers'");
    const hasWorkersTable = Array.isArray(checkWorkersTable) && checkWorkersTable.length > 0;
    if (!hasWorkersTable) {
      console.log('Creating shop_workers table...');
      await conn.execute(`
        CREATE TABLE shop_workers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          full_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          role ENUM('owner', 'worker') DEFAULT 'worker',
          permissions JSON DEFAULT NULL,
          status ENUM('active', 'inactive') DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('  ✓ shop_workers table created');

      // Seed default owner
      const hashedPassword = await bcrypt.hash('hamza2026', 10);
      await conn.execute(
        "INSERT INTO shop_workers (full_name, email, password, role, permissions, status) VALUES (?, ?, ?, 'owner', ?, 'active')",
        ['wassim hadjidj', 'mafrouchat.la.maison.dor@gmail.com', hashedPassword, JSON.stringify(['*'])]
      );
      console.log('  ✓ Default owner seeded (wassim hadjidj)');
    } else {
      console.log('  - shop_workers table already exists, skipping');
    }

    // ============ WORKER SESSIONS TABLE ============
    const checkSessionsTable = await conn.execute("SHOW TABLES LIKE 'worker_sessions'");
    const hasSessionsTable = Array.isArray(checkSessionsTable) && checkSessionsTable.length > 0;
    if (!hasSessionsTable) {
      console.log('Creating worker_sessions table...');
      await conn.execute(`
        CREATE TABLE worker_sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          worker_id INT NOT NULL,
          token VARCHAR(64) NOT NULL UNIQUE,
          expires_at BIGINT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (worker_id) REFERENCES shop_workers(id) ON DELETE CASCADE
        )
      `);
      console.log('  ✓ worker_sessions table created');
    } else {
      console.log('  - worker_sessions table already exists, skipping');
    }

    // ============ ORDER DELIVERY SENT COLUMN ============
    const checkDeliveryColumn = await conn.execute("SHOW COLUMNS FROM order_info LIKE 'delivery_sent'");
    const hasDeliveryColumn = Array.isArray(checkDeliveryColumn) && checkDeliveryColumn.length > 0;
    if (!hasDeliveryColumn) {
      console.log('Adding delivery_sent column to order_info...');
      await conn.execute("ALTER TABLE order_info ADD COLUMN delivery_sent TINYINT(1) DEFAULT 0 AFTER current_status");
      console.log('  ✓ delivery_sent column added');
    } else {
      console.log('  - delivery_sent column already exists, skipping');
    }

    // ============ SHOP HEADER TABLE ============
    const checkHeaderTable = await conn.execute("SHOW TABLES LIKE 'shop_header'");
    const hasHeaderTable = Array.isArray(checkHeaderTable) && checkHeaderTable.length > 0;
    if (!hasHeaderTable) {
      console.log('Creating shop_header table...');
      await conn.execute(`
        CREATE TABLE shop_header (
          id INT AUTO_INCREMENT PRIMARY KEY,
          content TEXT NOT NULL,
          background_color VARCHAR(7) DEFAULT '#000000',
          is_active TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('  ✓ shop_header table created');
    } else {
      console.log('  - shop_header table already exists, skipping');
    }

    // ============ BANNERS LINKED PRODUCT COLUMN ============
    const checkBannerLinkedColumn = await conn.execute("SHOW COLUMNS FROM banners LIKE 'linked_product_id'");
    const hasBannerLinkedColumn = Array.isArray(checkBannerLinkedColumn) && checkBannerLinkedColumn.length > 0;
    if (!hasBannerLinkedColumn) {
      console.log('Adding linked_product_id column to banners...');
      await conn.execute("ALTER TABLE banners ADD COLUMN linked_product_id INT DEFAULT NULL AFTER public_id");
      console.log('  ✓ linked_product_id column added');
    } else {
      console.log('  - linked_product_id column already exists, skipping');
    }

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
