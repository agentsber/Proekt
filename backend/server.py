from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta, timedelta
import bcrypt
import jwt
import shutil
import httpx
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Telegram Bot Config
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')

async def send_telegram_notification(telegram_id: int, message: str):
    """Send notification to user via Telegram bot"""
    if not TELEGRAM_BOT_TOKEN or not telegram_id:
        return False
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": telegram_id,
                    "text": message,
                    "parse_mode": "HTML"
                },
                timeout=10.0
            )
            return response.status_code == 200
    except Exception as e:
        logging.error(f"Failed to send Telegram notification: {e}")
        return False

# Stripe Config
stripe_api_key = os.environ['STRIPE_API_KEY']

# Security
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create uploads directory if not exists
UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Mount static files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# === Auth Models ===
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "user"  # user, admin

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    full_name: str
    role: str
    avatar: Optional[str] = None
    balance: float = 0.0
    telegram_id: Optional[int] = None
    telegram_username: Optional[str] = None
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

# === Product Models ===
class ProductCreate(BaseModel):
    title: str
    description: str
    price: float
    product_type: str  # key, item, account
    images: List[str]
    category_id: str
    stock: int = 1

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    price: float
    product_type: str
    images: List[str]
    category_id: str
    seller_id: str
    stock: int
    sales_count: int = 0
    views_count: int = 0
    created_at: datetime

# === Category Models ===
class CategoryCreate(BaseModel):
    name: str
    slug: str
    parent_id: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    slug: str
    parent_id: Optional[str] = None
    level: int = 0
    description: Optional[str] = None
    image: Optional[str] = None

# === Order Models ===
class OrderItem(BaseModel):
    product_id: str
    title: str
    price: float
    quantity: int

class OrderCreate(BaseModel):
    items: List[OrderItem]
    currency: str = "usd"

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    items: List[OrderItem]
    total: float
    currency: str
    status: str  # pending, paid, completed, cancelled
    payment_id: Optional[str] = None
    created_at: datetime

# === Payment Models ===
class PaymentCheckoutRequest(BaseModel):
    order_id: str

# === Blog Models ===
class BlogPostCreate(BaseModel):
    title: str
    slug: str
    content: str
    image: Optional[str] = None

