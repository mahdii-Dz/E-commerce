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

    // Add compare_price column to products table
    const checkComparePriceRows = await conn.execute('SHOW COLUMNS FROM products LIKE ?', ['compare_price']);
    const hasComparePrice = Array.isArray(checkComparePriceRows) && checkComparePriceRows.length > 0;
    if (!hasComparePrice) {
      console.log('Adding compare_price column to products...');
      await conn.execute('ALTER TABLE products ADD COLUMN compare_price DECIMAL(10,2) DEFAULT 0 AFTER price');
      console.log('  ✓ compare_price column added');
    } else {
      console.log('  - compare_price already exists, skipping');
    }

    // Add landing_page_image column to products table
    const checkLandingPageImageRows = await conn.execute('SHOW COLUMNS FROM products LIKE ?', ['landing_page_image']);
    const hasLandingPageImage = Array.isArray(checkLandingPageImageRows) && checkLandingPageImageRows.length > 0;
    if (!hasLandingPageImage) {
      console.log('Adding landing_page_image column to products...');
      await conn.execute('ALTER TABLE products ADD COLUMN landing_page_image VARCHAR(500) DEFAULT NULL AFTER images');
      console.log('  ✓ landing_page_image column added');
    } else {
      console.log('  - landing_page_image already exists, skipping');
    }

    // Enlarge big_description column to MEDIUMTEXT for rich HTML content
    const checkBigDescriptionRows = await conn.execute('SHOW COLUMNS FROM products LIKE ?', ['big_description']);
    const hasBigDescription = Array.isArray(checkBigDescriptionRows) && checkBigDescriptionRows.length > 0;
    if (hasBigDescription) {
      const col = checkBigDescriptionRows[0];
      const currentType = col.Type || '';
      if (currentType.toLowerCase() === 'text') {
        console.log('Enlarging big_description to MEDIUMTEXT...');
        await conn.execute('ALTER TABLE products MODIFY big_description MEDIUMTEXT');
        console.log('  ✓ big_description is now MEDIUMTEXT');
      } else {
        console.log(`  - big_description is already ${currentType}, skipping`);
      }
    }

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
