import { connect } from '@tidbcloud/serverless';

const DATABASE_URL = 'mysql://4TQx8c28i1TxM2L.root:GQtGpmMlHhGVNU0t@gateway01.eu-central-1.prod.aws.tidbcloud.com/e_commerce';

async function migrate() {
  const conn = connect({ url: DATABASE_URL });
  
  try {
    console.log('Connecting to TiDB...');
    
    // Check if stock column exists
    const [checkStock] = await conn.execute(`SHOW COLUMNS FROM products LIKE 'stock'`);
    const hasStock = Array.isArray(checkStock) && checkStock.length > 0;
    if (hasStock) {
      console.log('Dropping column: stock');
      await conn.execute(`ALTER TABLE products DROP COLUMN stock`);
      console.log('  ✓ stock dropped');
    } else {
      console.log('  - stock column already removed, skipping');
    }

    // Check if big_description column exists
    const [checkBigDesc] = await conn.execute(`SHOW COLUMNS FROM products LIKE 'big_description'`);
    const hasBigDesc = Array.isArray(checkBigDesc) && checkBigDesc.length > 0;
    if (!hasBigDesc) {
      console.log('Adding column: big_description TEXT');
      await conn.execute(`ALTER TABLE products ADD COLUMN big_description TEXT`);
      console.log('  ✓ big_description added');
    } else {
      console.log('  - big_description column already exists, skipping');
    }

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
