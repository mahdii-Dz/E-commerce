# ===== LOAD ENVIRONMENT VARIABLES FIRST =====
from dotenv import load_dotenv
load_dotenv()

# ===== REST OF IMPORTS =====
import os
import sys
import threading
import html
from datetime import datetime, timedelta, timezone
from urllib.parse import quote
from typing import Dict
import pymysql
from dbutils.pooled_db import PooledDB
from flask import Flask, request

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import Application, CommandHandler, ContextTypes

# ===== FLASK APP FOR HEALTH CHECKS & CALL REDIRECT =====
flask_app = Flask(__name__)

# Fix Windows console encoding for emoji log output
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

def format_phone(phone: str) -> str:
    phone = phone.strip()
    if phone.startswith('+213'):
        return phone
    if phone.startswith('0'):
        return '+213' + phone[1:]
    return '+213' + phone

@flask_app.route('/')
@flask_app.route('/health')
def health_check():
    """Health check endpoint to keep the bot alive"""
    return {"status": "alive", "bot": "running", "timestamp": datetime.now().isoformat()}, 200

@flask_app.route('/call')
def call_phone():
    """Redirect to tel: URI so the mobile phone dialer opens"""
    phone = request.args.get('phone', '')
    if not phone:
        return "No phone number provided", 400
    tel_uri = f"tel:{format_phone(phone)}"
    return f'<meta http-equiv="refresh" content="0; url={tel_uri}"><p>Redirecting to call {phone}...</p>'

# ===== CONFIGURATION =====
BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_IDS_ENV = os.getenv("ADMIN_IDS", "")
AUTHORIZED_ADMINS = [aid.strip() for aid in ADMIN_IDS_ENV.split(",") if aid.strip()]

# ===== DATABASE CONFIGURATION =====
def get_db_connection_config():
    """Create plain MySQL DB config (no SSL, works with localhost or a VPS)"""
    return {
        'host': os.getenv("DB_HOST", "127.0.0.1"),
        'port': int(os.getenv("DB_PORT", 3306)),
        'user': os.getenv("DB_USER", "root"),
        'password': os.getenv("DB_PASSWORD", ""),
        'database': os.getenv("DB_NAME", "e_commerce"),
        'charset': 'utf8mb4',
        'autocommit': True,
        'connect_timeout': 15,
    }

db_pool = None

def get_db_pool():
    """Lazily create a shared connection pool (thread-safe)"""
    global db_pool
    if db_pool is None:
        db_pool = PooledDB(
            creator=pymysql,
            maxconnections=int(os.getenv("DB_POOL_SIZE", 5)),
            mincached=1,
            maxcached=5,
            blocking=True,
            ping=1,
            **get_db_connection_config(),
        )
        print(f"✅ Connection pool ready (max {int(os.getenv('DB_POOL_SIZE', 5))})")
    return db_pool

# Print config for debugging
print(f"🤖 Starting Order Bot...")
print(f"BOT_TOKEN loaded: {'✅ Yes' if BOT_TOKEN else '❌ NO!'}")
print(f"ADMIN_IDS loaded: {AUTHORIZED_ADMINS}")
print(f"DB_HOST: {os.getenv('DB_HOST')}")
print(f"DB_NAME: {os.getenv('DB_NAME')}")
print(f"DB_USER: {'✅ Yes' if os.getenv('DB_USER') else '❌ NO!'}")
print(f"DB_PASSWORD: {'✅ Yes' if os.getenv('DB_PASSWORD') else '❌ NO!'}")

# ===== VALIDATE CONFIGURATION =====
if not BOT_TOKEN:
    print("❌ ERROR: BOT_TOKEN not found!")
    exit(1)

if not AUTHORIZED_ADMINS:
    print("❌ ERROR: ADMIN_IDS not found!")
    exit(1)

# ===== DATABASE FUNCTIONS =====

def get_db_connection():
    """Get a connection from the pool"""
    try:
        conn = get_db_pool().connection()
        conn.ping(reconnect=True)
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        return None

