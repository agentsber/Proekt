import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';

// Pages
import HomePage from '@/pages/HomePage';
import CatalogPage from '@/pages/CatalogPage';
import ProductPage from '@/pages/ProductPage';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';
import AuthPage from '@/pages/AuthPage';
import ProfilePage from '@/pages/ProfilePage';
import SellerPage from '@/pages/SellerPage';
import SellerDashboard from '@/pages/SellerDashboard';
import GiveawaysPage from '@/pages/GiveawaysPage';
import BlogPage from '@/pages/BlogPage';
import BlogPostPage from '@/pages/BlogPostPage';
import AdminPage from '@/pages/AdminPage';
import CheckoutSuccessPage from '@/pages/CheckoutSuccessPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
export const AuthContext = React.createContext(null);

// Cart Context
export const CartContext = React.createContext(null);

// Currency Context
export const CurrencyContext = React.createContext(null);

// Site Settings Context
export const SiteSettingsContext = React.createContext(null);

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [cart, setCart] = useState([]);
  const [currency, setCurrency] = useState('usd');
  const [loading, setLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState({
    primary_color: '#00ff9d',
    accent_color: '#00cc7d',
    site_name: 'GameHub'
  });

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(prev => prev.map(item => 
        item.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#02040a] flex items-center justify-center">
        <div className="text-[#00ff9d] text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateCartQuantity, clearCart }}>
        <CurrencyContext.Provider value={{ currency, setCurrency }}>
          <div className="App min-h-screen noise-bg">
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/catalog" element={<CatalogPage />} />
                <Route path="/product/:id" element={<ProductPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={user ? <CheckoutPage /> : <Navigate to="/auth" />} />
                <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
                <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/profile" />} />
                <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/auth" />} />
                <Route path="/seller-dashboard" element={user && user.role !== 'buyer' ? <SellerDashboard /> : <Navigate to="/auth" />} />
                <Route path="/seller/:id" element={<SellerPage />} />
                <Route path="/giveaways" element={<GiveawaysPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                <Route path="/admin" element={user?.role === 'admin' ? <AdminPage /> : <Navigate to="/" />} />
              </Routes>
            </BrowserRouter>
            <Toaster position="top-right" richColors />
          </div>
        </CurrencyContext.Provider>
      </CartContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;

export { API, BACKEND_URL };