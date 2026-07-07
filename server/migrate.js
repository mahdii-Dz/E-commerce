import { connect } from '@tidbcloud/serverless';

const DATABASE_URL = 'mysql://4TQx8c28i1TxM2L.root:GQtGpmMlHhGVNU0t@gateway01.eu-central-1.prod.aws.tidbcloud.com/e_commerce';

async function migrate() {
  const conn = connect({ url: DATABASE_URL });
  
  try {
    console.log('Connecting to TiDB...');
    


    // Make last_name nullable in order_info
    const checkLastNameRows = await conn.execute('SHOW COLUMNS FROM order_info LIKE ?', ['last_name']);
    const hasLastName = Array.isArray(checkLastNameRows) && checkLastNameRows.length > 0;
    if (hasLastName) {
      const lastCol = checkLastNameRows[0];
      if (lastCol.Null === 'NO') {
        console.log('Making last_name nullable...');
        await conn.execute(`ALTER TABLE order_info MODIFY last_name VARCHAR(255) NULL`);
        console.log('  ✓ last_name is now nullable');
      } else {
        console.log('  - last_name already nullable, skipping');
      }
    } else {
      console.log('  - last_name column not found in order_info, skipping');
    }

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
