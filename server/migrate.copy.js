import mysql from 'mysql2/promise';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

const DUMP_FILE = 'data-dump.json';

const SOURCE = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'mahdi0104',
  database: 'e_commerce',
};

const TARGET = {
  host: '127.0.0.1',
  port: 3307,
  user: 'root',
  password: 'mahdi0104',
  database: 'e_commerce',
};

const ALL_TABLES = [
  'categories',
  'products',
  'wilayas',
  'shop_workers',
  'product_categories',
  'baladiyas',
  'order_info',
  'order_items',
  'reviews',
  'lefted_orders',
  'banners',
  'shop_header',
  'google_credentials',
  'google_sheets',
  'worker_sessions',
];

// Tables must be truncated in this order (no FK dependencies on later tables)
const TRUNCATE_ORDER = [
  'worker_sessions',
  'google_sheets',
  'google_credentials',
  'shop_header',
  'banners',
  'lefted_orders',
  'reviews',
  'order_items',
  'order_info',
  'baladiyas',
  'product_categories',
  'shop_workers',
  'wilayas',
  'products',
  'categories',
];

// Tables must be inserted in this order (FK dependencies satisfied)
const INSERT_ORDER = [
  'categories',
  'products',
  'wilayas',
  'shop_workers',
  'product_categories',
  'baladiyas',
  'order_info',
  'order_items',
  'reviews',
  'lefted_orders',
  'banners',
  'shop_header',
  'google_credentials',
  'google_sheets',
  'worker_sessions',
];

async function createConnection(config) {
  return mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
  });
}

async function dumpData() {
  console.log(`[DUMP] Connecting to MySQL at ${SOURCE.host}:${SOURCE.port}...`);
  const conn = await createConnection(SOURCE);

  const data = {};

  for (const table of ALL_TABLES) {
    const [rows] = await conn.execute(`SELECT * FROM \`${table}\``);
    data[table] = rows;
    console.log(`[DUMP] ${table}: ${rows.length} rows`);
  }

  await conn.end();

  await writeFile(DUMP_FILE, JSON.stringify(data, null, 2));
  console.log(`[DUMP] Written to ${DUMP_FILE}`);
}

async function restoreData() {
  if (!existsSync(DUMP_FILE)) {
    console.error(`[RESTORE] ${DUMP_FILE} not found — run "node migrate.copy.js dump" first`);
    process.exit(1);
  }

  console.log(`[RESTORE] Connecting to MySQL at ${TARGET.host}:${TARGET.port}...`);
  const conn = await createConnection(TARGET);

  const raw = await readFile(DUMP_FILE, 'utf-8');
  const data = JSON.parse(raw);

  // Disable FK checks for truncation
  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

  // Truncate all tables
  for (const table of TRUNCATE_ORDER) {
    await conn.execute(`TRUNCATE TABLE \`${table}\``);
    console.log(`[RESTORE] Truncated ${table}`);
  }

  // Insert data in FK-safe order
  for (const table of INSERT_ORDER) {
    const rows = data[table];
    if (!rows || rows.length === 0) {
      console.log(`[RESTORE] ${table}: 0 rows (skipped)`);
      continue;
    }

    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const colNames = columns.map(c => `\`${c}\``).join(', ');

    const insertSQL = `INSERT INTO \`${table}\` (${colNames}) VALUES (${placeholders})`;

    for (const row of rows) {
      const values = columns.map(col => {
        const val = row[col];
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
          return val.slice(0, 19).replace('T', ' ');
        }
        return val;
      });
      await conn.execute(insertSQL, values);
    }

    console.log(`[RESTORE] ${table}: ${rows.length} rows inserted`);
  }

  // Re-enable FK checks
  await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
  await conn.end();

  console.log('[RESTORE] Done');
}

async function main() {
  const command = process.argv[2];

  if (command === 'dump') {
    await dumpData();
  } else if (command === 'restore') {
    await restoreData();
  } else {
    console.log('Usage: node migrate.copy.js <dump|restore>');
    console.log('  dump    — read local MySQL → data-dump.json');
    console.log('  restore — read data-dump.json → Docker MySQL');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
