# ===== LOAD ENVIRONMENT VARIABLES FIRST =====
from dotenv import load_dotenv
load_dotenv()

# ===== REST OF IMPORTS =====
import asyncio
import os
import threading
from datetime import datetime
from typing import Optional, Dict, Any, Set, List
import pymysql
from dbutils.pooled_db import PooledDB
from flask import Flask

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import Application, CallbackQueryHandler, CommandHandler, ContextTypes

# ===== FLASK APP FOR HEALTH CHECKS =====
flask_app = Flask(__name__)

@flask_app.route('/')
@flask_app.route('/health')
def health_check():
    """Health check endpoint to keep the bot alive"""
    return {"status": "alive", "bot": "running", "timestamp": datetime.now().isoformat()}, 200

# ===== CONFIGURATION =====
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

# Print config for debugging
print(f"🤖 Starting Order Bot...")
print(f"BOT_TOKEN loaded: {'✅ Yes' if BOT_TOKEN else '❌ NO!'}")
print(f"ADMIN_IDS loaded: {AUTHORIZED_ADMINS}")
print(f"DB_HOST: {DB_CONFIG['host']}")
print(f"DB_NAME: {DB_CONFIG['database']}")

# ===== VALIDATE CONFIGURATION =====
if not BOT_TOKEN:
    print("❌ ERROR: BOT_TOKEN not found in environment variables!")
    exit(1)

if not AUTHORIZED_ADMINS:
    print("❌ ERROR: ADMIN_IDS not found in environment variables!")
    exit(1)

if not DB_CONFIG['host'] or not DB_CONFIG['database']:
    print("❌ ERROR: Database credentials not found!")
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
    """Fetch all pending orders"""
    return get_orders_by_status('pending')

def update_order_status(order_id: int, new_status: str) -> bool:
    """Update order status"""
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
    """Format order into readable message"""
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
    
    delivery_display = {
        'standard': '📦 Standard',
        'express': '⚡ Express',
        'pickup': '🏪 Pickup'
    }.get(order.get('delivery_type', 'standard'), order.get('delivery_type', 'standard'))
    
    message = f"""
{status_emoji} **ORDER #{order['order_id']}** [{order['status'].upper()}]
━━━━━━━━━━━━━━━━━━━

👤 **Customer:** {order['first_name']} {order['last_name']}
📞 **Phone:** {order['phone']}
📍 **Location:** {order['baladiya']}, {order['wilaya']}
{f"📮 **Wilaya Code:** {order['wilaya_code']}" if order.get('wilaya_code') else ''}
🚚 **Delivery:** {delivery_display} {'($' + str(order['delivery_price']) + ')' if order['delivery_price'] > 0 else ''}

📋 **Items:**{items_text}

━━━━━━━━━━━━━━━━━━━
💰 **Subtotal:** ${subtotal:.2f}
{f'🚚 **Shipping:** ${order["delivery_price"]:.2f}' if order["delivery_price"] > 0 else ''}
💵 **TOTAL:** ${total:.2f}
━━━━━━━━━━━━━━━━━━━

⏰ **Time:** {order['created_at']}
"""
    return message

def get_order_action_keyboard(order_id: int, current_status: str) -> InlineKeyboardMarkup:
    """Create keyboard based on order status"""
    if current_status == 'pending':
        keyboard = [
            [
                InlineKeyboardButton("✅ Approve", callback_data=f"approve_{order_id}"),
                InlineKeyboardButton("❌ Reject", callback_data=f"reject_{order_id}"),
            ],
            [
                InlineKeyboardButton("👁️ View Details", callback_data=f"view_{order_id}"),
            ]
        ]
    else:
        keyboard = [
            [InlineKeyboardButton("👁️ View Details", callback_data=f"view_{order_id}")],
        ]
    return InlineKeyboardMarkup(keyboard)

# ===== TELEGRAM HANDLERS =====

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command"""
    user_id = str(update.effective_user.id)
    
    if user_id not in AUTHORIZED_ADMINS:
        await update.message.reply_text("⛔ You are not authorized to use this bot.")
        return
    
    await update.message.reply_text(
        "🤖 **Order Management Bot**\n\n"
        "I will notify you when new orders arrive.\n\n"
        "📋 **Commands:**\n"
        "/status - Check bot status\n"
        "/pending - List pending orders\n"
        "/help - Show help",
        parse_mode="Markdown"
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command"""
    user_id = str(update.effective_user.id)
    
    if user_id not in AUTHORIZED_ADMINS:
        await update.message.reply_text("⛔ Unauthorized.")
        return
    
    await update.message.reply_text(
        "📋 **Available Commands:**\n\n"
        "/start - Start the bot\n"
        "/status - Check bot and database status\n"
        "/pending - List all pending orders\n"
        "/help - Show this help\n\n"
        "⚡ **How it works:**\n"
        "• New orders appear automatically with buttons\n"
        "• Click Approve/Reject to update order status\n"
        "• All admins receive notifications",
        parse_mode="Markdown"
    )

