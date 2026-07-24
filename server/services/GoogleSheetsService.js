import { google } from 'googleapis';
import { query } from '../db.js';

const HEADERS = [
  'التاريخ',
  'رقم الطلب',
  'اسم الزبون',
  'الهاتف',
  'الولاية',
  'البلدية',
  'التوصيل',
  'سعر التوصيل',
  'المنتجات',
  'السعر الإجمالي',
  'الحالة',
];

function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function translateDeliveryType(type) {
  if (type === 'domicile') return 'توصيل للمنزل';
  if (type === 'stopDesk') return 'تسليم للنقطة';
  return type || '';
}

const STATUS_MAP = {
  'new': 'جديد',
  "didn't respond to the call number 1": 'لم يرد على الاتصال رقم 1',
  "didn't respond to the call number 2": 'لم يرد على الاتصال رقم 2',
  "didn't respond to the call number 3": 'لم يرد على الاتصال رقم 3',
  'confirmed': 'مؤكد',
  'delayed': 'مؤجلة',
  'Delivered': 'تم التوصيل',
  'canceled by the shop': 'ملغي من المتجر',
  'canceled by the customer': 'ملغي من الزبون',
  'returned': 'مرجعة',
};

function translateStatus(status) {
  return STATUS_MAP[status] || status;
}

async function authenticateWithCredentials(credsJson) {
  const credentials = typeof credsJson === 'string' ? JSON.parse(credsJson) : credsJson;

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  await auth.authorize();
  return auth;
}

async function ensureHeaders(sheets, auth, fileId, sheetName) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: fileId,
      range: `${sheetName}!A1:K1`,
      auth,
    });

    if (!res.data.values || res.data.values.length === 0 || res.data.values[0].length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: fileId,
        range: `${sheetName}!A1:K1`,
        valueInputOption: 'USER_ENTERED',
        auth,
        requestBody: { values: [HEADERS] },
      });
    }
  } catch {
    await sheets.spreadsheets.values.update({
      spreadsheetId: fileId,
      range: `${sheetName}!A1:K1`,
      valueInputOption: 'USER_ENTERED',
      auth,
      requestBody: { values: [HEADERS] },
    });
  }
}

async function lookupProductNames(items) {
  const names = [];
  for (const item of items) {
    const rows = await query('SELECT name FROM products WHERE id = ?', [item.product_id]);
    const productName = rows.length > 0 ? rows[0].name : `#${item.product_id}`;
    names.push(`${productName} ×${item.quantity}`);
  }
  return names.join('، ');
}

function calculateTotalPrice(orderData) {
  const itemsTotal = orderData.items.reduce((sum, item) => sum + (item.quantity * item.price_per_unit), 0);
  return itemsTotal + (Number(orderData.delivery_Price) || 0);
}

export async function syncOrderToSheets(orderData) {
  try {
    const activeSheets = await query('SELECT * FROM google_sheets WHERE is_active = 1');
    if (activeSheets.length === 0) return;

    const credRows = await query('SELECT credentials FROM google_credentials WHERE id = 1');
    if (credRows.length === 0) return;

    const auth = await authenticateWithCredentials(credRows[0].credentials);
    const sheets = google.sheets({ version: 'v4', auth });

    const productsStr = await lookupProductNames(orderData.items);
    const totalPrice = calculateTotalPrice(orderData);

    const row = [
      formatDate(orderData.created_at || new Date()),
      orderData.orderNumber,
      `${orderData.first_name || ''} ${orderData.last_name || ''}`.trim(),
      orderData.phone || '',
      orderData.wilaya || '',
      orderData.baladiya || '',
      translateDeliveryType(orderData.delivery_type),
      Number(orderData.delivery_Price) || 0,
      productsStr,
      totalPrice,
      translateStatus(orderData.current_status || 'new'),
    ];

    for (const sheet of activeSheets) {
      try {
        await ensureHeaders(sheets, auth, sheet.file_id, sheet.paper_name);
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheet.file_id,
          range: `${sheet.paper_name}!A:K`,
          valueInputOption: 'USER_ENTERED',
          auth,
          requestBody: { values: [row] },
        });
        console.log(`✅ Order ${orderData.orderNumber} synced to sheet "${sheet.file_name}"`);
      } catch (err) {
        console.error(`❌ Failed to sync to sheet "${sheet.file_name}":`, err.message);
      }
    }
  } catch (err) {
    console.error('❌ Google Sheets sync error:', err.message);
  }
}
