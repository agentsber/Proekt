import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Layout } from '@/components/Layout';
import { GameCard } from '@/components/GameCard';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Gift, BookOpen, Eye } from 'lucide-react';
import { API, AuthContext } from '@/App';
import { motion } from 'framer-motion';

export default function HomePage() {
  const { user, token } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [viewedProducts, setViewedProducts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    if (user && token) {
      fetchViewedProducts();
    }
  }, [user, token]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products?limit=8`);
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data.slice(0, 6));
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchViewedProducts = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API}/viewed/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setViewedProducts(response.data.slice(0, 4)); // Show only last 4
    } catch (error) {
      console.error('Failed to fetch viewed products:', error);
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[70vh] overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1641650265007-b2db704cd9f3?crop=entropy&cs=srgb&fm=jpg&q=85"
            alt="Hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#02040a]/50 via-[#02040a]/70 to-[#02040a]"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="max-w-3xl hero-glow" data-testid="hero-content">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-black mb-6 tracking-tight neon-text"
              style={{ fontFamily: 'Unbounded' }}
            >
              Маркетплейс<br />
              игровых товаров
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg lg:text-xl text-[#8b949e] mb-8 max-w-2xl"
            >
              Ключи активации, внутриигровые предметы и аккаунты по лучшим ценам
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Button
                onClick={() => navigate('/catalog')}
                className="skew-button bg-primary hover:bg-primary-hover text-black px-8 py-6 text-lg font-bold"
                data-testid="hero-cta-button"
              >
                <span className="flex items-center">
                  К покупкам
                  <ArrowRight className="ml-2 w-5 h-5" />
                </span>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: 'Unbounded' }} data-testid="categories-heading">
            Категории
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                to={`/catalog?category=${category.id}`}
                className="glass-panel rounded-xl p-6 text-center transition-all group"
                style={{ borderColor: 'var(--site-primary)' }}
                data-testid={`category-${index}`}
              >
                <div className="w-12 h-12 bg-primary-10 rounded-lg mx-auto mb-3 flex items-center justify-center group-hover:bg-primary transition-colors">
                  <span className="text-2xl">🎮</span>
                </div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">{category.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold" style={{ fontFamily: 'Unbounded' }} data-testid="featured-products-heading">
              Популярные товары
            </h2>
            <Link to="/catalog" className="text-primary hover:text-primary-hover flex items-center" data-testid="view-all-products-link">
              Смотреть все
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <GameCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-panel rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-primary-10 rounded-full mx-auto mb-4 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Unbounded' }}>
                Лучшие цены
              </h3>
              <p className="text-[#8b949e]">
                Конкурентные цены на все товары
              </p>
            </div>
            <Link to="/giveaways" className="glass-panel rounded-xl p-8 text-center transition-all group" style={{ borderColor: 'transparent' }}>
              <div className="w-16 h-16 bg-primary-10 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:bg-primary transition-colors">
                <Gift className="w-8 h-8 text-primary group-hover:text-black" />
              </div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-primary" style={{ fontFamily: 'Unbounded' }}>
                Раздачи
              </h3>
              <p className="text-[#8b949e]">
                Участвуйте в розыгрышах призов
              </p>
            </Link>
            <Link to="/blog" className="glass-panel rounded-xl p-8 text-center transition-all group" style={{ borderColor: 'transparent' }}>
              <div className="w-16 h-16 bg-primary-10 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:bg-primary transition-colors">
                <BookOpen className="w-8 h-8 text-primary group-hover:text-black" />
              </div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-primary" style={{ fontFamily: 'Unbounded' }}>
                Блог
              </h3>
              <p className="text-[#8b949e]">
                Новости и обзоры игр
              </p>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}