def init_notified_column():
    """Add telegram_notified column if it doesn't exist (MySQL-compatible)"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return False
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_info' "
            "AND COLUMN_NAME = 'telegram_notified'"
        )
        if cursor.fetchone()[0] == 0:
            cursor.execute(
                "ALTER TABLE order_info ADD COLUMN telegram_notified TINYINT(1) DEFAULT 0"
            )
            conn.commit()
        print("✅ telegram_notified column ready")
        return True
    except Exception as e:
        print(f"⚠️ Could not add telegram_notified column (may already exist): {e}")
        return True
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def get_new_orders() -> list:
    """Fetch orders that are new and not yet notified to Telegram"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return []
            
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        query = """
            SELECT 
                o.id AS order_id,
                o.first_name,
                o.last_name,
                o.phone,
                o.wilaya,
                o.baladiya,
                o.wilaya_code,
                o.delivery_type,
                o.delivery_Price,
                o.current_status,
                o.created_at,
                oi.id AS item_id,
                oi.product_id,
                oi.quantity,
                oi.price_per_unit,
                oi.color_name,
                oi.color_hex,
                oi.offer_text,
                p.name AS product_name
            FROM order_info o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.current_status = 'new' AND (o.telegram_notified IS NULL OR o.telegram_notified = 0)
            ORDER BY o.id ASC
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        if not rows:
            return []
        
        orders_dict = {}
        for row in rows:
            order_id = row['order_id']
            
            if order_id not in orders_dict:
                orders_dict[order_id] = {
                    'order_id': row['order_id'],
                    'first_name': row['first_name'],
                    'last_name': row['last_name'],
                    'phone': row['phone'],
                    'wilaya': row['wilaya'],
                    'baladiya': row['baladiya'],
                    'wilaya_code': row['wilaya_code'],
                    'delivery_type': row['delivery_type'],
                    'delivery_price': float(row['delivery_Price']) if row['delivery_Price'] else 0,
                    'created_at': row['created_at'],
                    'items': []
                }
            
            orders_dict[order_id]['items'].append({
                'product_name': row['product_name'],
                'quantity': row['quantity'],
                'price_per_unit': float(row['price_per_unit']),
                'color_name': row['color_name'],
                'color_hex': row['color_hex'],
                'offer_text': row['offer_text']
            })
        
        return list(orders_dict.values())
        
    except Exception as e:
        print(f"Error fetching new orders: {e}")
        return []
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def get_new_orders_count() -> int:
    """Count new orders not yet notified"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return 0
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM order_info WHERE current_status = 'new' AND (telegram_notified IS NULL OR telegram_notified = 0)"
        )
        return cursor.fetchone()[0] or 0
    except Exception as e:
        print(f"Error counting new orders: {e}")
        return 0
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def mark_as_notified(order_id: int) -> bool:
    """Mark order as notified to prevent re-sending on restart"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return False
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE order_info SET telegram_notified = 1 WHERE id = %s",
            (order_id,)
        )
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        print(f"Error marking order {order_id} as notified: {e}")
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def h(text) -> str:
    return html.escape(str(text or ""))

def format_order_message(order: Dict) -> str:
    from collections import defaultdict
    items_text = ""
    subtotal = 0

    delivery_labels = {
        'domicile': '📬 Home Delivery',
        'stopdesk': '📦 Stop Desk',
    }
    delivery_label = delivery_labels.get(order.get('delivery_type', ''), order.get('delivery_type', 'Standard'))

    # Group items by (product_name, offer_text)
    grouped = defaultdict(list)
    for item in order['items']:
        key = (item['product_name'], item.get('offer_text'))
        grouped[key].append(item)

    for (product_name, offer_text), items in grouped.items():
        color_parts = []
        for it in items:
            qty = it['quantity']
            subtotal += qty * it['price_per_unit']
            color = it.get('color_name', '')
            if color:
                color_parts.append(f"{qty} x {h(color)}")
            else:
                color_parts.append(str(qty))
        colors_str = ", ".join(color_parts)
        line = h(product_name)
        if offer_text:
            line += f" - Offer: {h(offer_text)}"
        line += f" ({colors_str})"
        items_text += f"\n• {line}"

    total = subtotal + order['delivery_price']

    # Timezone conversion to Algeria (UTC+1)
    created = order['created_at']
    if isinstance(created, datetime):
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        algeria_time = created.astimezone(timezone(timedelta(hours=1)))
        time_str = algeria_time.strftime("%Y-%m-%d %H:%M:%S")
    else:
        time_str = str(created)

    message = f"""
