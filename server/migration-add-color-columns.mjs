import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function runMigration() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 3306,
    ssl: { rejectUnauthorized: true },
  });

  try {
    console.log('Running migration...');
    await pool.query(`
      ALTER TABLE order_items
      ADD COLUMN color_name VARCHAR(100) NULL,
      ADD COLUMN color_hex VARCHAR(20) NULL;
    `);
    console.log('Migration completed successfully: added color_name and color_hex columns to order_items');
  } catch (error) {
    console.error('Migration failed:', error.message);
    if (!error.message.toLowerCase().includes('duplicate column') && !error.message.toLowerCase().includes('already exists')) {
      throw error;
    }
    console.log('Columns already exist, skipping.');
  } finally {
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