async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /status command"""
    user_id = str(update.effective_user.id)
    
    if user_id not in AUTHORIZED_ADMINS:
        await update.message.reply_text("⛔ Unauthorized.")
        return
    
    pending_orders = get_pending_orders()
    
    # Test database connection
    db_status = "✅ Connected"
    try:
        conn = get_db_connection()
        if conn:
            conn.close()
        else:
            db_status = "❌ Failed"
    except:
        db_status = "❌ Error"
    
    await update.message.reply_text(
        f"📊 **Bot Status**\n\n"
        f"🤖 Bot: ✅ Running\n"
        f"💾 Database: {db_status}\n"
        f"👥 Admins: {len(AUTHORIZED_ADMINS)}\n"
        f"⏳ Pending orders: {len(pending_orders)}\n"
        f"🕐 Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        parse_mode="Markdown"
    )

async def pending_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /pending command"""
    user_id = str(update.effective_user.id)
    
    if user_id not in AUTHORIZED_ADMINS:
        await update.message.reply_text("⛔ Unauthorized.")
        return
    
    pending_orders = get_pending_orders()
    
    if not pending_orders:
        await update.message.reply_text("✅ No pending orders at the moment.")
        return
    
    await update.message.reply_text(f"📋 Found {len(pending_orders)} pending order(s):")
    
    for order in pending_orders[:5]:
        message = format_order_message(order)
        reply_markup = get_order_action_keyboard(order['order_id'], 'pending')
        await update.message.reply_text(
            message,
            reply_markup=reply_markup,
            parse_mode="Markdown"
        )
        await asyncio.sleep(0.3)

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle button clicks"""
    query = update.callback_query
    user_id = str(update.effective_user.id)
    user_name = update.effective_user.first_name
    
    if user_id not in AUTHORIZED_ADMINS:
        await query.answer("Unauthorized!", show_alert=True)
        return
    
    await query.answer()
    callback_data = query.data
    
    if callback_data.startswith("view_"):
        order_id = int(callback_data.split("_")[1])
        await query.answer(f"Order #{order_id} details shown above")
        return
    
    if callback_data.startswith("approve_"):
        order_id = int(callback_data.split("_")[1])
        
        # Check if still pending
        pending_orders = get_pending_orders()
        order_exists = any(o['order_id'] == order_id for o in pending_orders)
        
        if not order_exists:
            await query.edit_message_text(
                f"⚠️ Order #{order_id} has already been processed!",
                parse_mode="Markdown"
            )
            return
        
        success = update_order_status(order_id, "accepted")
        
        if success:
            await query.edit_message_text(
                f"✅ **Order #{order_id} APPROVED!**\n\n"
                f"Actioned by: {user_name}\n"
                f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                parse_mode="Markdown"
            )
            print(f"✅ Order {order_id} approved by {user_name}")
        else:
            await query.edit_message_text(
                f"❌ Failed to approve Order #{order_id}",
                parse_mode="Markdown"
            )
    
    elif callback_data.startswith("reject_"):
        order_id = int(callback_data.split("_")[1])
        
        # Check if still pending
        pending_orders = get_pending_orders()
        order_exists = any(o['order_id'] == order_id for o in pending_orders)
        
        if not order_exists:
            await query.edit_message_text(
                f"⚠️ Order #{order_id} has already been processed!",
                parse_mode="Markdown"
            )
            return
        
        success = update_order_status(order_id, "rejected")
        
        if success:
            await query.edit_message_text(
                f"❌ **Order #{order_id} REJECTED!**\n\n"
                f"Actioned by: {user_name}\n"
                f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                parse_mode="Markdown"
            )
            print(f"❌ Order {order_id} rejected by {user_name}")
        else:
            await query.edit_message_text(
                f"❌ Failed to reject Order #{order_id}",
                parse_mode="Markdown"
            )

async def check_new_orders(context: ContextTypes.DEFAULT_TYPE):
    """Background task: Check for new pending orders"""
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
                            text=f"🆕 **NEW ORDER #{order_id}!**\n\n{message}",
                            reply_markup=keyboard,
                            parse_mode="Markdown"
                        )
                        print(f"📨 Sent order #{order_id} to admin {admin_id}")
                    except Exception as e:
                        print(f"Failed to send to {admin_id}: {e}")
                
                processed_order_ids.add(order_id)
                await asyncio.sleep(0.5)
        
        if len(processed_order_ids) > 1000:
            processed_order_ids.clear()
            
    except Exception as e:
        print(f"Error checking orders: {e}")

# ===== BOT FUNCTION =====

def run_bot():
    """Run the Telegram bot"""
    # Create application
    app = Application.builder().token(BOT_TOKEN).build()
    
    # Add command handlers
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("status", status_command))
    app.add_handler(CommandHandler("pending", pending_command))
    app.add_handler(CallbackQueryHandler(button_callback))
    
    # Add background job
    job_queue = app.job_queue
    if job_queue:
        job_queue.run_repeating(check_new_orders, interval=10, first=1)
        print("✅ Background job scheduled (every 10 seconds)")
    
    print(f"✅ Bot running with {len(AUTHORIZED_ADMINS)} admin(s)")
    app.run_polling(allowed_updates=['message', 'callback_query'])

def run_flask():
    """Run Flask for health checks"""
    port = int(os.getenv("PORT", 8080))
    flask_app.run(host='0.0.0.0', port=port)

# ===== MAIN =====

if __name__ == "__main__":
    # Initialize database
    if not init_db_pool():
        print("❌ Failed to connect to database. Check your environment variables.")
        exit(1)
    
    # Run both bot and Flask in separate threads
    bot_thread = threading.Thread(target=run_bot, daemon=True)
    bot_thread.start()
    
    print("🚀 Starting Flask health check server...")
    run_flask()