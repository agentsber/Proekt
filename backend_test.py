import requests
import sys
from datetime import datetime
import json
import hashlib
import hmac
import time

class GameHubAPITester:
    def __init__(self, base_url="https://gamehub-market-6.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tokens = {}
        self.test_data = {}
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append({"test": name, "details": details})

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            details = f"Expected {expected_status}, got {response.status_code}"
            if not success and response.text:
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', response.text)}"
                except:
                    details += f" - {response.text[:100]}"
            
            self.log_test(name, success, details)
            return success, response.json() if success and response.text else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_auth_flow(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication...")
        
        # Test login with existing users
        test_users = [
            ("admin@gamehub.com", "password123", "admin"),
            ("seller@gamehub.com", "password123", "seller"),
            ("buyer@gamehub.com", "password123", "buyer")
        ]
        
        for email, password, role in test_users:
            success, response = self.run_test(
                f"Login as {role}",
                "POST",
                "auth/login",
                200,
                {"email": email, "password": password}
            )
            if success and 'access_token' in response:
                self.tokens[role] = response['access_token']
                self.test_data[f"{role}_user"] = response['user']
        
        # Test /auth/me endpoint
        for role in ['admin', 'seller', 'buyer']:
            if role in self.tokens:
                self.run_test(
                    f"Get current user ({role})",
                    "GET",
                    "auth/me",
                    200,
                    token=self.tokens[role]
                )

    def test_products_api(self):
        """Test product endpoints"""
        print("\n📦 Testing Products API...")
        
        # Get all products
        success, products = self.run_test(
            "Get all products",
            "GET",
            "products",
            200
        )
        if success and products:
            self.test_data['products'] = products
            product_id = products[0]['id']
            self.test_data['sample_product_id'] = product_id
            
            # Get single product
            self.run_test(
                "Get single product",
                "GET",
                f"products/{product_id}",
                200
            )
            
            # Get similar products
            self.run_test(
                "Get similar products",
                "GET",
                f"products/{product_id}/similar",
                200
            )
        
        # Test product search
        self.run_test(
            "Search products",
            "GET",
            "products?search=game",
            200
        )
        
        # Test product filtering by category
        success, categories = self.run_test(
            "Get categories for filtering",
            "GET",
            "categories",
            200
        )
        if success and categories:
            category_id = categories[0]['id']
            self.run_test(
                "Filter products by category",
                "GET",
                f"products?category={category_id}",
                200
            )

    def test_categories_api(self):
        """Test category endpoints"""
        print("\n📂 Testing Categories API...")
        
        success, categories = self.run_test(
            "Get all categories",
            "GET",
            "categories",
            200
        )
        if success:
            self.test_data['categories'] = categories

    def test_cart_and_orders(self):
        """Test cart and order functionality"""
        print("\n🛒 Testing Cart & Orders...")
        
        if 'buyer' not in self.tokens or 'sample_product_id' not in self.test_data:
            print("⚠️ Skipping cart tests - missing buyer token or product")
            return
        
        # Create an order
        order_data = {
            "items": [
                {
                    "product_id": self.test_data['sample_product_id'],
                    "title": "Test Product",
                    "price": 29.99,
                    "quantity": 1
                }
            ],
            "currency": "usd"
        }
        
        success, order = self.run_test(
            "Create order",
            "POST",
            "orders",
            200,
            order_data,
            self.tokens['buyer']
        )
        
        if success and 'id' in order:
            order_id = order['id']
            self.test_data['sample_order_id'] = order_id
            
            # Get order details
            self.run_test(
                "Get order details",
                "GET",
                f"orders/{order_id}",
                200,
                token=self.tokens['buyer']
            )
            
            # Get user's orders
            self.run_test(
                "Get my orders",
                "GET",
                "orders/my",
                200,
                token=self.tokens['buyer']
            )

    def test_favorites_and_viewed(self):
        """Test favorites and viewed products"""
        print("\n❤️ Testing Favorites & Viewed...")
        
        if 'buyer' not in self.tokens or 'sample_product_id' not in self.test_data:
            print("⚠️ Skipping favorites tests - missing buyer token or product")
            return
        
        product_id = self.test_data['sample_product_id']
        
        # Add to favorites
        self.run_test(
            "Add to favorites",
            "POST",
            f"favorites?product_id={product_id}",
            200,
            token=self.tokens['buyer']
        )
        
        # Get favorites
        self.run_test(
            "Get my favorites",
            "GET",
            "favorites/my",
            200,
            token=self.tokens['buyer']
        )
        
        # Add to viewed
        self.run_test(
            "Add to viewed",
            "POST",
            f"viewed/{product_id}",
            200,
            token=self.tokens['buyer']
        )
        
        # Get viewed
        self.run_test(
            "Get my viewed",
            "GET",
            "viewed/my",
            200,
            token=self.tokens['buyer']
        )

    def test_blog_api(self):
        """Test blog endpoints"""
        print("\n📝 Testing Blog API...")
        
        # Get blog posts
        success, posts = self.run_test(
            "Get blog posts",
            "GET",
            "blog",
            200
        )
        
        if success and posts:
            # Get single blog post
            post_slug = posts[0]['slug']
            self.run_test(
                "Get single blog post",
                "GET",
                f"blog/{post_slug}",
                200
            )

    def test_giveaways_api(self):
        """Test giveaway endpoints"""
        print("\n🎁 Testing Giveaways API...")
        
        # Get giveaways
        success, giveaways = self.run_test(
            "Get giveaways",
            "GET",
            "giveaways",
            200
        )
        
        if success and giveaways and 'buyer' in self.tokens:
            giveaway_id = giveaways[0]['id']
            # Enter giveaway
            self.run_test(
                "Enter giveaway",
                "POST",
                f"giveaways/enter/{giveaway_id}",
                200,
                token=self.tokens['buyer']
            )

    def test_seller_api(self):
        """Test seller endpoints"""
        print("\n👤 Testing Seller API...")
        
        if 'seller' not in self.tokens:
            print("⚠️ Skipping seller tests - missing seller token")
            return
        
        seller_id = self.test_data.get('seller_user', {}).get('id')
        if seller_id:
            # Get seller info
            self.run_test(
                "Get seller info",
                "GET",
                f"sellers/{seller_id}",
                200
            )
            
            # Get seller products
            success, seller_products = self.run_test(
                "Get seller products",
                "GET",
                f"sellers/{seller_id}/products",
                200
            )
            
            # Test seller product management (NEW FUNCTIONALITY)
            self.test_seller_product_management(seller_products)

    def test_seller_product_management(self, seller_products):
        """Test seller product CRUD operations"""
        print("\n🛠️ Testing Seller Product Management...")
        
        if 'seller' not in self.tokens:
            print("⚠️ Skipping seller product management - missing seller token")
            return
        
        # Test creating a new product
        new_product_data = {
            "title": "Test Seller Product",
            "description": "A test product created by seller",
            "price": 19.99,
            "product_type": "key",
            "images": ["https://images.unsplash.com/photo-1605433887450-490fcd8c0c17?crop=entropy&cs=srgb&fm=jpg&q=85"],
            "category_id": self.test_data.get('categories', [{}])[0].get('id', ''),
            "stock": 5
        }
        
        success, created_product = self.run_test(
            "Create product (seller)",
            "POST",
            "products",
            200,
            new_product_data,
            self.tokens['seller']
        )
        
        if success and 'id' in created_product:
            product_id = created_product['id']
            self.test_data['seller_created_product_id'] = product_id
            
            # Test updating the product
            updated_product_data = {
                **new_product_data,
                "title": "Updated Test Seller Product",
                "price": 24.99,
                "stock": 10
            }
            
            self.run_test(
                "Update own product (seller)",
                "PUT",
                f"products/{product_id}",
                200,
                updated_product_data,
                self.tokens['seller']
            )
            
            # Test that buyer cannot update seller's product
            if 'buyer' in self.tokens:
                self.run_test(
                    "Update other's product (buyer - should fail)",
                    "PUT",
                    f"products/{product_id}",
                    403,
                    updated_product_data,
                    self.tokens['buyer']
                )
            
            # Test deleting the product
            self.run_test(
                "Delete own product (seller)",
                "DELETE",
                f"products/{product_id}",
                200,
                token=self.tokens['seller']
            )
            
            # Verify product is deleted
            self.run_test(
                "Verify product deleted",
                "GET",
                f"products/{product_id}",
                404
            )
        
        # Test authorization - buyer cannot create products
        if 'buyer' in self.tokens:
            self.run_test(
                "Create product (buyer - should fail)",
                "POST",
                "products",
                403,
                new_product_data,
                self.tokens['buyer']
            )
        
        # Test updating/deleting existing seller products (if any exist)
        if seller_products and len(seller_products) > 0:
            existing_product_id = seller_products[0]['id']
            
            # Test that buyer cannot delete seller's existing product
            if 'buyer' in self.tokens:
                self.run_test(
                    "Delete other's product (buyer - should fail)",
                    "DELETE",
                    f"products/{existing_product_id}",
                    403,
                    token=self.tokens['buyer']
                )

    def test_admin_api(self):
        """Test admin endpoints"""
        print("\n⚙️ Testing Admin API...")
        
        if 'admin' not in self.tokens:
            print("⚠️ Skipping admin tests - missing admin token")
            return
        
        # Get admin stats
        self.run_test(
            "Get admin stats",
            "GET",
            "admin/stats",
            200,
            token=self.tokens['admin']
        )
        
        # Get all users
        self.run_test(
            "Get all users",
            "GET",
            "admin/users",
            200,
            token=self.tokens['admin']
        )
        
        # Get all products (admin)
        self.run_test(
            "Get all products (admin)",
            "GET",
            "admin/products",
            200,
            token=self.tokens['admin']
        )
        
        # Get all orders (admin)
        self.run_test(
            "Get all orders (admin)",
            "GET",
            "admin/orders",
            200,
            token=self.tokens['admin']
        )

    def test_payment_flow(self):
        """Test payment endpoints (without actual payment)"""
        print("\n💳 Testing Payment Flow...")
        
        if 'buyer' not in self.tokens or 'sample_order_id' not in self.test_data:
            print("⚠️ Skipping payment tests - missing buyer token or order")
            return
        
        # Create checkout session
        checkout_data = {"order_id": self.test_data['sample_order_id']}
        success, session = self.run_test(
            "Create checkout session",
            "POST",
            "payments/checkout/session",
            200,
            checkout_data,
            self.tokens['buyer']
        )
        
        if success and 'session_id' in session:
            session_id = session['session_id']
            # Get checkout status
            self.run_test(
                "Get checkout status",
                "GET",
                f"payments/checkout/status/{session_id}",
                200,
                token=self.tokens['buyer']
            )

    def generate_telegram_hash(self, data, bot_token):
        """Generate valid Telegram hash for testing"""
        # Remove hash from data if present
        data_copy = data.copy()
        data_copy.pop('hash', None)
        
        # Create data-check-string
        data_check_arr = [f"{key}={value}" for key, value in sorted(data_copy.items())]
        data_check_string = "\n".join(data_check_arr)
        
        # Create secret key from bot token
        secret_key = hashlib.sha256(bot_token.encode()).digest()
        
        # Calculate hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return calculated_hash

    def test_telegram_auth(self):
        """Test Telegram authentication endpoints"""
        print("\n📱 Testing Telegram Authentication...")
        
        # Bot token from backend .env (this should match the actual token)
        bot_token = "8523882721:AAGSzBy9ow9BcsCWqBVNLVtkHHFmkkxtOtc"
        
        # Test 1: Valid Telegram widget authentication (new user)
        current_time = int(time.time())
        telegram_data = {
            "id": 123456789,
            "first_name": "John",
            "last_name": "Doe", 
            "username": "johndoe",
            "photo_url": "https://t.me/i/userpic/320/johndoe.jpg",
            "auth_date": current_time
        }
        
        # Generate valid hash
        valid_hash = self.generate_telegram_hash(telegram_data, bot_token)
        telegram_data["hash"] = valid_hash
        
        success, response = self.run_test(
            "Telegram widget auth (new user)",
            "POST",
            "auth/telegram/widget",
            200,
            telegram_data
        )
        
        if success and 'access_token' in response:
            self.tokens['telegram_user'] = response['access_token']
            self.test_data['telegram_user'] = response['user']
            print(f"  ✅ Created new Telegram user: {response['user']['full_name']}")
        
        # Test 2: Valid Telegram widget authentication (existing user)
        success, response = self.run_test(
            "Telegram widget auth (existing user)",
            "POST", 
            "auth/telegram/widget",
            200,
            telegram_data
        )
        
        if success:
            print(f"  ✅ Logged in existing Telegram user")
        
        # Test 3: Invalid hash
        invalid_data = telegram_data.copy()
        invalid_data["hash"] = "invalid_hash_12345"
        
        self.run_test(
            "Telegram widget auth (invalid hash)",
            "POST",
            "auth/telegram/widget", 
            401,
            invalid_data
        )
        
        # Test 4: Expired auth_date (older than 24 hours)
        expired_data = telegram_data.copy()
        expired_data["auth_date"] = current_time - 86401  # 24 hours + 1 second ago
        expired_data["hash"] = self.generate_telegram_hash(expired_data, bot_token)
        
        self.run_test(
            "Telegram widget auth (expired)",
            "POST",
            "auth/telegram/widget",
            401,
            expired_data
        )
        
        # Test 5: Link Telegram to existing account (requires authentication)
        if 'buyer' in self.tokens:
            # Create new telegram data for linking
            link_telegram_data = {
                "id": 987654321,
                "first_name": "Jane",
                "last_name": "Smith",
                "username": "janesmith", 
                "auth_date": current_time
            }
            link_telegram_data["hash"] = self.generate_telegram_hash(link_telegram_data, bot_token)
            
            success, response = self.run_test(
                "Link Telegram to existing account",
                "POST",
                "auth/telegram/link",
                200,
                link_telegram_data,
                self.tokens['buyer']
            )
            
            if success:
                print(f"  ✅ Linked Telegram to buyer account")
                self.test_data['buyer_has_telegram'] = True
        
        # Test 6: Link Telegram without authentication (should fail)
        self.run_test(
            "Link Telegram without auth (should fail)",
            "POST", 
            "auth/telegram/link",
            403,
            link_telegram_data
        )
        
        # Test 7: Link Telegram with invalid hash
        if 'buyer' in self.tokens:
            invalid_link_data = link_telegram_data.copy()
            invalid_link_data["hash"] = "invalid_hash"
            
            self.run_test(
                "Link Telegram with invalid hash",
                "POST",
                "auth/telegram/link", 
                401,
                invalid_link_data,
                self.tokens['buyer']
            )
        
        # Test 8: Try to link already linked Telegram to another account
        if 'seller' in self.tokens and self.test_data.get('buyer_has_telegram'):
            self.run_test(
                "Link already linked Telegram (should fail)",
                "POST",
                "auth/telegram/link",
                400,
                link_telegram_data,
                self.tokens['seller']
            )
        
        # Test 9: Unlink Telegram from account
        if 'buyer' in self.tokens and self.test_data.get('buyer_has_telegram'):
            success, response = self.run_test(
                "Unlink Telegram from account",
                "POST",
                "auth/telegram/unlink",
                200,
                token=self.tokens['buyer']
            )
            
            if success:
                print(f"  ✅ Unlinked Telegram from buyer account")
        
        # Test 10: Unlink Telegram without authentication
        self.run_test(
            "Unlink Telegram without auth (should fail)",
            "POST",
            "auth/telegram/unlink", 
            403
        )
        
        # Test 11: Unlink when no Telegram linked
        if 'admin' in self.tokens:
            self.run_test(
                "Unlink when no Telegram linked",
                "POST",
                "auth/telegram/unlink",
                400,
                token=self.tokens['admin']
            )
        
        # Test 12: Try to unlink when user has no password (Telegram-only user)
        if 'telegram_user' in self.tokens:
            self.run_test(
                "Unlink Telegram-only user (should fail)",
                "POST", 
                "auth/telegram/unlink",
                400,
                token=self.tokens['telegram_user']
            )

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting GameHub API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Run tests in order
        self.test_auth_flow()
        self.test_telegram_auth()  # Add Telegram auth tests
        self.test_categories_api()
        self.test_products_api()
        self.test_cart_and_orders()
        self.test_favorites_and_viewed()
        self.test_blog_api()
        self.test_giveaways_api()
        self.test_seller_api()
        self.test_admin_api()
        self.test_payment_flow()
        
        # Print summary
        print(f"\n📊 Test Results:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = GameHubAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())