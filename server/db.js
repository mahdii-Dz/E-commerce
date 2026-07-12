// db.js
import { connect } from '@tidbcloud/serverless';

let connection = null;

export const getConnection = async () => {
  if (!connection) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    console.log('🔌 Creating new database connection...');
    connection = connect({ url: databaseUrl });
  }
  return connection;
};

// For queries that return rows (SELECT, SHOW, etc)
export const query = async (sql, params = []) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(sql, params);
    
    // Handle different response formats from TiDB Serverless
    let rows = [];
    
    if (Array.isArray(result)) {
      // TiDB Serverless returns [[rows], [fields]] format
      if (result.length > 0 && Array.isArray(result[0])) {
        rows = result[0];
      } else {
        // Direct array of rows
        rows = result;
      }
    } else if (result && typeof result === 'object') {
      if (Array.isArray(result.rows)) {
        rows = result.rows;
      } else if (Array.isArray(result.data)) {
        rows = result.data;
      } else if (result.affectedRows !== undefined) {
        // This is likely an INSERT/UPDATE/DELETE result, return empty array
        rows = [];
      } else {
        rows = [];
      }
    }
    
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error('❌ Query failed:', error);
    throw error;
  }
};

// For queries that modify data (INSERT, UPDATE, DELETE)
export const execute = async (sql, params = []) => {
  const conn = await getConnection();
  try {
    const raw = await conn.execute(sql, params);
    const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
    
    // The @tidbcloud/serverless v0.3.0 driver returns [] for all mutation queries
    const isEmptyArray = Array.isArray(raw) && raw.length === 0;
    
    if (isEmptyArray) {
      // Fall back to LAST_INSERT_ID() / ROW_COUNT() to get metadata
      const metaRaw = await conn.execute('SELECT LAST_INSERT_ID() AS insertId, ROW_COUNT() AS rowCount');
      const meta = Array.isArray(metaRaw) && Array.isArray(metaRaw[0]) ? metaRaw[0][0] : (Array.isArray(metaRaw) ? metaRaw[0] : metaRaw);
      
      return {
        affectedRows: Number(meta?.rowCount || 0),
        insertId: isInsert ? Number(meta?.insertId || 0) : 0,
        changedRows: Number(meta?.rowCount || 0),
      };
    }

    const result = Array.isArray(raw) ? raw[0] : raw;

    // Normalize the result - handle various response formats
    let affectedRows = 0;
    let insertId = 0;
    let changedRows = 0;
    
    // Try to extract values from result object
    if (result) {
      // Standard MySQL driver format
      if (result.affectedRows !== undefined) {
        affectedRows = result.affectedRows;
      } else if (result.rowsAffected !== undefined) {
        affectedRows = result.rowsAffected;
      } else if (result.numRows !== undefined) {
        affectedRows = result.numRows;
      }
      
      // Try different property names for insert ID
      if (result.insertId !== undefined && result.insertId > 0) {
        insertId = result.insertId;
      } else if (result.lastInsertId !== undefined && result.lastInsertId > 0) {
        insertId = result.lastInsertId;
      }
      
      // Changed rows
      if (result.changedRows !== undefined) {
        changedRows = result.changedRows;
      } else if (result.numRows !== undefined) {
        changedRows = result.numRows;
      }
    }

    return {
      affectedRows,
      insertId,
      changedRows
    };
  } catch (error) {
    console.error('❌ Statement failed:', error);
    throw error;
  }
};

// Legacy support for executeQuery
export const executeQuery = execute;
