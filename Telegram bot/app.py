# ===== LOAD ENVIRONMENT VARIABLES FIRST =====
from dotenv import load_dotenv
load_dotenv()  # This loads your .env file

# ===== REST OF IMPORTS =====
import asyncio
import os
from datetime import datetime
from typing import Optional, Dict, Any, Set, List
import pymysql
from dbutils.pooled_db import PooledDB
from flask import Flask, request
import threading

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import Application, CallbackQueryHandler, CommandHandler, ContextTypes

# Create Flask app for health checks
flask_app = Flask(__name__)

@flask_app.route('/health')
def health_check():
    return {"status": "alive", "bot": "running"}, 200

# Your existing bot code here
BOT_TOKEN = os.getenv("BOT_TOKEN")
AUTHORIZED_ADMINS = os.getenv("ADMIN_IDS", "").split(",")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # ... your existing start handler

def run_bot():
    """Run the Telegram bot"""
    app = Application.builder().token(BOT_TOKEN).build()
    # Add your handlers
    app.run_polling()

def run_flask():
    """Run Flask for health checks"""
    flask_app.run(host='0.0.0.0', port=int(os.getenv('PORT', 8080)))

if __name__ == "__main__":
    # Run both in separate threads
    bot_thread = threading.Thread(target=run_bot)
    bot_thread.start()
    run_flask()

# ===== CONFIGURATION (reads from .env file) =====
BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_IDS_ENV = os.getenv("ADMIN_IDS", "")
AUTHORIZED_ADMINS = [aid.strip() for aid in ADMIN_IDS_ENV.split(",") if aid.strip()]

# Database Configuration
DB_CONFIG = {
    'host': os.getenv("DB_HOST"),
    'port': int(os.getenv("DB_PORT", 4000)),
    'user': os.getenv("DB_USER"),
    'password': os.getenv("DB_PASSWORD"),
    'database': os.getenv("DB_NAME"),
    'charset': 'utf8mb4',
    'autocommit': True,
}

# Print config for debugging (remove after working)
print(f"BOT_TOKEN loaded: {'Yes' if BOT_TOKEN else 'NO!'}")
print(f"ADMIN_IDS loaded: {AUTHORIZED_ADMINS}")
print(f"DB_HOST: {DB_CONFIG['host']}")
print(f"DB_NAME: {DB_CONFIG['database']}")

# ===== VALIDATE CONFIGURATION =====
if not BOT_TOKEN:
    print("❌ ERROR: BOT_TOKEN not found in .env file!")
    exit(1)

if not AUTHORIZED_ADMINS:
    print("❌ ERROR: ADMIN_IDS not found in .env file!")
    exit(1)

if not DB_CONFIG['host'] or not DB_CONFIG['database']:
    print("❌ ERROR: Database credentials not found in .env file!")
    exit(1)

# Track processed orders
processed_order_ids: Set[int] = set()
order_actioned_by: Dict[int, Dict[str, str]] = {}

# Connection pool
connection_pool = None

# ===== DATABASE FUNCTIONS =====

def init_db_pool():
    """Initialize database connection pool"""
    global connection_pool
    try:
        connection_pool = PooledDB(
            creator=pymysql,
            maxconnections=5,
            mincached=2,
            maxcached=5,
            blocking=True,
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database=DB_CONFIG['database'],
            charset=DB_CONFIG['charset'],
            autocommit=DB_CONFIG['autocommit']
        )
        print("✅ Database connection pool initialized")
        return True
    except Exception as e:
        print(f"❌ Failed to initialize database pool: {e}")
        return False

def get_db_connection():
    """Get connection from pool"""
    global connection_pool
    if connection_pool is None:
        if not init_db_pool():
            return None
    return connection_pool.connection()