━━━━━━━━━━━━━━━━━━━
🆕 <b>ORDER #{order['order_id']}</b>
━━━━━━━━━━━━━━━━━━━

👤 <b>Customer:</b> {h(order['first_name'])} {h(order['last_name'])}
📞 <b>Phone:</b> <code>{h(order['phone'])}</code>
📍 <b>Location:</b> {h(order['baladiya'])}, {h(order['wilaya'])}
🚚 <b>Delivery:</b> {delivery_label}

🛍️ <b>Items:</b> ({len(order['items'])}){items_text}

─────────────────────
━━━━━━━━━━━━━━━━━━━
📦 <b>Subtotal:</b> {subtotal:,.0f} DA
🚚 <b>Delivery:</b> {order['delivery_price']:,.0f} DA
━━━━━━━━━━━━━━━━━━━
💰 <b>TOTAL: {total:,.0f} DA</b>
━━━━━━━━━━━━━━━━━━━

⏰ <b>Time:</b> {time_str} DZ (UTC+1)
"""
    return message

def get_call_url(phone: str) -> str:
    base = os.getenv("CALL_BASE_URL", "https://la-maison-dor-store.netlify.app")
    return f"{base}/call?phone={quote(phone)}"

def get_phone_keyboard(phone: str) -> InlineKeyboardMarkup:
    keyboard = [
        [InlineKeyboardButton("📞 Call Customer", url=get_call_url(phone))]
    ]
    return InlineKeyboardMarkup(keyboard)

# ===== TELEGRAM HANDLERS =====

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = str(update.effective_user.id)
    if user_id not in AUTHORIZED_ADMINS:
        await update.message.reply_text("⛔ Unauthorized")
        return
    
    await update.message.reply_text(
        "🤖 Order Bot Active!\n\nI'll notify you when new orders arrive.\n\n/status - Check bot status"
    )

async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = str(update.effective_user.id)
    if user_id not in AUTHORIZED_ADMINS:
        await update.message.reply_text("⛔ Unauthorized")
        return
    
    count = get_new_orders_count()
    await update.message.reply_text(f"📊 New Orders: {count}")

async def check_new_orders(context: ContextTypes.DEFAULT_TYPE):
    try:
        new_orders = get_new_orders()
        
        for order in new_orders:
            order_id = order['order_id']
            message = format_order_message(order)
            keyboard = get_phone_keyboard(order['phone'])
            
            all_sent = True
            for admin_id in AUTHORIZED_ADMINS:
                try:
                    await context.bot.send_message(
                        chat_id=admin_id,
                        text=message,
                        reply_markup=keyboard,
                        parse_mode="HTML"
                    )
                    print(f"📨 Sent order #{order_id} to admin {admin_id}")
                except Exception as e:
                    print(f"Failed to send to {admin_id}: {e}")
                    all_sent = False
            
            if all_sent:
                mark_as_notified(order_id)
                print(f"✅ Order #{order_id} marked as notified")
                
    except Exception as e:
        print(f"Error checking orders: {e}")

# ===== MAIN =====

def main():
    """Main function to run the bot"""
    print("🚀 Starting bot...")
    
    # Ensure tracking column exists
    init_notified_column()
    
    # Create application
    app = Application.builder().token(BOT_TOKEN).build()
    
    # Add handlers
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("status", status_command))
    
    # Add background job
    job_queue = app.job_queue
    if job_queue:
        job_queue.run_repeating(check_new_orders, interval=10, first=1)
        print("✅ Background job scheduled (every 10 seconds)")
    
    print(f"✅ Bot running with {len(AUTHORIZED_ADMINS)} admin(s)")
    
    # Start the bot - this handles its own event loop
    app.run_polling()

def run_flask():
    """Run Flask in a separate thread"""
    port = int(os.getenv("PORT", 10000))
    flask_app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)

if __name__ == "__main__":
    # Start Flask in a background thread
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    print("🚀 Flask health check server started")
    
    # Run the bot in the main thread
    main()