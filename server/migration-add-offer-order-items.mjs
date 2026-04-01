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
    console.log('Running migration: add offer_text column to order_items...');
    await pool.query(`
      ALTER TABLE order_items
      ADD COLUMN offer_text TEXT NULL;
    `);
    console.log('Migration completed successfully: added offer_text column to order_items');
  } catch (error) {
    console.error('Migration failed:', error.message);
    if (!error.message.toLowerCase().includes('duplicate column') && !error.message.toLowerCase().includes('already exists')) {
      throw error;
    }
    console.log('Column already exists, skipping.');
  } finally {
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
