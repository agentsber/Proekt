import sys
import os
sys.path.append('/app/backend')

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import uuid
import bcrypt
from dotenv import load_dotenv
from pathlib import Path

# Load environment
ROOT_DIR = Path('/app/backend')
load_dotenv(ROOT_DIR / '.env')

async def seed_database():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("Clearing existing data...")
    await db.users.delete_many({})
    await db.categories.delete_many({})
    await db.products.delete_many({})
    await db.blog_posts.delete_many({})
    await db.giveaways.delete_many({})
    
    print("Creating users...")
    admin_id = str(uuid.uuid4())
    seller_id = str(uuid.uuid4())
    buyer_id = str(uuid.uuid4())
    
    password_hash = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    users = [
        {
            "id": admin_id,
            "email": "admin@gamehub.com",
            "password_hash": password_hash,
            "full_name": "Admin User",
            "role": "admin",
            "avatar": None,
            "balance": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": seller_id,
            "email": "seller@gamehub.com",
            "password_hash": password_hash,
            "full_name": "Pro Seller",
            "role": "seller",
            "avatar": None,
            "balance": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": buyer_id,
            "email": "buyer@gamehub.com",
            "password_hash": password_hash,
            "full_name": "Gaming Fan",
            "role": "buyer",
            "avatar": None,
            "balance": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.users.insert_many(users)
    print(f"Created {len(users)} users")
    
    print("Creating categories...")
    categories_data = [
        {"name": "RPG", "slug": "rpg"},
        {"name": "Action", "slug": "action"},
        {"name": "Strategy", "slug": "strategy"},
        {"name": "Adventure", "slug": "adventure"},
        {"name": "Sports", "slug": "sports"},
        {"name": "Racing", "slug": "racing"}
    ]
    
    categories = []
    for cat_data in categories_data:
        cat_id = str(uuid.uuid4())
        categories.append({
            "id": cat_id,
            "name": cat_data["name"],
            "slug": cat_data["slug"],
            "parent_id": None,
            "level": 0,
            "description": f"{cat_data['name']} games",
            "image": None
        })
    
    await db.categories.insert_many(categories)
    print(f"Created {len(categories)} categories")
    
    print("Creating products...")
    product_images = [
        "https://images.unsplash.com/photo-1605433887450-490fcd8c0c17?crop=entropy&cs=srgb&fm=jpg&q=85",
        "https://images.unsplash.com/photo-1700300325884-10715799da7d?crop=entropy&cs=srgb&fm=jpg&q=85",
        "https://images.unsplash.com/photo-1631693558359-f7afa9e8e883?crop=entropy&cs=srgb&fm=jpg&q=85"
    ]
    
    products = []
    product_titles = [
        "Cyberpunk Adventure 2077", "Fantasy Quest Legends", "Space Explorer Ultimate",
        "Racing Thunder Pro", "Combat Arena Elite", "Kingdom Builder Deluxe",
        "Mystery Island Tales", "Dragon Slayer Premium", "Zombie Survival Kit",
        "Tactical Warfare Advanced", "Magic Realm Collector", "Ocean Depths Explorer"
    ]
    
    for i, title in enumerate(product_titles):
        products.append({
            "id": str(uuid.uuid4()),
            "title": title,
            "description": f"An amazing {title.split()[0]} game experience with stunning graphics and immersive gameplay. Hours of entertainment guaranteed!",
            "price": round(19.99 + (i * 10), 2),
            "product_type": ["key", "item", "account"][i % 3],
            "images": [product_images[i % len(product_images)]],
            "category_id": categories[i % len(categories)]["id"],
            "seller_id": seller_id,
            "stock": 50 - i,
            "sales_count": i * 5,
            "views_count": i * 50,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    await db.products.insert_many(products)
    print(f"Created {len(products)} products")
    
    print("Creating blog posts...")
    blog_posts = [
        {
            "id": str(uuid.uuid4()),
            "title": "Top 10 Games of 2025",
            "slug": "top-10-games-2025",
            "content": "Discover the most exciting games released this year. From epic RPGs to intense shooters, we've compiled the ultimate list of must-play titles that have defined gaming in 2025.",
            "author_id": admin_id,
            "image": product_images[0],
            "published_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "How to Build Your Gaming Setup",
            "slug": "gaming-setup-guide",
            "content": "Learn how to create the perfect gaming environment. We cover everything from choosing the right hardware to optimizing your space for maximum comfort and performance.",
            "author_id": admin_id,
            "image": product_images[1],
            "published_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Best Deals This Month",
            "slug": "best-deals-month",
            "content": "Check out the hottest gaming deals available right now. Save big on popular titles and exclusive bundles. Don't miss these limited-time offers!",
            "author_id": admin_id,
            "image": product_images[2],
            "published_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.blog_posts.insert_many(blog_posts)
    print(f"Created {len(blog_posts)} blog posts")
    
    print("Creating giveaways...")
    giveaways = [
        {
            "id": str(uuid.uuid4()),
            "title": "Win Premium Game Bundle",
            "description": "Enter for a chance to win 5 premium game keys worth over $200!",
            "products": [products[0]["id"], products[1]["id"], products[2]["id"]],
            "entries": [],
            "winner_id": None,
            "end_date": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "status": "active"
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Monthly Mega Giveaway",
            "description": "Win exclusive in-game items and special edition content!",
            "products": [products[3]["id"], products[4]["id"]],
            "entries": [],
            "winner_id": None,
            "end_date": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
            "status": "active"
        }
    ]
    
    await db.giveaways.insert_many(giveaways)
    print(f"Created {len(giveaways)} giveaways")
    
    print("\nDatabase seeded successfully!")
    print("\nTest credentials:")
    print("Admin: admin@gamehub.com / password123")
    print("Seller: seller@gamehub.com / password123")
    print("Buyer: buyer@gamehub.com / password123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
