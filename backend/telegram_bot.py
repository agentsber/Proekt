"""
Telegram Bot for GameHub Marketplace Authentication
Allows users to register/login via Telegram bot @eplaysbot
"""
import os
import asyncio
import secrets
from datetime import datetime, timezone, timedelta
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import uuid

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Get MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Get bot token and frontend URL
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://gamestore-24.preview.emergentagent.com')

async def generate_auth_token(user_id: str, telegram_id: int) -> str:
    """Generate a one-time authentication token"""
    token = secrets.token_urlsafe(32)
    
    # Store token in database with expiration (5 minutes)
    token_doc = {
        "token": token,
        "user_id": user_id,
        "telegram_id": telegram_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
        "used": False
    }
    await db.telegram_auth_tokens.insert_one(token_doc)
    
    return token

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command - auto register/login user"""
    tg_user = update.effective_user
    telegram_id = tg_user.id
    
    # Check if user already exists with this telegram_id
    existing_user = await db.users.find_one({"telegram_id": telegram_id}, {"_id": 0})
    
    if existing_user:
        # User exists - generate login token
        token = await generate_auth_token(existing_user["id"], telegram_id)
        login_url = f"{FRONTEND_URL}/auth/telegram?token={token}"
        
        keyboard = [[InlineKeyboardButton("🚀 Войти на сайт", url=login_url)]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            f"👋 Привет, {existing_user.get('full_name', tg_user.first_name)}!\n\n"
            f"Нажмите кнопку ниже, чтобы войти на GameHub.\n\n"
            f"⏱ Ссылка действительна 5 минут.",
            reply_markup=reply_markup
        )
    else:
        # New user - auto register
        user_id = str(uuid.uuid4())
        full_name = tg_user.first_name
        if tg_user.last_name:
            full_name += f" {tg_user.last_name}"
        
        new_user = {
            "id": user_id,
            "email": f"tg_{telegram_id}@telegram.user",
            "password_hash": "",  # No password for Telegram auth
            "full_name": full_name,
            "role": "buyer",
            "avatar": None,
            "balance": 0.0,
            "telegram_id": telegram_id,
            "telegram_username": tg_user.username,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.users.insert_one(new_user)
        
        # Generate login token
        token = await generate_auth_token(user_id, telegram_id)
        login_url = f"{FRONTEND_URL}/auth/telegram?token={token}"
        
        keyboard = [[InlineKeyboardButton("🚀 Войти на сайт", url=login_url)]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            f"🎉 Добро пожаловать в GameHub, {full_name}!\n\n"
            f"Ваш аккаунт успешно создан.\n"
            f"Нажмите кнопку ниже, чтобы войти на сайт.\n\n"
            f"⏱ Ссылка действительна 5 минут.",
            reply_markup=reply_markup
        )

async def login(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /login command - generate new login link"""
    tg_user = update.effective_user
    telegram_id = tg_user.id
    
    # Find user
    user = await db.users.find_one({"telegram_id": telegram_id}, {"_id": 0})
    
    if user:
        token = await generate_auth_token(user["id"], telegram_id)
        login_url = f"{FRONTEND_URL}/auth/telegram?token={token}"
        
        keyboard = [[InlineKeyboardButton("🚀 Войти на сайт", url=login_url)]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            f"🔐 Новая ссылка для входа:\n\n"
            f"⏱ Действительна 5 минут.",
            reply_markup=reply_markup
        )
    else:
        await update.message.reply_text(
            "❌ Аккаунт не найден.\n\n"
            "Используйте /start для регистрации."
        )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command"""
    await update.message.reply_text(
        "🎮 <b>GameHub Bot</b>\n\n"
        "Команды:\n"
        "/start - Регистрация / Вход на сайт\n"
        "/login - Получить новую ссылку для входа\n"
        "/help - Помощь\n\n"
        "После нажатия /start вы получите ссылку для мгновенного входа на сайт.",
        parse_mode='HTML'
    )

def main():
    """Start the bot"""
    if not TELEGRAM_BOT_TOKEN:
        print("❌ TELEGRAM_BOT_TOKEN not set")
        return
    
    print(f"🤖 Starting GameHub Telegram Bot...")
    print(f"Frontend URL: {FRONTEND_URL}")
    
    # Create application
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    
    # Add handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("login", login))
    application.add_handler(CommandHandler("help", help_command))
    
    # Start bot
    print("✅ Bot is running...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
