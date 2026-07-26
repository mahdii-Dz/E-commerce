import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'e_commerce',
  waitForConnections: true,
  connectionLimit: 10,
});

export const query = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params);
  return rows;
};

export const execute = async (sql, params = []) => {
  const [result] = await pool.query(sql, params);
  return {
    affectedRows: result.affectedRows,
    insertId: result.insertId,
    changedRows: result.changedRows,
  };
};

export const executeQuery = execute;
