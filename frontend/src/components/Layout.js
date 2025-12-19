import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Settings, Search, Menu, X, Loader2, Plus, Bell, MessageCircle, Home } from 'lucide-react';
import { AuthContext, CartContext, SiteSettingsContext } from '@/App';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import axios from 'axios';
import { API } from '@/App';

export const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const { cart } = useContext(CartContext);
  const { siteSettings } = useContext(SiteSettingsContext);
  const navigate = useNavigate();
  const location = useLocation();

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Search with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await axios.get(`${API}/products?search=${searchQuery}&limit=5`);
        setSearchResults(response.data);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchOpen = () => {
    setSearchOpen(true);
  };

  const handleSearchClose = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleProductClick = (productId) => {
    handleSearchClose();
    navigate(`/product/${productId}`);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar - Steam Style */}
      <aside className="fixed left-0 top-0 h-full w-20 bg-[#0d1117] border-r border-[#30363d] z-40 flex flex-col items-center py-4">
        {/* Logo */}
        <Link to="/" className="mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-[#00ff9d] to-[#00cc7d] rounded-xl flex items-center justify-center hover:scale-105 transition-transform">
            <span className="text-black font-bold text-xl" style={{ fontFamily: 'Unbounded' }}>
              {siteSettings?.site_name?.charAt(0) || 'G'}
            </span>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="flex-1 flex flex-col items-center space-y-2">
          {/* Home */}
          <Link
            to="/"
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all hover:bg-[#161b22] ${location.pathname === '/' ? 'bg-[#161b22] text-primary' : 'text-[#8b949e]'}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] mt-1">Главная</span>
          </Link>

          {/* Sell / Add Product (for sellers) */}
          {user && (user.role === 'seller' || user.role === 'admin') && (
            <Link
              to="/seller-dashboard"
              className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all hover:bg-[#161b22] ${location.pathname === '/seller-dashboard' ? 'bg-[#161b22] text-primary' : 'text-[#8b949e]'}`}
            >
              <Plus className="w-6 h-6" />
              <span className="text-[10px] mt-1">Продать</span>
            </Link>
          )}

          {/* Notifications */}
          {user && (
            <button
              className="w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all hover:bg-[#161b22] text-[#8b949e] relative"
            >
              <Bell className="w-6 h-6" />
              <span className="text-[10px] mt-1">Увед.</span>
            </button>
          )}

          {/* Chats */}
          {user && (
            <button
              className="w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all hover:bg-[#161b22] text-[#8b949e]"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-[10px] mt-1">Чаты</span>
            </button>
          )}

          {/* Profile */}
          {user && (
            <Link
              to="/profile"
              className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all hover:bg-[#161b22] ${location.pathname === '/profile' ? 'bg-[#161b22] text-primary' : 'text-[#8b949e]'}`}
            >
              <User className="w-6 h-6" />
              <span className="text-[10px] mt-1">Профиль</span>
            </Link>
          )}

          {/* Admin */}
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all hover:bg-[#161b22] ${location.pathname === '/admin' ? 'bg-[#161b22] text-primary' : 'text-[#8b949e]'}`}
            >
              <Settings className="w-6 h-6" />
              <span className="text-[10px] mt-1">Админ</span>
            </Link>
          )}
        </nav>

        {/* Bottom Section - Cart & Auth */}
        <div className="flex flex-col items-center space-y-2 mt-auto">
          {/* Cart */}
          <button
            onClick={() => navigate('/cart')}
            className="w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all hover:bg-[#161b22] text-[#8b949e] relative"
          >
            <ShoppingCart className="w-6 h-6" />
            {cartItemsCount > 0 && (
              <span className="absolute top-1 right-1 bg-primary text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartItemsCount}
              </span>
            )}
            <span className="text-[10px] mt-1">Корзина</span>
          </button>

          {/* Login/Logout */}
          {user ? (
            <button
              onClick={logout}
              className="w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all hover:bg-[#161b22] text-[#8b949e]"
            >
              <LogOut className="w-6 h-6" />
              <span className="text-[10px] mt-1">Выход</span>
            </button>
          ) : (
            <Link
              to="/auth"
              className="w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all hover:bg-[#161b22] text-primary"
            >
              <User className="w-6 h-6" />
              <span className="text-[10px] mt-1">Войти</span>
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-20">
        {/* Header */}
        <header className="sticky top-0 z-30 glass-panel border-b border-[#30363d]">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Page Title / Navigation */}
              <nav className="flex items-center space-x-6">
                <Link to="/catalog" className="text-[#8b949e] hover:text-[#00ff9d] transition-colors" data-testid="catalog-link">
                  Каталог
                </Link>
                <Link to="/giveaways" className="text-[#8b949e] hover:text-[#00ff9d] transition-colors" data-testid="giveaways-link">
                  Раздачи
                </Link>
                <Link to="/blog" className="text-[#8b949e] hover:text-[#00ff9d] transition-colors" data-testid="blog-link">
                  Блог
                </Link>
              </nav>

              {/* Search */}
              <div className="flex items-center">
                <button
                  onClick={handleSearchOpen}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#161b22] hover:bg-[#21262d] rounded-lg transition-colors text-[#8b949e]"
                  data-testid="search-button"
                >
                  <Search className="w-5 h-5" />
                  <span className="hidden sm:inline">Поиск...</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main>
          {children}
        </main>

      {/* Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20"
          onClick={handleSearchClose}
        >
          <div
            className="w-full max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="glass-panel rounded-xl p-4 mb-4">
              <div className="flex items-center space-x-3">
                <Search className="w-5 h-5 text-[#8b949e]" />
                <input
                  type="text"
                  placeholder="Поиск товаров..."
                  className="flex-1 bg-transparent border-none outline-none text-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  data-testid="search-input"
                />
                {searchLoading && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                <button
                  onClick={handleSearchClose}
                  className="p-2 hover:bg-[#161b22] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searchQuery.length >= 2 && (
              <div className="glass-panel rounded-xl max-h-[60vh] overflow-y-auto">
                {searchLoading ? (
                  <div className="p-8 text-center text-[#8b949e]">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
                    Поиск...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="divide-y divide-[#30363d]">
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleProductClick(product.id)}
                        className="w-full p-4 hover:bg-[#161b22] transition-colors text-left flex items-center space-x-4"
                        data-testid={`search-result-${product.id}`}
                      >
                        <img
                          src={product.images[0] || 'https://images.unsplash.com/photo-1605433887450-490fcd8c0c17?crop=entropy&cs=srgb&fm=jpg&q=85'}
                          alt={product.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{product.title}</h3>
                          <p className="text-sm text-[#8b949e] line-clamp-1">{product.description}</p>
                        </div>
                        <div className="text-primary font-bold">${product.price}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-[#8b949e]" data-testid="no-results">
                    Ничего не найдено
                  </div>
                )}
              </div>
            )}

            {/* Search Hint */}
            {searchQuery.length < 2 && (
              <div className="text-center text-[#8b949e] text-sm mt-4">
                Введите минимум 2 символа для поиска
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#0d1117] border-t border-[#30363d] mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold mb-4" style={{ fontFamily: 'Unbounded' }}>
                {siteSettings?.site_name || 'GameHub'}
              </h3>
              <p className="text-[#8b949e] text-sm">
                {siteSettings?.site_description || 'Маркетплейс игровых товаров'}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Навигация</h4>
              <ul className="space-y-2 text-sm text-[#8b949e]">
                {siteSettings?.footer_navigation?.map((link, index) => (
                  <li key={index}>
                    {link.url.startsWith('/') ? (
                      <Link to={link.url} className="hover:text-[#00ff9d]">{link.title}</Link>
                    ) : (
                      <a href={link.url} className="hover:text-[#00ff9d]">{link.title}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Поддержка</h4>
              <ul className="space-y-2 text-sm text-[#8b949e]">
                {siteSettings?.footer_support?.map((link, index) => (
                  <li key={index}>
                    {link.url.startsWith('/') ? (
                      <Link to={link.url} className="hover:text-[#00ff9d]">{link.title}</Link>
                    ) : (
                      <a href={link.url} className="hover:text-[#00ff9d]">{link.title}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Юридическое</h4>
              <ul className="space-y-2 text-sm text-[#8b949e]">
                {siteSettings?.footer_legal?.map((link, index) => (
                  <li key={index}>
                    {link.url.startsWith('/') ? (
                      <Link to={link.url} className="hover:text-[#00ff9d]">{link.title}</Link>
                    ) : (
                      <a href={link.url} className="hover:text-[#00ff9d]">{link.title}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-[#30363d] text-center text-sm text-[#8b949e]">
            © 2025 {siteSettings?.site_name || 'GameHub'}. Все права защищены.
          </div>
        </div>
      </footer>
    </div>
  );
};