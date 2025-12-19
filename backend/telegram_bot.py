"""
Telegram Bot for GameHub Marketplace Authentication
"""
import os
import asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

# Get MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.marketplace

# Get bot token from environment
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
FRONTEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000').replace(':8001', ':3000')

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command"""
    user = update.effective_user
    
    # Check if user already has an account
    existing_user = await db.users.find_one({"telegram_id": user.id}, {"_id": 0})
    
    if existing_user:
        await update.message.reply_text(
            f"✅ Привет, {user.first_name}!\n\n"
            f"Ваш аккаунт уже привязан к Telegram.\n"
            f"Используйте кнопку 'Войти через Telegram' на сайте.\n\n"
            f"🌐 {FRONTEND_URL}/auth"
        )
    else:
        keyboard = [
            [InlineKeyboardButton("🌐 Открыть сайт", url=f"{FRONTEND_URL}/auth")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            f"👋 Добро пожаловать в GameHub!\n\n"
            f"Чтобы привязать Telegram к вашему аккаунту:\n\n"
            f"1️⃣ Перейдите на сайт\n"
            f"2️⃣ Войдите в свой аккаунт\n"
            f"3️⃣ Перейдите в профиль\n"
            f"4️⃣ Нажмите 'Привязать Telegram'\n"
            f"5️⃣ Отправьте мне код, который появится\n\n"
            f"Или зарегистрируйтесь через бота командой:\n"
            f"/register",
            reply_markup=reply_markup
        )

async def link_account(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle verification code from user"""
    user = update.effective_user
    message_text = update.message.text.strip().upper()
    
    # Check if message is a valid code (8 chars, alphanumeric)
    if len(message_text) == 8 and message_text.isalnum():
        # Find code in database
        code_doc = await db.telegram_codes.find_one(
            {"code": message_text, "used": False},
            {"_id": 0}
        )
        
        if code_doc:
            # Check expiration
            expires_at = datetime.fromisoformat(code_doc["expires_at"])
            if datetime.now(timezone.utc) > expires_at:
                await update.message.reply_text("❌ Код истёк. Получите новый код на сайте.")
                return
            
            # Update user with Telegram info
            result = await db.users.update_one(
                {"id": code_doc["user_id"]},
                {"$set": {
                    "telegram_id": user.id,
                    "telegram_username": user.username
                }}
            )
            
            if result.modified_count > 0:
                # Mark code as used
                await db.telegram_codes.update_one(
                    {"code": message_text},
                    {"$set": {"used": True}}
                )
                
                await update.message.reply_text(
                    f"✅ Аккаунт успешно привязан!\n\n"
                    f"Теперь вы можете входить на сайт через Telegram.\n"
                    f"Просто нажмите 'Войти через Telegram' на странице авторизации."
                )
            else:
                await update.message.reply_text("❌ Ошибка при привязке аккаунта.")
        else:
            await update.message.reply_text(
                "❌ Неверный или использованный код.\n\n"
                "Получите новый код в профиле на сайте."
            )

async def register(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /register command"""
    await update.message.reply_text(
        "📝 Регистрация через Telegram\n\n"
        "Отправьте ваши данные в формате:\n"
        "Имя | Email\n\n"
        "Например:\n"
        "Иван Петров | ivan@example.com"
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command"""
    await update.message.reply_text(
        "🤖 GameHub Telegram Bot\n\n"
        "Команды:\n"
        "/start - Начать работу\n"
        "/register - Зарегистрироваться\n"
        "/help - Помощь\n\n"
        "Для привязки аккаунта отправьте код из профиля."
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle regular messages (codes or registration)"""
    message = update.message.text.strip()
    
    # Check if it's a code (8 chars)
    if len(message) == 8 and message.replace('-', '').isalnum():
        await link_account(update, context)
    elif '|' in message:
        # Registration format: Name | Email
        try:
            parts = message.split('|')
            if len(parts) == 2:
                full_name = parts[0].strip()
                email = parts[1].strip()
                
                # Validate email
                if '@' not in email:
                    await update.message.reply_text("❌ Неверный формат email.")
                    return
                
                # Check if email exists
                existing = await db.users.find_one({"email": email})
                if existing:
                    await update.message.reply_text("❌ Email уже зарегистрирован.")
                    return
                
                # Check if telegram_id already linked
                existing_telegram = await db.users.find_one({"telegram_id": update.effective_user.id})
                if existing_telegram:
                    await update.message.reply_text("❌ Этот Telegram уже привязан к аккаунту.")
                    return
                
                # Create user
                from uuid import uuid4
                user_id = str(uuid4())
                user_data = {
                    "id": user_id,
                    "email": email,
                    "password_hash": "",  # No password for Telegram auth
                    "full_name": full_name,
                    "role": "buyer",
                    "avatar": None,
                    "balance": 0.0,
                    "telegram_id": update.effective_user.id,
                    "telegram_username": update.effective_user.username,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.users.insert_one(user_data)
                
                keyboard = [
                    [InlineKeyboardButton("🌐 Открыть сайт", url=f"{FRONTEND_URL}/auth")]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                
                await update.message.reply_text(
                    f"✅ Регистрация успешна!\n\n"
                    f"Имя: {full_name}\n"
                    f"Email: {email}\n\n"
                    f"Теперь вы можете войти на сайт через Telegram!",
                    reply_markup=reply_markup
                )
            else:
                await update.message.reply_text(
                    "❌ Неверный формат. Используйте:\n"
                    "Имя | Email"
                )
        except Exception as e:
            await update.message.reply_text(f"❌ Ошибка: {str(e)}")
    else:
        await update.message.reply_text(
            "❓ Не понял вашу команду.\n\n"
            "Используйте /help для списка команд."
        )

def main():
    """Start the bot"""
    if not TELEGRAM_BOT_TOKEN:
        print("❌ TELEGRAM_BOT_TOKEN not set in environment variables")
        print("Please set TELEGRAM_BOT_TOKEN in backend/.env")
        return
    
    print(f"🤖 Starting Telegram Bot...")
    print(f"Frontend URL: {FRONTEND_URL}")
    
    # Create application
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    
    # Add handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("register", register))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    # Start bot
    print("✅ Bot is running...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