def get_orders_by_status(status: str) -> list:
    """Fetch orders filtered by status"""
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
                o.status,
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
            WHERE o.status = %s
            ORDER BY o.id DESC
        """
        
        cursor.execute(query, (status,))
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
                    'status': row['status'],
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
        print(f"Error fetching {status} orders: {e}")
        return []
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def get_pending_orders() -> list:
    return get_orders_by_status('pending')

def update_order_status(order_id: int, new_status: str) -> bool:
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return False
            
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE order_info SET status = %s WHERE id = %s",
            (new_status, order_id)
        )
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        print(f"Error updating order {order_id}: {e}")
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def format_order_message(order: Dict) -> str:
    items_text = ""
    subtotal = 0
    
    for item in order['items']:
        item_total = item['quantity'] * item['price_per_unit']
        subtotal += item_total
        items_text += f"\n• {item['quantity']}x {item['product_name']} - ${item['price_per_unit']:.2f} = ${item_total:.2f}"
        
        if item.get('color_name'):
            items_text += f"\n  🎨 Color: {item['color_name']}"
        if item.get('offer_text'):
            items_text += f"\n  💫 Offer: {item['offer_text']}"
    
    total = subtotal + order['delivery_price']
    
    status_emoji = {'pending': '⏳', 'accepted': '✅', 'rejected': '❌'}.get(order['status'], '📦')
    
    message = f"""
{status_emoji} **ORDER #{order['order_id']}** [{order['status'].upper()}]
━━━━━━━━━━━━━━━━━━━

👤 **Customer:** {order['first_name']} {order['last_name']}
📞 **Phone:** {order['phone']}
📍 **Location:** {order['baladiya']}, {order['wilaya']}
🚚 **Delivery:** {order.get('delivery_type', 'Standard')}

📋 **Items:**{items_text}

━━━━━━━━━━━━━━━━━━━
💰 **TOTAL:** ${total:.2f}
━━━━━━━━━━━━━━━━━━━

⏰ **Time:** {order['created_at']}
"""
    return message

def get_order_action_keyboard(order_id: int, current_status: str) -> InlineKeyboardMarkup:
    if current_status == 'pending':
        keyboard = [
            [
                InlineKeyboardButton("✅ Approve", callback_data=f"approve_{order_id}"),
                InlineKeyboardButton("❌ Reject", callback_data=f"reject_{order_id}"),
            ]
        ]
    else:
        keyboard = [[InlineKeyboardButton("👁️ View", callback_data=f"view_{order_id}")]]
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
    
    pending = get_pending_orders()
    await update.message.reply_text(f"📊 Pending Orders: {len(pending)}")

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = str(update.effective_user.id)
    
    if user_id not in AUTHORIZED_ADMINS:
        await query.answer("Unauthorized!", show_alert=True)
        return
    
    await query.answer()
    callback_data = query.data
    action, order_id_str = callback_data.split("_")
    order_id = int(order_id_str)
    
    if action == "approve":
        success = update_order_status(order_id, "accepted")
        if success:
            await query.edit_message_text(f"✅ Order #{order_id} APPROVED!")
        else:
            await query.edit_message_text(f"❌ Failed to approve Order #{order_id}")
    
    elif action == "reject":
        success = update_order_status(order_id, "rejected")
        if success:
            await query.edit_message_text(f"❌ Order #{order_id} REJECTED!")
        else:
            await query.edit_message_text(f"❌ Failed to reject Order #{order_id}")

async def check_new_orders(context: ContextTypes.DEFAULT_TYPE):
    global processed_order_ids
    try:
        pending_orders = get_pending_orders()
        
        for order in pending_orders:
            order_id = order['order_id']
            
            if order_id not in processed_order_ids:
                message = format_order_message(order)
                keyboard = get_order_action_keyboard(order_id, 'pending')
                
                for admin_id in AUTHORIZED_ADMINS:
                    try:
                        await context.bot.send_message(
                            chat_id=admin_id,
                            text=f"🆕 NEW ORDER #{order_id}!\n\n{message}",
                            reply_markup=keyboard,
                            parse_mode="Markdown"
                        )
                    except Exception as e:
                        print(f"Failed to send to {admin_id}: {e}")
                
                processed_order_ids.add(order_id)
                await asyncio.sleep(0.5)
        
        if len(processed_order_ids) > 1000:
            processed_order_ids.clear()
    except Exception as e:
        print(f"Error: {e}")

# ===== MAIN =====

def main():
    print("🤖 Starting Order Bot...")
    
    # Initialize database
    if not init_db_pool():
        print("❌ Failed to connect to database. Check your .env settings.")
        return
    
    # Create application
    app = Application.builder().token(BOT_TOKEN).build()
    
    # Add handlers
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("status", status_command))
    app.add_handler(CallbackQueryHandler(button_callback))
    
    # Add background job
    job_queue = app.job_queue
    if job_queue:
        job_queue.run_repeating(check_new_orders, interval=10, first=1)
        print("✅ Background job scheduled")
    
    print(f"✅ Bot running with {len(AUTHORIZED_ADMINS)} admin(s)")
    app.run_polling()

if __name__ == "__main__":
    main()