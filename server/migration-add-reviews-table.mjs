import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT || 3306,
  ssl: {
    rejectUnauthorized: true,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

async function createReviewsTable() {
  let connection;
  try {
    console.log("Connecting to database...");
    connection = await pool.getConnection();

    console.log("Creating reviews table...");
    const [result] = await connection.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id INT NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        review_text TEXT,
        stars TINYINT NOT NULL CHECK (stars >= 1 AND stars <= 5),
        image_url VARCHAR(500) NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_product_id (product_id),
        INDEX idx_created_at (created_at)
      )
    `);

    console.log("✅ Reviews table created successfully!");
    console.log("Result:", result);

    // Verify table structure
    const [columns] = await connection.query("DESCRIBE reviews");
    console.log("\nTable structure:");
    columns.forEach(col => {
      console.log(`  ${col.Field} - ${col.Type} - ${col.Key || ''}`);
    });

  } catch (error) {
    console.error("❌ Error creating reviews table:", error);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

createReviewsTable();