class BlogPost(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    slug: str
    content: str
    author_id: str
    image: Optional[str] = None
    published_at: datetime

# === Giveaway Models ===
class GiveawayCreate(BaseModel):
    title: str
    description: str
    products: List[str]
    end_date: datetime

class Giveaway(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    products: List[str]
    entries: List[str] = []
    winner_id: Optional[str] = None
    end_date: datetime
    status: str = "active"  # active, ended

# === Admin Models ===
class AdminStats(BaseModel):
    total_users: int
    total_products: int
    total_orders: int
    total_revenue: float

# === Transaction Models ===
class TransactionCreate(BaseModel):
    amount: float
    type: str  # deposit, withdrawal
    method: Optional[str] = None  # stripe, bank_transfer, etc.
    description: Optional[str] = None

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    amount: float
    type: str  # deposit, withdrawal
    status: str  # pending, completed, failed, cancelled
    method: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

class DepositRequest(BaseModel):
    amount: float
    method: str = "stripe"  # stripe, card, etc.

class WithdrawalRequest(BaseModel):
    amount: float
    method: str = "bank_transfer"
    account_details: Optional[str] = None

# === Chat Models ===
class ChatMessage(BaseModel):
    id: str
    chat_id: str
    sender_id: str
    content: str
    created_at: datetime
    read: bool = False

class ChatMessageCreate(BaseModel):
    content: str

class Chat(BaseModel):
    id: str
    buyer_id: str
    seller_id: str
    product_id: Optional[str] = None
    created_at: datetime
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None

class ChatWithDetails(BaseModel):
    id: str
    buyer_id: str
    seller_id: str
    product_id: Optional[str] = None
    created_at: datetime
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    other_user: Optional[dict] = None
    product: Optional[dict] = None
    unread_count: int = 0

# === Telegram Auth Models ===
class TelegramWidgetData(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str

# === Helper Functions ===
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_seller(user: dict = Depends(get_current_user)) -> dict:
    # Allow all authenticated users to sell
    return user

# === File Upload Routes ===
@api_router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload image and return URL"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Generate unique filename
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return relative URL path (will be accessible via /uploads/...)
        image_url = f"/uploads/{unique_filename}"
        
        return {"url": image_url, "filename": unique_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

@api_router.post("/upload/images")
async def upload_multiple_images(files: List[UploadFile] = File(...), user: dict = Depends(get_current_user)):
    """Upload multiple images and return URLs"""
    uploaded_urls = []
    
    for file in files:
        try:
            # Validate file type
            if not file.content_type.startswith('image/'):
                continue
            
            # Generate unique filename
            file_extension = Path(file.filename).suffix
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = UPLOAD_DIR / unique_filename
            
            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Return relative URL path (will be accessible via /uploads/...)
            image_url = f"/uploads/{unique_filename}"
            uploaded_urls.append(image_url)
        except Exception as e:
            print(f"Failed to upload {file.filename}: {str(e)}")
            continue
    
    return {"urls": uploaded_urls, "count": len(uploaded_urls)}

# === Auth Routes ===
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "full_name": data.full_name,
        "role": data.role,
        "avatar": None,
        "balance": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    user_doc.pop("password_hash")
    user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    
    access_token = create_access_token({"sub": user_id})
    return TokenResponse(access_token=access_token, user=User(**user_doc))

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user.pop("password_hash")
    user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    access_token = create_access_token({"sub": user["id"]})
    return TokenResponse(access_token=access_token, user=User(**user))

@api_router.get("/auth/me", response_model=User)
async def get_me(user: dict = Depends(get_current_user)):
    user["created_at"] = datetime.fromisoformat(user["created_at"])
    return User(**user)

# === Telegram Auth Routes ===
import hashlib
import hmac

def verify_telegram_auth(data: dict, bot_token: str) -> bool:
    """Verify the authentication data from Telegram Login Widget"""
    check_hash = data.pop('hash', None)
    if not check_hash:
        return False
    
    # Create data-check-string
    data_check_arr = [f"{key}={value}" for key, value in sorted(data.items())]
    data_check_string = "\n".join(data_check_arr)
    
    # Create secret key from bot token
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    
    # Calculate hash
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return calculated_hash == check_hash

@api_router.post("/auth/telegram/widget", response_model=TokenResponse)
async def telegram_widget_auth(data: TelegramWidgetData):
    """
    Authenticate via Telegram Login Widget
    Validates hash and auto-registers if new user
    """
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    if not bot_token:
        raise HTTPException(status_code=500, detail="Telegram bot token not configured")
    
    # Prepare data for verification
    auth_data = {
        "id": data.id,
        "first_name": data.first_name,
        "auth_date": data.auth_date,
        "hash": data.hash
    }
    if data.last_name:
        auth_data["last_name"] = data.last_name
    if data.username:
        auth_data["username"] = data.username
    if data.photo_url:
        auth_data["photo_url"] = data.photo_url
    
    # Verify the hash
    if not verify_telegram_auth(auth_data.copy(), bot_token):
        raise HTTPException(status_code=401, detail="Invalid Telegram auth data")
    
    # Check if auth_date is not too old (max 24 hours)
    auth_time = datetime.fromtimestamp(data.auth_date, tz=timezone.utc)
    if (datetime.now(timezone.utc) - auth_time).total_seconds() > 86400:
        raise HTTPException(status_code=401, detail="Auth data expired")
    
    telegram_id = data.id
    full_name = data.first_name
    if data.last_name:
        full_name += f" {data.last_name}"
    
    # Check if user exists
    user = await db.users.find_one({"telegram_id": telegram_id}, {"_id": 0})
    
    if user:
        # Existing user - login
        # Update telegram username if changed
        if data.username and user.get("telegram_username") != data.username:
            await db.users.update_one(
                {"telegram_id": telegram_id},
                {"$set": {"telegram_username": data.username}}
            )
            user["telegram_username"] = data.username
        
        access_token = create_access_token(data={"sub": user["id"]})
        user["created_at"] = datetime.fromisoformat(user["created_at"])
        return TokenResponse(access_token=access_token, user=User(**user))
    else:
        # New user - auto-register
        user_id = str(uuid.uuid4())
        new_user = {
            "id": user_id,
            "email": f"tg_{telegram_id}@telegram.user",
            "password_hash": "",  # No password for Telegram auth
            "full_name": full_name,
            "role": "buyer",
            "avatar": data.photo_url,
            "balance": 0.0,
            "telegram_id": telegram_id,
            "telegram_username": data.username,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.users.insert_one(new_user)
        
        # Create JWT token
        access_token = create_access_token(data={"sub": user_id})
        new_user["created_at"] = datetime.fromisoformat(new_user["created_at"])
        
        return TokenResponse(access_token=access_token, user=User(**new_user))

@api_router.post("/auth/telegram/link")
async def link_telegram_account(data: TelegramWidgetData, user: dict = Depends(get_current_user)):
    """Link Telegram account to existing user"""
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    if not bot_token:
        raise HTTPException(status_code=500, detail="Telegram bot token not configured")
    
    # Prepare data for verification
    auth_data = {
        "id": data.id,
        "first_name": data.first_name,
        "auth_date": data.auth_date,
        "hash": data.hash
    }
    if data.last_name:
        auth_data["last_name"] = data.last_name
    if data.username:
        auth_data["username"] = data.username
    if data.photo_url:
        auth_data["photo_url"] = data.photo_url
    
    # Verify the hash
    if not verify_telegram_auth(auth_data.copy(), bot_token):
        raise HTTPException(status_code=401, detail="Invalid Telegram auth data")
    
    # Check if this telegram is already linked to another account
    existing = await db.users.find_one({"telegram_id": data.id}, {"_id": 0})
    if existing and existing["id"] != user["id"]:
        raise HTTPException(status_code=400, detail="This Telegram account is already linked to another user")
    
    # Link telegram to user
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "telegram_id": data.id,
            "telegram_username": data.username
        }}
    )
    
    return {"message": "Telegram account linked successfully"}

@api_router.post("/auth/telegram/unlink")
async def unlink_telegram_account(user: dict = Depends(get_current_user)):
    """Unlink Telegram account from user"""
    if not user.get("telegram_id"):
        raise HTTPException(status_code=400, detail="No Telegram account linked")
    
    # Check if user has password (can still login without telegram)
    if not user.get("password_hash"):
        raise HTTPException(status_code=400, detail="Cannot unlink: no password set. Set a password first.")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$unset": {"telegram_id": "", "telegram_username": ""}}
    )
    
    return {"message": "Telegram account unlinked successfully"}

@api_router.post("/auth/telegram/bot-token", response_model=TokenResponse)
async def auth_with_bot_token(token: str):
    """
    Authenticate user with one-time token from Telegram bot
    Token is generated by the bot when user sends /start
    """
    # Find token in database
    token_doc = await db.telegram_auth_tokens.find_one({"token": token, "used": False}, {"_id": 0})
    
    if not token_doc:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # Check expiration
    expires_at = datetime.fromisoformat(token_doc["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        # Mark as used to cleanup
        await db.telegram_auth_tokens.update_one({"token": token}, {"$set": {"used": True}})
        raise HTTPException(status_code=401, detail="Token expired")
    
    # Mark token as used (one-time use)
    await db.telegram_auth_tokens.update_one({"token": token}, {"$set": {"used": True}})
    
    # Find user
    user = await db.users.find_one({"id": token_doc["user_id"]}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create JWT token
    access_token = create_access_token(data={"sub": user["id"]})
    user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    return TokenResponse(access_token=access_token, user=User(**user))

# === Balance & Transactions Routes ===
@api_router.get("/balance")
async def get_balance(user: dict = Depends(get_current_user)):
    """Get current user balance"""
    return {"balance": user.get("balance", 0.0)}

@api_router.post("/balance/deposit")
async def deposit_balance(request: DepositRequest, user: dict = Depends(get_current_user)):
    """Deposit money to user balance"""
    # Create transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "amount": request.amount,
        "type": "deposit",
        "status": "completed",  # In real app, would be "pending" until payment confirmed
        "method": request.method,
        "description": f"Deposit via {request.method}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.transactions.insert_one(transaction)
    
    # Update user balance
    new_balance = user.get("balance", 0.0) + request.amount
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"balance": new_balance}}
    )
    
    return {
        "message": "Deposit successful",
        "transaction_id": transaction["id"],
        "new_balance": new_balance
    }

@api_router.post("/balance/withdrawal")
async def withdraw_balance(request: WithdrawalRequest, user: dict = Depends(get_current_user)):
    """Withdraw money from user balance"""
    current_balance = user.get("balance", 0.0)
    
    # Check if user has sufficient balance
    if current_balance < request.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Create transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "amount": request.amount,
        "type": "withdrawal",
        "status": "pending",  # Pending admin approval
        "method": request.method,
        "description": f"Withdrawal via {request.method}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.transactions.insert_one(transaction)
    
    # Update user balance (deduct immediately)
    new_balance = current_balance - request.amount
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"balance": new_balance}}
    )
    
    return {
        "message": "Withdrawal request submitted",
        "transaction_id": transaction["id"],
        "new_balance": new_balance,
        "status": "pending"
    }

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 20
):
    """Get user transaction history"""
    transactions = await db.transactions.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for t in transactions:
        t["created_at"] = datetime.fromisoformat(t["created_at"])
    
    return transactions

