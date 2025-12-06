import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Layout } from '@/components/Layout';
import { GameCard } from '@/components/GameCard';
import { API } from '@/App';
import { User } from 'lucide-react';

export default function SellerPage() {
  const { id } = useParams();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchSeller();
    fetchProducts();
  }, [id]);

  const fetchSeller = async () => {
    try {
      const response = await axios.get(`${API}/sellers/${id}`);
      setSeller(response.data);
    } catch (error) {
      console.error('Failed to fetch seller:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/sellers/${id}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  if (!seller) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-[#00ff9d] text-xl">Загрузка...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Seller Profile */}
        <div className="glass-panel rounded-xl p-8 mb-8" data-testid="seller-profile">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-gradient-to-br from-[#00ff9d] to-[#00cc7d] rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Unbounded' }} data-testid="seller-name">
                {seller.full_name}
              </h1>
              <p className="text-[#8b949e]" data-testid="seller-email">{seller.email}</p>
              <span className="inline-flex items-center rounded-full border border-[#00ff9d] bg-[#00ff9d]/10 px-3 py-1 text-xs font-semibold text-[#00ff9d] mt-2">
                Продавец
              </span>
            </div>
          </div>
        </div>

        {/* Seller's Products */}
        <div>
          <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: 'Unbounded' }} data-testid="seller-products-heading">
            Товары продавца
          </h2>
          {products.length === 0 ? (
            <div className="text-center py-12 text-[#8b949e]" data-testid="no-products">
              У этого продавца пока нет товаров
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="seller-products-grid">
              {products.map(product => (
                <GameCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}