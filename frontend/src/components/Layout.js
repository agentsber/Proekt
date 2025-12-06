import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Settings, Search, Menu, X, Loader2 } from 'lucide-react';
import { AuthContext, CartContext, CurrencyContext, SiteSettingsContext } from '@/App';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { API } from '@/App';

export const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const { cart } = useContext(CartContext);
  const { currency, setCurrency } = useContext(CurrencyContext);
  const { siteSettings } = useContext(SiteSettingsContext);
  const navigate = useNavigate();

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
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#00ff9d] to-[#00cc7d] rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-xl" style={{ fontFamily: 'Unbounded' }}>
                  {siteSettings?.site_name?.charAt(0) || 'G'}
                </span>
              </div>
              <span className="text-xl font-bold" style={{ fontFamily: 'Unbounded' }} data-testid="site-logo">
                {siteSettings?.site_name || 'GameHub'}
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
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

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              {/* Currency Selector */}
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-20" data-testid="currency-selector">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD</SelectItem>
                  <SelectItem value="eur">EUR</SelectItem>
                  <SelectItem value="rub">RUB</SelectItem>
                </SelectContent>
              </Select>

              {/* Search Button */}
              <button
                onClick={handleSearchOpen}
                className="p-2 hover:bg-[#161b22] rounded-lg transition-colors"
                data-testid="search-button"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Cart */}
              <button
                onClick={() => navigate('/cart')}
                className="relative p-2 hover:bg-[#161b22] rounded-lg transition-colors"
                data-testid="cart-button"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center" data-testid="cart-count">
                    {cartItemsCount}
                  </span>
                )}
              </button>

              {/* User Menu */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 hover:bg-[#161b22] rounded-lg transition-colors" data-testid="user-menu-button">
                      <User className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#0d1117] border-[#30363d]">
                    <DropdownMenuItem onClick={() => navigate('/profile')} data-testid="profile-menu-item">
                      <User className="w-4 h-4 mr-2" />
                      Профиль
                    </DropdownMenuItem>
                    {(user.role === 'seller' || user.role === 'admin') && (
                      <DropdownMenuItem onClick={() => navigate('/seller-dashboard')} data-testid="seller-dashboard-menu-item">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Мои товары
                      </DropdownMenuItem>
                    )}
                    {user.role === 'admin' && (
                      <DropdownMenuItem onClick={() => navigate('/admin')} data-testid="admin-menu-item">
                        <Settings className="w-4 h-4 mr-2" />
                        Админ-панель
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={logout} data-testid="logout-menu-item">
                      <LogOut className="w-4 h-4 mr-2" />
                      Выйти
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => navigate('/auth')} className="skew-button bg-primary hover:bg-primary-hover text-black" data-testid="login-button">
                  <span>Войти</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>

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