# === Product Routes ===
@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    query = {}
    if category:
        query["category_id"] = category
    if search:
        # Search in both title and description
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    products = await db.products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    for p in products:
        p["created_at"] = datetime.fromisoformat(p["created_at"])
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product["created_at"] = datetime.fromisoformat(product["created_at"])
    
    # Increment views
    await db.products.update_one({"id": product_id}, {"$inc": {"views_count": 1}})
    return Product(**product)

@api_router.post("/products", response_model=Product)
async def create_product(data: ProductCreate, user: dict = Depends(require_seller)):
    product_id = str(uuid.uuid4())
    product_doc = {
        "id": product_id,
        **data.model_dump(),
        "seller_id": user["id"],
        "sales_count": 0,
        "views_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product_doc)
    product_doc["created_at"] = datetime.fromisoformat(product_doc["created_at"])
    return Product(**product_doc)

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, data: ProductCreate, user: dict = Depends(require_seller)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if user owns this product or is admin
    if product["seller_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this product")
    
    update_data = data.model_dump()
    await db.products.update_one(
        {"id": product_id},
        {"$set": update_data}
    )
    
    updated_product = await db.products.find_one({"id": product_id}, {"_id": 0})
    updated_product["created_at"] = datetime.fromisoformat(updated_product["created_at"])
    return Product(**updated_product)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(require_seller)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if user owns this product or is admin
    if product["seller_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this product")
    
    await db.products.delete_one({"id": product_id})
    return {"message": "Product deleted successfully"}

@api_router.get("/products/{product_id}/similar", response_model=List[Product])
async def get_similar_products(product_id: str, limit: int = 4):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    similar = await db.products.find(
        {"category_id": product["category_id"], "id": {"$ne": product_id}},
        {"_id": 0}
    ).limit(limit).to_list(limit)
    
    for p in similar:
        p["created_at"] = datetime.fromisoformat(p["created_at"])
    return similar

# === Category Routes ===
@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    return categories

@api_router.post("/categories", response_model=Category)
async def create_category(data: CategoryCreate, user: dict = Depends(require_admin)):
    cat_id = str(uuid.uuid4())
    level = 0
    if data.parent_id:
        parent = await db.categories.find_one({"id": data.parent_id}, {"_id": 0})
        if parent:
            level = parent.get("level", 0) + 1
    
    cat_doc = {"id": cat_id, **data.model_dump(), "level": level}
    await db.categories.insert_one(cat_doc)
    return Category(**cat_doc)

# === Order Routes ===
@api_router.post("/orders", response_model=Order)
async def create_order(data: OrderCreate, user: dict = Depends(get_current_user)):
    order_id = str(uuid.uuid4())
    total = sum(item.price * item.quantity for item in data.items)
    
    order_doc = {
        "id": order_id,
        "user_id": user["id"],
        "items": [item.model_dump() for item in data.items],
        "total": total,
        "currency": data.currency,
        "status": "pending",
        "payment_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order_doc)
    order_doc["created_at"] = datetime.fromisoformat(order_doc["created_at"])
    return Order(**order_doc)

@api_router.get("/orders/my", response_model=List[Order])
async def get_my_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    for o in orders:
        o["created_at"] = datetime.fromisoformat(o["created_at"])
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    order["created_at"] = datetime.fromisoformat(order["created_at"])
    return Order(**order)

# === Payment Routes (Stripe) ===
@api_router.post("/payments/checkout/session")
async def create_checkout_session(data: PaymentCheckoutRequest, request: Request, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": data.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get host from frontend
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    success_url = f"{host_url}/checkout/success?session_id={{{{CHECKOUT_SESSION_ID}}}}"
    cancel_url = f"{host_url}/checkout/cancel"
    
    checkout_request = CheckoutSessionRequest(
        amount=order["total"],
        currency=order["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"order_id": order["id"], "user_id": user["id"]}
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction
    transaction_doc = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "order_id": order["id"],
        "user_id": user["id"],
        "amount": order["total"],
        "currency": order["currency"],
        "payment_status": "pending",
        "status": "initiated",
        "metadata": {"order_id": order["id"], "user_id": user["id"]},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction_doc)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, user: dict = Depends(get_current_user)):
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    host_url = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    checkout_status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction if payment successful and not already processed
    if checkout_status.payment_status == "paid" and transaction["payment_status"] != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "status": "completed"}}
        )
        
        # Update order status
        await db.orders.update_one(
            {"id": transaction["order_id"]},
            {"$set": {"status": "paid", "payment_id": session_id}}
        )
        
        # Update product sales count and send notifications
        order = await db.orders.find_one({"id": transaction["order_id"]}, {"_id": 0})
        if order:
            # Get buyer info
            buyer = await db.users.find_one({"id": order["user_id"]}, {"_id": 0})
            
            for item in order["items"]:
                await db.products.update_one(
                    {"id": item["product_id"]},
                    {"$inc": {"sales_count": item["quantity"], "stock": -item["quantity"]}}
                )
                
                # Get product and seller info for notification
                product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
                if product:
                    seller = await db.users.find_one({"id": product["seller_id"]}, {"_id": 0})
                    
                    # Notify seller about sale
                    if seller and seller.get("telegram_id"):
                        await send_telegram_notification(
                            seller["telegram_id"],
                            f"🎉 <b>Новая продажа!</b>\n\n"
                            f"📦 Товар: {item['title']}\n"
                            f"💰 Сумма: {item['price'] * item['quantity']}₽\n"
                            f"👤 Покупатель: {buyer.get('full_name', 'Пользователь')}\n\n"
                            f"Перейдите в личный кабинет для подробностей."
                        )
            
            # Notify buyer about successful purchase
            if buyer and buyer.get("telegram_id"):
                items_text = "\n".join([f"  • {item['title']} x{item['quantity']}" for item in order["items"]])
                await send_telegram_notification(
                    buyer["telegram_id"],
                    f"✅ <b>Заказ оплачен!</b>\n\n"
                    f"📦 Товары:\n{items_text}\n\n"
                    f"💰 Итого: {order['total']}₽\n\n"
                    f"Спасибо за покупку!"
                )
    
    return {
        "status": checkout_status.status,
        "payment_status": checkout_status.payment_status,
        "amount_total": checkout_status.amount_total,
        "currency": checkout_status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        event = await stripe_checkout.handle_webhook(body, signature)
        
        if event.payment_status == "paid":
            transaction = await db.payment_transactions.find_one({"session_id": event.session_id}, {"_id": 0})
            if transaction and transaction["payment_status"] != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": event.session_id},
                    {"$set": {"payment_status": "paid", "status": "completed"}}
                )
                
                await db.orders.update_one(
                    {"id": transaction["order_id"]},
                    {"$set": {"status": "paid", "payment_id": event.session_id}}
                )
        
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# === Favorites Routes ===
@api_router.post("/favorites")
async def add_favorite(product_id: str, user: dict = Depends(get_current_user)):
    existing = await db.favorites.find_one({"user_id": user["id"], "product_id": product_id})
    if existing:
        return {"message": "Already in favorites"}
    
    fav_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "product_id": product_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.favorites.insert_one(fav_doc)
    return {"message": "Added to favorites"}

