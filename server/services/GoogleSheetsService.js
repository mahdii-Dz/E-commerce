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
  'المنتج',
  'الكمية',
  'العرض',
  'الكمية لكل لون',
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
      range: `${sheetName}!A1:N1`,
      auth,
    });

    if (!res.data.values || res.data.values.length === 0 || res.data.values[0].length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: fileId,
        range: `${sheetName}!A1:N1`,
        valueInputOption: 'USER_ENTERED',
        auth,
        requestBody: { values: [HEADERS] },
      });
    }
  } catch {
    await sheets.spreadsheets.values.update({
      spreadsheetId: fileId,
      range: `${sheetName}!A1:N1`,
      valueInputOption: 'USER_ENTERED',
      auth,
      requestBody: { values: [HEADERS] },
    });
  }
}

async function lookupProductNames(items) {
  const seen = new Set();
  const names = [];
  for (const item of items) {
    if (seen.has(item.product_id)) continue;
    seen.add(item.product_id);
    const rows = await query('SELECT name FROM products WHERE id = ?', [item.product_id]);
    const productName = rows.length > 0 ? rows[0].name : `#${item.product_id}`;
    names.push(productName);
  }
  return names.join('، ');
}

function calculateTotalPrice(orderData) {
  const itemsTotal = orderData.items.reduce((sum, item) => sum + (item.quantity * item.price_per_unit), 0);
  return itemsTotal + (Number(orderData.delivery_Price) || 0);
}

function buildOfferString(items) {
  const offers = [...new Set(items.map(i => i.offer_text).filter(Boolean))];
  return offers.join(', ');
}

function buildColorsString(items) {
  return items
    .filter(i => i.color_name)
    .map(i => `${i.color_name} (${i.quantity})`)
    .join(', ');
}

export async function syncOrderToSheets(orderData) {
  try {
    const activeSheets = await query('SELECT * FROM google_sheets WHERE is_active = 1');
    if (activeSheets.length === 0) return;

    const credRows = await query('SELECT credentials FROM google_credentials WHERE id = 1');
    if (credRows.length === 0) return;

    const auth = await authenticateWithCredentials(credRows[0].credentials);
    const sheets = google.sheets({ version: 'v4', auth });

    const productNames = await lookupProductNames(orderData.items);
    const totalQty = orderData.items.reduce((s, i) => s + Number(i.quantity), 0);
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
      productNames,
      totalQty,
      buildOfferString(orderData.items),
      buildColorsString(orderData.items),
      totalPrice,
      translateStatus(orderData.current_status || 'new'),
    ];

    for (const sheet of activeSheets) {
      try {
        await ensureHeaders(sheets, auth, sheet.file_id, sheet.paper_name);
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheet.file_id,
          range: `${sheet.paper_name}!A:N`,
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

export async function updateOrderRowInSheets(orderId) {
  try {
    const rows = await query(`
      SELECT 
        o.order_number, o.first_name, o.last_name, o.phone,
        o.wilaya, o.baladiya, o.delivery_type, o.delivery_Price,
        o.current_status, o.created_at,
        oi.product_id, oi.quantity, oi.price_per_unit,
        oi.color_name, oi.color_hex, oi.offer_text
      FROM order_info o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ?
    `, [orderId]);

    if (!rows || rows.length === 0) return;

    const items = rows.map(r => ({
      product_id: r.product_id,
      quantity: r.quantity,
      price_per_unit: r.price_per_unit,
      color_name: r.color_name,
      color_hex: r.color_hex,
      offer_text: r.offer_text,
    }));

    const orderData = {
      orderNumber: rows[0].order_number,
      first_name: rows[0].first_name,
      last_name: rows[0].last_name,
      phone: rows[0].phone,
      wilaya: rows[0].wilaya,
      baladiya: rows[0].baladiya,
      delivery_type: rows[0].delivery_type,
      delivery_Price: rows[0].delivery_Price,
      current_status: rows[0].current_status,
      created_at: rows[0].created_at,
      items,
    };

    const productNames = await lookupProductNames(items);
    const totalQty = items.reduce((s, i) => s + Number(i.quantity), 0);
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
      productNames,
      totalQty,
      buildOfferString(orderData.items),
      buildColorsString(orderData.items),
      totalPrice,
      translateStatus(orderData.current_status || 'new'),
    ];

    const activeSheets = await query('SELECT * FROM google_sheets WHERE is_active = 1');
    if (activeSheets.length === 0) return;

    const credRows = await query('SELECT credentials FROM google_credentials WHERE id = 1');
    if (credRows.length === 0) return;

    const auth = await authenticateWithCredentials(credRows[0].credentials);
    const sheets = google.sheets({ version: 'v4', auth });

    for (const sheet of activeSheets) {
      try {
        await ensureHeaders(sheets, auth, sheet.file_id, sheet.paper_name);

        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: sheet.file_id,
          range: `${sheet.paper_name}!B:B`,
          auth,
        });

        const values = res.data.values || [];
        let rowIndex = -1;
        for (let i = 1; i < values.length; i++) {
          const cell = values[i] && values[i][0];
          if (cell && String(cell).trim() === String(orderData.orderNumber).trim()) {
            rowIndex = i + 1;
            break;
          }
        }

        if (rowIndex > 0) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheet.file_id,
            range: `${sheet.paper_name}!A${rowIndex}:N${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            auth,
            requestBody: { values: [row] },
          });
          console.log(`Order ${orderData.orderNumber} updated in sheet "${sheet.file_name}"`);
        } else {
          await sheets.spreadsheets.values.append({
            spreadsheetId: sheet.file_id,
            range: `${sheet.paper_name}!A:N`,
            valueInputOption: 'USER_ENTERED',
            auth,
            requestBody: { values: [row] },
          });
          console.log(`Order ${orderData.orderNumber} appended to sheet "${sheet.file_name}" (was missing)`);
        }
      } catch (err) {
        console.error(`Failed to update order in sheet "${sheet.file_name}":`, err.message);
      }
    }
  } catch (err) {
    console.error('Google Sheets update error:', err.message);
  }
}
