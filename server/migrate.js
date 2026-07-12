import { connect } from '@tidbcloud/serverless';

const DATABASE_URL = 'mysql://4TQx8c28i1TxM2L.root:GQtGpmMlHhGVNU0t@gateway01.eu-central-1.prod.aws.tidbcloud.com/e_commerce';

async function migrate() {
  const conn = connect({ url: DATABASE_URL });
  
  try {
    console.log('Connecting to TiDB...');

    // ============ CLEANUP ORPHAN ORDERS ============
    console.log('Deleting orphan orders (no order_number)...');
    const orphanResult = await conn.execute("DELETE FROM order_info WHERE order_number IS NULL OR order_number = ''");
    const orphanData = Array.isArray(orphanResult) ? orphanResult[0] : orphanResult;
    const orphanCount = orphanData?.affectedRows || orphanData?.rowsAffected || orphanData?.numRows || 0;
    console.log(`  ✓ Deleted ${orphanCount} orphan order(s)`);
    

    

    // ============ ORDERS TABLE MIGRATION ============

    // Add order_number column to order_info (UNIQUE added separately since TiDB doesn't support it in ADD COLUMN)
    const checkOrderNumberRows = await conn.execute('SHOW COLUMNS FROM order_info LIKE ?', ['order_number']);
    const hasOrderNumber = Array.isArray(checkOrderNumberRows) && checkOrderNumberRows.length > 0;
    if (!hasOrderNumber) {
      console.log('Adding order_number column to order_info...');
      await conn.execute('ALTER TABLE order_info ADD COLUMN order_number VARCHAR(20) AFTER id');
      console.log('  ✓ order_number column added');

      // Add unique index on order_number separately
      console.log('Adding unique index on order_number...');
      try {
        await conn.execute('ALTER TABLE order_info ADD UNIQUE INDEX idx_order_number (order_number)');
        console.log('  ✓ unique index added');
      } catch (err) {
        console.log(`  - Could not add unique index: ${err.message}`);
      }
    } else {
      console.log('  - order_number already exists, checking unique index...');
      const checkUniqueRows = await conn.execute('SHOW INDEX FROM order_info WHERE Column_name = ?', ['order_number']);
      const hasUniqueIndex = Array.isArray(checkUniqueRows) && checkUniqueRows.length > 0;
      if (!hasUniqueIndex) {
        console.log('Adding unique index on order_number...');
        try {
          await conn.execute('ALTER TABLE order_info ADD UNIQUE INDEX idx_order_number (order_number)');
          console.log('  ✓ unique index added');
        } catch (err) {
          console.log(`  - Could not add unique index: ${err.message}`);
        }
      } else {
        console.log('  - unique index already exists, skipping');
      }
    }

    // Add current_status column to order_info (after status)
    const checkCurrentStatusRows = await conn.execute('SHOW COLUMNS FROM order_info LIKE ?', ['current_status']);
    const hasCurrentStatus = Array.isArray(checkCurrentStatusRows) && checkCurrentStatusRows.length > 0;
    if (!hasCurrentStatus) {
      console.log('Adding current_status column to order_info...');
      await conn.execute("ALTER TABLE order_info ADD COLUMN current_status VARCHAR(50) DEFAULT 'new' AFTER status");
      console.log('  ✓ current_status column added');
    } else {
      console.log('  - current_status already exists, skipping');
    }

    // Backfill existing orders with order_number and migrate status
    const existingOrders = await conn.execute('SELECT id FROM order_info WHERE order_number IS NULL');
    const ordersToMigrate = Array.isArray(existingOrders) ? existingOrders : (existingOrders[0] || []);
    
    if (ordersToMigrate.length > 0) {
      console.log(`Backfilling ${ordersToMigrate.length} orders...`);
      
      for (const order of ordersToMigrate) {
        const id = order.id || order;
        // Generate random order number: 8 hex chars - 6 hex chars
        const p1 = Math.random().toString(16).substring(2, 10).toUpperCase();
        const p2 = Math.random().toString(16).substring(2, 8).toUpperCase();
        const orderNumber = `${p1}-${p2}`;
        
        await conn.execute(
          'UPDATE order_info SET order_number = ? WHERE id = ?',
          [orderNumber, id]
        );
      }
      
      // Migrate old status values to current_status (only if status column still exists)
      const checkOldStatus = await conn.execute('SHOW COLUMNS FROM order_info LIKE ?', ['status']);
      const hasOldStatus = Array.isArray(checkOldStatus) && checkOldStatus.length > 0;
      if (hasOldStatus) {
        await conn.execute("UPDATE order_info SET current_status = 'new' WHERE status = 'pending' AND current_status = 'new'");
        await conn.execute("UPDATE order_info SET current_status = 'confirmed' WHERE status = 'accepted'");
        await conn.execute("UPDATE order_info SET current_status = 'ملغي من المتجر' WHERE status = 'rejected'");
        await conn.execute("UPDATE order_info SET current_status = 'تم التوصيل' WHERE status = 'completed'");
      }
      
      console.log('  ✓ Orders backfilled with order numbers and current_status');
    } else {
      console.log('  - All orders already have order numbers, skipping backfill');
    }

    // Drop old status column
    const checkStatusRows = await conn.execute('SHOW COLUMNS FROM order_info LIKE ?', ['status']);
    const hasStatus = Array.isArray(checkStatusRows) && checkStatusRows.length > 0;
    if (hasStatus) {
      console.log('Dropping old status column...');
      try {
        await conn.execute('ALTER TABLE order_info DROP COLUMN status');
        console.log('  ✓ status column dropped');
      } catch (err) {
        console.log(`  - Could not drop status column: ${err.message}`);
      }
    } else {
      console.log('  - status column already removed, skipping');
    }

    // ============ FREE DELIVERY COLUMN ============
    const checkFreeDeliveryRows = await conn.execute('SHOW COLUMNS FROM order_info LIKE ?', ['free_delivery']);
    const hasFreeDelivery = Array.isArray(checkFreeDeliveryRows) && checkFreeDeliveryRows.length > 0;
    if (!hasFreeDelivery) {
      console.log('Adding free_delivery column to order_info...');
      await conn.execute("ALTER TABLE order_info ADD COLUMN free_delivery BOOLEAN DEFAULT 0 AFTER delivery_Price");
      console.log('  ✓ free_delivery column added');
    } else {
      console.log('  - free_delivery already exists, skipping');
    }

    // ============ LEFTED ORDERS TABLE ============
    const checkLeftedTable = await conn.execute("SHOW TABLES LIKE 'lefted_orders'");
    const hasLeftedTable = Array.isArray(checkLeftedTable) && checkLeftedTable.length > 0;
    if (!hasLeftedTable) {
      console.log('Creating lefted_orders table...');
      await conn.execute(`
        CREATE TABLE lefted_orders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          phone VARCHAR(20) NOT NULL DEFAULT '',
          first_name VARCHAR(100) DEFAULT '',
          last_name VARCHAR(100) DEFAULT '',
          wilaya VARCHAR(100) DEFAULT '',
          wilaya_code VARCHAR(10) DEFAULT '',
          baladiya VARCHAR(100) DEFAULT '',
          delivery_type VARCHAR(20) DEFAULT 'domicile',
          product_id INT,
          product_name VARCHAR(255) DEFAULT '',
          product_price DECIMAL(10,2) DEFAULT 0,
          quantity INT DEFAULT 1,
          color_name VARCHAR(255) DEFAULT '',
          color_hex VARCHAR(100) DEFAULT '',
          colors TEXT DEFAULT NULL,
          offer_text VARCHAR(255) DEFAULT '',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('  ✓ lefted_orders table created');
    } else {
      console.log('  - lefted_orders already exists, checking column sizes...');

      try { await conn.execute("ALTER TABLE lefted_orders MODIFY COLUMN color_name VARCHAR(255) DEFAULT ''"); console.log('  ✓ color_name widened'); } catch (_) {}
      try { await conn.execute("ALTER TABLE lefted_orders MODIFY COLUMN color_hex VARCHAR(100) DEFAULT ''"); console.log('  ✓ color_hex widened'); } catch (_) {}
    }

    const checkColorsColumn = await conn.execute("SHOW COLUMNS FROM lefted_orders LIKE 'colors'");
    const hasColorsColumn = Array.isArray(checkColorsColumn) && checkColorsColumn.length > 0;
    if (!hasColorsColumn) {
      console.log('Adding colors JSON column to lefted_orders...');
      try {
        await conn.execute("ALTER TABLE lefted_orders ADD COLUMN colors TEXT DEFAULT NULL AFTER color_hex");
        console.log('  ✓ colors column added');

        const backfillRows = await conn.execute("SELECT id, color_name, color_hex, quantity FROM lefted_orders WHERE color_name != '' AND colors IS NULL");
        const backfillData = Array.isArray(backfillRows) ? backfillRows : (backfillRows[0] || []);
        if (backfillData.length > 0) {
          console.log(`  Backfilling ${backfillData.length} rows with colors data...`);
          for (const row of backfillData) {
            const names = (row.color_name || '').split(/,\s*/).filter(Boolean);
            const hexes = (row.color_hex || '').split(',').filter(Boolean);
            const totalQty = Number(row.quantity) || 1;
            const perQty = Math.floor(totalQty / (names.length || 1));
            const colorsArr = names.map((name, i) => ({
              name,
              hex: hexes[i] || '',
              quantity: i === names.length - 1 ? totalQty - perQty * (names.length - 1) : perQty
            }));
            await conn.execute('UPDATE lefted_orders SET colors = ? WHERE id = ?', [JSON.stringify(colorsArr), row.id]);
          }
          console.log('  ✓ existing data backfilled');
        }
      } catch (err) {
        console.log(`  - Could not add colors column: ${err.message}`);
      }
    } else {
      console.log('  - colors column already exists, skipping');
    }

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