@api_router.delete("/favorites/{product_id}")
async def remove_favorite(product_id: str, user: dict = Depends(get_current_user)):
    await db.favorites.delete_one({"user_id": user["id"], "product_id": product_id})
    return {"message": "Removed from favorites"}

@api_router.get("/favorites/my", response_model=List[Product])
async def get_my_favorites(user: dict = Depends(get_current_user)):
    favorites = await db.favorites.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    product_ids = [f["product_id"] for f in favorites]
    
    products = await db.products.find({"id": {"$in": product_ids}}, {"_id": 0}).to_list(1000)
    for p in products:
        p["created_at"] = datetime.fromisoformat(p["created_at"])
    return products

# === Viewed Products ===
@api_router.post("/viewed/{product_id}")
async def add_viewed(product_id: str, user: dict = Depends(get_current_user)):
    viewed_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "product_id": product_id,
        "viewed_at": datetime.now(timezone.utc).isoformat()
    }
    await db.viewed_products.insert_one(viewed_doc)
    return {"message": "Added to viewed"}

@api_router.get("/viewed/my", response_model=List[Product])
async def get_my_viewed(user: dict = Depends(get_current_user), limit: int = 10):
    viewed = await db.viewed_products.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("viewed_at", -1).limit(limit).to_list(limit)
    
    product_ids = [v["product_id"] for v in viewed]
    products = await db.products.find({"id": {"$in": product_ids}}, {"_id": 0}).to_list(1000)
    for p in products:
        p["created_at"] = datetime.fromisoformat(p["created_at"])
    return products

# === Blog Routes ===
@api_router.get("/blog", response_model=List[BlogPost])
async def get_blog_posts(skip: int = 0, limit: int = 10):
    posts = await db.blog_posts.find({}, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    for p in posts:
        p["published_at"] = datetime.fromisoformat(p["published_at"])
    return posts

@api_router.get("/blog/{slug}", response_model=BlogPost)
async def get_blog_post(slug: str):
    post = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post["published_at"] = datetime.fromisoformat(post["published_at"])
    return BlogPost(**post)

@api_router.post("/blog", response_model=BlogPost)
async def create_blog_post(data: BlogPostCreate, user: dict = Depends(require_admin)):
    post_id = str(uuid.uuid4())
    post_doc = {
        "id": post_id,
        **data.model_dump(),
        "author_id": user["id"],
        "published_at": datetime.now(timezone.utc).isoformat()
    }
    await db.blog_posts.insert_one(post_doc)
    post_doc["published_at"] = datetime.fromisoformat(post_doc["published_at"])
    return BlogPost(**post_doc)

@api_router.put("/blog/{post_id}", response_model=BlogPost)
async def update_blog_post(post_id: str, data: BlogPostCreate, user: dict = Depends(require_admin)):
    post = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    
    update_data = data.model_dump()
    await db.blog_posts.update_one({"id": post_id}, {"$set": update_data})
    
    updated_post = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    updated_post["published_at"] = datetime.fromisoformat(updated_post["published_at"])
    return BlogPost(**updated_post)

@api_router.delete("/blog/{post_id}")
async def delete_blog_post(post_id: str, user: dict = Depends(require_admin)):
    post = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    
    await db.blog_posts.delete_one({"id": post_id})
    return {"message": "Blog post deleted"}

@api_router.get("/admin/blog")
async def get_admin_blog_posts(user: dict = Depends(require_admin)):
    posts = await db.blog_posts.find({}, {"_id": 0}).to_list(1000)
    for p in posts:
        if "published_at" in p:
            p["published_at"] = datetime.fromisoformat(p["published_at"]).isoformat()
    return posts

# === Chat Routes ===
@api_router.get("/chats")
async def get_user_chats(user: dict = Depends(get_current_user)):
    """Get all chats for current user"""
    chats = await db.chats.find({
        "$or": [
            {"buyer_id": user["id"]},
            {"seller_id": user["id"]}
        ]
    }, {"_id": 0}).sort("last_message_at", -1).to_list(100)
    
    result = []
    for chat in chats:
        # Get other user info
        other_user_id = chat["seller_id"] if chat["buyer_id"] == user["id"] else chat["buyer_id"]
        other_user = await db.users.find_one({"id": other_user_id}, {"_id": 0, "password_hash": 0})
        
        # Get product info if exists
        product = None
        if chat.get("product_id"):
            product = await db.products.find_one({"id": chat["product_id"]}, {"_id": 0})
        
        # Count unread messages
        unread_count = await db.chat_messages.count_documents({
            "chat_id": chat["id"],
            "sender_id": {"$ne": user["id"]},
            "read": False
        })
        
        result.append({
            **chat,
            "other_user": other_user,
            "product": product,
            "unread_count": unread_count
        })
    
    return result

@api_router.post("/chats")
async def create_or_get_chat(seller_id: str, product_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Create a new chat or get existing one"""
    if user["id"] == seller_id:
        raise HTTPException(status_code=400, detail="Cannot chat with yourself")
    
    # Check if chat already exists
    existing = await db.chats.find_one({
        "buyer_id": user["id"],
        "seller_id": seller_id,
        "product_id": product_id
    }, {"_id": 0})
    
    if existing:
        return existing
    
    # Create new chat
    chat_id = str(uuid.uuid4())
    chat = {
        "id": chat_id,
        "buyer_id": user["id"],
        "seller_id": seller_id,
        "product_id": product_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_message": None,
        "last_message_at": None
    }
    await db.chats.insert_one(chat)
    
    # Return without _id
    chat.pop("_id", None)
    return chat

@api_router.get("/chats/{chat_id}")
async def get_chat(chat_id: str, user: dict = Depends(get_current_user)):
    """Get chat by ID"""
    chat = await db.chats.find_one({"id": chat_id}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    if user["id"] not in [chat["buyer_id"], chat["seller_id"]]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get other user info
    other_user_id = chat["seller_id"] if chat["buyer_id"] == user["id"] else chat["buyer_id"]
    other_user = await db.users.find_one({"id": other_user_id}, {"_id": 0, "password_hash": 0})
    
    # Get product info
    product = None
    if chat.get("product_id"):
        product = await db.products.find_one({"id": chat["product_id"]}, {"_id": 0})
    
    return {**chat, "other_user": other_user, "product": product}

@api_router.get("/chats/{chat_id}/messages")
async def get_chat_messages(chat_id: str, user: dict = Depends(get_current_user)):
    """Get messages for a chat"""
    chat = await db.chats.find_one({"id": chat_id}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    if user["id"] not in [chat["buyer_id"], chat["seller_id"]]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    messages = await db.chat_messages.find({"chat_id": chat_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    
    # Mark messages as read
    await db.chat_messages.update_many(
        {"chat_id": chat_id, "sender_id": {"$ne": user["id"]}, "read": False},
        {"$set": {"read": True}}
    )
    
    return messages

@api_router.post("/chats/{chat_id}/messages")
async def send_message(chat_id: str, data: ChatMessageCreate, user: dict = Depends(get_current_user)):
    """Send a message in a chat"""
    chat = await db.chats.find_one({"id": chat_id}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    if user["id"] not in [chat["buyer_id"], chat["seller_id"]]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    message_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    message = {
        "id": message_id,
        "chat_id": chat_id,
        "sender_id": user["id"],
        "content": data.content,
        "created_at": now,
        "read": False
    }
    await db.chat_messages.insert_one(message)
    
    # Update chat with last message
    await db.chats.update_one(
        {"id": chat_id},
        {"$set": {"last_message": data.content, "last_message_at": now}}
    )
    
    # Send Telegram notification to recipient
    recipient_id = chat["seller_id"] if chat["buyer_id"] == user["id"] else chat["buyer_id"]
    recipient = await db.users.find_one({"id": recipient_id}, {"_id": 0})
    
    if recipient and recipient.get("telegram_id"):
        # Get product info if exists
        product_name = ""
        if chat.get("product_id"):
            product = await db.products.find_one({"id": chat["product_id"]}, {"_id": 0})
            if product:
                product_name = f"\n📦 Товар: {product['title']}"
        
        await send_telegram_notification(
            recipient["telegram_id"],
            f"💬 <b>Новое сообщение!</b>\n\n"
            f"👤 От: {user.get('full_name', 'Пользователь')}{product_name}\n\n"
            f"📝 {data.content[:200]}{'...' if len(data.content) > 200 else ''}\n\n"
            f"<a href='{os.environ.get('FRONTEND_URL', '')}/chats/{chat_id}'>Открыть чат</a>"
        )
    
    # Return without _id
    message.pop("_id", None)
    return message

# === Giveaway Routes ===
@api_router.get("/giveaways", response_model=List[Giveaway])
async def get_giveaways():
    giveaways = await db.giveaways.find({}, {"_id": 0}).to_list(1000)
    for g in giveaways:
        g["end_date"] = datetime.fromisoformat(g["end_date"])
    return giveaways

@api_router.post("/giveaways/enter/{giveaway_id}")
async def enter_giveaway(giveaway_id: str, user: dict = Depends(get_current_user)):
    giveaway = await db.giveaways.find_one({"id": giveaway_id}, {"_id": 0})
    if not giveaway:
        raise HTTPException(status_code=404, detail="Giveaway not found")
    
    if user["id"] in giveaway.get("entries", []):
        return {"message": "Already entered"}
    
    await db.giveaways.update_one(
        {"id": giveaway_id},
        {"$push": {"entries": user["id"]}}
    )
    return {"message": "Entered giveaway"}

@api_router.post("/giveaways", response_model=Giveaway)
async def create_giveaway(data: GiveawayCreate, user: dict = Depends(require_admin)):
    giveaway_id = str(uuid.uuid4())
    giveaway_doc = {
        "id": giveaway_id,
        **data.model_dump(),
        "end_date": data.end_date.isoformat(),
        "entries": [],
        "winner_id": None,
        "status": "active"
    }
    await db.giveaways.insert_one(giveaway_doc)
    giveaway_doc["end_date"] = datetime.fromisoformat(giveaway_doc["end_date"])
    return Giveaway(**giveaway_doc)

# === Seller Routes ===
@api_router.get("/sellers/{seller_id}")
async def get_seller(seller_id: str):
    seller = await db.users.find_one({"id": seller_id, "role": "seller"}, {"_id": 0, "password_hash": 0})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    return seller

@api_router.get("/sellers/{seller_id}/products", response_model=List[Product])
async def get_seller_products(seller_id: str, skip: int = 0, limit: int = 20):
    products = await db.products.find(
        {"seller_id": seller_id},
        {"_id": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    for p in products:
        p["created_at"] = datetime.fromisoformat(p["created_at"])
    return products

# === Admin Routes ===
@api_router.get("/admin/stats", response_model=AdminStats)
async def get_admin_stats(user: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    total_products = await db.products.count_documents({})
    total_orders = await db.orders.count_documents({})
    
    # Calculate total revenue
    pipeline = [
        {"$match": {"status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = result[0]["total"] if result else 0.0
    
    return AdminStats(
        total_users=total_users,
        total_products=total_products,
        total_orders=total_orders,
        total_revenue=total_revenue
    )

@api_router.get("/admin/stats/advanced")
async def get_advanced_stats(user: dict = Depends(require_admin)):
    """Get advanced statistics with charts data"""
    from datetime import timedelta
    
    # Basic stats
    total_users = await db.users.count_documents({})
    total_products = await db.products.count_documents({})
    total_orders = await db.orders.count_documents({})
    total_transactions = await db.transactions.count_documents({})
    
    # Revenue
    revenue_pipeline = [
        {"$match": {"status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0.0
    
    # Users by role
    users_by_role = {}
    for role in ["buyer", "seller", "admin"]:
        count = await db.users.count_documents({"role": role})
        users_by_role[role] = count
    
    # Revenue by last 7 days
    revenue_by_day = []
    for i in range(6, -1, -1):
        date = datetime.now(timezone.utc) - timedelta(days=i)
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        pipeline = [
            {
                "$match": {
                    "status": "paid",
                    "created_at": {
                        "$gte": start_of_day.isoformat(),
                        "$lte": end_of_day.isoformat()
                    }
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$total"}}}
        ]
        result = await db.orders.aggregate(pipeline).to_list(1)
        daily_revenue = result[0]["total"] if result else 0.0
        
        revenue_by_day.append({
            "date": date.strftime("%Y-%m-%d"),
            "revenue": daily_revenue
        })
    
    # Top selling products
    top_products_pipeline = [
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.product_id",
            "total_sold": {"$sum": "$items.quantity"},
            "revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}}
        }},
        {"$sort": {"total_sold": -1}},
        {"$limit": 5}
    ]
    top_products_raw = await db.orders.aggregate(top_products_pipeline).to_list(5)
    
    top_products = []
    for item in top_products_raw:
        product = await db.products.find_one({"id": item["_id"]}, {"_id": 0})
        if product:
            top_products.append({
                "id": item["_id"],
                "title": product.get("title", "Unknown"),
                "total_sold": item["total_sold"],
                "revenue": item["revenue"]
            })
    
    # Orders by status
    orders_by_status = {}
    for status in ["pending", "paid", "completed", "cancelled"]:
        count = await db.orders.count_documents({"status": status})
        orders_by_status[status] = count
    
    # Recent transactions
    recent_transactions = await db.transactions.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Categories performance
    categories = await db.categories.find({"level": 0}, {"_id": 0}).to_list(100)
    categories_performance = []
    for category in categories:
        products_count = await db.products.count_documents({"category_id": category["id"]})
        categories_performance.append({
            "name": category["name"],
            "products_count": products_count
        })
    
    # User growth (last 30 days)
    user_growth = []
    for i in range(29, -1, -1):
        date = datetime.now(timezone.utc) - timedelta(days=i)
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        
        count = await db.users.count_documents({
            "created_at": {"$lte": start_of_day.isoformat()}
        })
        
        user_growth.append({
            "date": date.strftime("%Y-%m-%d"),
            "total_users": count
        })
    
    return {
        "overview": {
            "total_users": total_users,
            "total_products": total_products,
            "total_orders": total_orders,
            "total_transactions": total_transactions,
            "total_revenue": total_revenue,
            "avg_order_value": total_revenue / total_orders if total_orders > 0 else 0
        },
        "users_by_role": users_by_role,
        "revenue_by_day": revenue_by_day,
        "top_products": top_products,
        "orders_by_status": orders_by_status,
        "recent_transactions": recent_transactions,
        "categories_performance": categories_performance,
        "user_growth": user_growth[-7:]  # Last 7 days only for display
    }

@api_router.get("/admin/users")
async def get_all_users(user: dict = Depends(require_admin), skip: int = 0, limit: int = 50):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).skip(skip).limit(limit).to_list(limit)
    return users

@api_router.get("/admin/products")
async def get_all_products_admin(user: dict = Depends(require_admin), skip: int = 0, limit: int = 50):
    products = await db.products.find({}, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    return products

@api_router.get("/admin/orders")
async def get_all_orders(user: dict = Depends(require_admin), skip: int = 0, limit: int = 50):
    orders = await db.orders.find({}, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    return orders

# === Admin Category Management ===
@api_router.put("/categories/{category_id}")
async def update_category(category_id: str, data: CategoryCreate, user: dict = Depends(require_admin)):
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    level = 0
    if data.parent_id:
        parent = await db.categories.find_one({"id": data.parent_id}, {"_id": 0})
        if parent:
            level = parent.get("level", 0) + 1
    
    update_data = {**data.model_dump(), "level": level}
    await db.categories.update_one({"id": category_id}, {"$set": update_data})
    
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    return Category(**updated)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, user: dict = Depends(require_admin)):
    # Check if category has products
    products_count = await db.products.count_documents({"category_id": category_id})
    if products_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category with {products_count} products")
    
    # Check if category has subcategories
    subcategories = await db.categories.count_documents({"parent_id": category_id})
    if subcategories > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category with {subcategories} subcategories")
    
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted successfully"}

# === Admin Site Settings ===
class NavigationLink(BaseModel):
    title: str
    url: str

class SiteSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    primary_color: str = "#00ff9d"
    secondary_color: str = "#0d1117"
    accent_color: str = "#00cc7d"
    background_color: str = "#02040a"
    text_color: str = "#ffffff"
    site_name: str = "GameHub"
    site_description: str = "Маркетплейс игровых товаров"
    logo_url: Optional[str] = None
    hero_image: Optional[str] = None
    footer_navigation: List[NavigationLink] = []
    footer_support: List[NavigationLink] = []
    footer_legal: List[NavigationLink] = []
    # SEO Settings
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    og_image: Optional[str] = None
    favicon_url: Optional[str] = None
    google_analytics_id: Optional[str] = None
    yandex_metrika_id: Optional[str] = None
    robots_txt: Optional[str] = None
    custom_head_scripts: Optional[str] = None

@api_router.get("/admin/settings")
async def get_site_settings(user: dict = Depends(require_admin)):
    settings = await db.site_settings.find_one({}, {"_id": 0})
    if not settings:
        # Return default settings
        default_settings = {
            "primary_color": "#00ff9d",
            "secondary_color": "#0d1117",
            "accent_color": "#00cc7d",
            "background_color": "#02040a",
            "text_color": "#ffffff",
            "site_name": "GameHub",
            "site_description": "Маркетплейс игровых товаров",
            "logo_url": None,
            "hero_image": None,
            "footer_navigation": [
                {"title": "Каталог", "url": "/catalog"},
                {"title": "Раздачи", "url": "/giveaways"},
                {"title": "Блог", "url": "/blog"}
            ],
            "footer_support": [
                {"title": "FAQ", "url": "#"},
                {"title": "Контакты", "url": "#"}
            ],
            "footer_legal": [
                {"title": "Условия использования", "url": "#"},
                {"title": "Политика конфиденциальности", "url": "#"}
            ],
            "seo_title": None,
            "seo_description": None,
            "seo_keywords": None,
            "og_image": None,
            "favicon_url": None,
            "google_analytics_id": None,
            "yandex_metrika_id": None,
            "robots_txt": None,
            "custom_head_scripts": None
        }
        await db.site_settings.insert_one(default_settings)
        return default_settings
    return settings

@api_router.put("/admin/settings")
async def update_site_settings(settings: SiteSettings, user: dict = Depends(require_admin)):
    settings_dict = settings.model_dump()
    await db.site_settings.update_one({}, {"$set": settings_dict}, upsert=True)
    return {"message": "Settings updated successfully", "settings": settings_dict}

# === Admin User Management ===
@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, admin: dict = Depends(require_admin)):
    """Update user role"""
    if role not in ["buyer", "seller", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User role updated to {role}"}

@api_router.put("/admin/users/{user_id}/balance")
async def adjust_user_balance(user_id: str, amount: float, admin: dict = Depends(require_admin)):
    """Adjust user balance (add or subtract)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_balance = user.get("balance", 0.0) + amount
    if new_balance < 0:
        raise HTTPException(status_code=400, detail="Balance cannot be negative")
    
    await db.users.update_one({"id": user_id}, {"$set": {"balance": new_balance}})
    
    # Create transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "amount": abs(amount),
        "type": "deposit" if amount > 0 else "withdrawal",
        "status": "completed",
        "method": "admin_adjustment",
        "description": f"Admin adjustment by {admin['email']}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.transactions.insert_one(transaction)
    
    return {"message": "Balance adjusted", "new_balance": new_balance}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    """Delete user account"""
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

# === Admin Transaction Management ===
@api_router.get("/admin/transactions")
async def get_all_transactions(admin: dict = Depends(require_admin), skip: int = 0, limit: int = 50):
    """Get all transactions"""
    transactions = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return transactions

@api_router.put("/admin/transactions/{transaction_id}/status")
async def update_transaction_status(transaction_id: str, status: str, admin: dict = Depends(require_admin)):
    """Update transaction status (for approving withdrawals)"""
    if status not in ["pending", "completed", "failed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": {"status": status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {"message": f"Transaction status updated to {status}"}

# === Admin Order Management ===
@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, admin: dict = Depends(require_admin)):
    """Update order status"""
    if status not in ["pending", "paid", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": f"Order status updated to {status}"}

# === Admin Giveaway Management ===
@api_router.get("/admin/giveaways")
async def get_all_giveaways_admin(admin: dict = Depends(require_admin)):
    """Get all giveaways for admin"""
    giveaways = await db.giveaways.find({}, {"_id": 0}).to_list(100)
    return giveaways

@api_router.put("/admin/giveaways/{giveaway_id}")
async def update_giveaway(giveaway_id: str, data: GiveawayCreate, admin: dict = Depends(require_admin)):
    """Update giveaway"""
    result = await db.giveaways.update_one(
        {"id": giveaway_id},
        {"$set": data.model_dump()}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Giveaway not found")
    
    return {"message": "Giveaway updated successfully"}

@api_router.delete("/admin/giveaways/{giveaway_id}")
async def delete_giveaway(giveaway_id: str, admin: dict = Depends(require_admin)):
    """Delete giveaway"""
    result = await db.giveaways.delete_one({"id": giveaway_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Giveaway not found")
    
    return {"message": "Giveaway deleted successfully"}

@api_router.get("/settings/public")
async def get_public_settings():
    """Public endpoint for frontend to get site settings"""
    settings = await db.site_settings.find_one({}, {"_id": 0})
    if not settings:
        return {
            "primary_color": "#00ff9d",
            "secondary_color": "#0d1117",
            "accent_color": "#00cc7d",
            "background_color": "#02040a",
            "text_color": "#ffffff",
            "site_name": "GameHub",
            "site_description": "Маркетплейс игровых товаров",
            "footer_navigation": [
                {"title": "Каталог", "url": "/catalog"},
                {"title": "Раздачи", "url": "/giveaways"},
                {"title": "Блог", "url": "/blog"}
            ],
            "footer_support": [
                {"title": "FAQ", "url": "#"},
                {"title": "Контакты", "url": "#"}
            ],
            "footer_legal": [
                {"title": "Условия использования", "url": "#"},
                {"title": "Политика конфиденциальности", "url": "#"}
            ]
        }
    return settings

# === Chat Routes (Simple) ===
@api_router.post("/chats")
async def create_chat(seller_id: str, product_id: str, user: dict = Depends(get_current_user)):
    existing = await db.chats.find_one({
        "seller_id": seller_id,
        "buyer_id": user["id"],
        "product_id": product_id
    })
    if existing:
        return {"chat_id": existing["id"]}
    
    chat_id = str(uuid.uuid4())
    chat_doc = {
        "id": chat_id,
        "seller_id": seller_id,
        "buyer_id": user["id"],
        "product_id": product_id,
        "messages": [],
        "last_message_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chats.insert_one(chat_doc)
    return {"chat_id": chat_id}

@api_router.post("/chats/{chat_id}/messages")
async def send_message(chat_id: str, message: str, user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"id": chat_id}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    if user["id"] not in [chat["seller_id"], chat["buyer_id"]]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    msg = {
        "id": str(uuid.uuid4()),
        "sender_id": user["id"],
        "message": message,
        "sent_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.chats.update_one(
        {"id": chat_id},
        {"$push": {"messages": msg}, "$set": {"last_message_at": msg["sent_at"]}}
    )
    return {"message": "Message sent"}

@api_router.get("/chats/{chat_id}")
async def get_chat(chat_id: str, user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"id": chat_id}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    if user["id"] not in [chat["seller_id"], chat["buyer_id"]]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return chat

@api_router.get("/chats")
async def get_my_chats(user: dict = Depends(get_current_user)):
    chats = await db.chats.find(
        {"$or": [{"seller_id": user["id"]}, {"buyer_id": user["id"]}]},
        {"_id": 0}
    ).to_list(1000)
    return chats

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()