import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthContext, API } from '@/App';
import { Package, Heart, Eye, User } from 'lucide-react';
import { GameCard } from '@/components/GameCard';

export default function ProfilePage() {
  const { user, token } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [viewed, setViewed] = useState([]);

  useEffect(() => {
    fetchOrders();
    fetchFavorites();
    fetchViewed();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await axios.get(`${API}/favorites/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFavorites(response.data);
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    }
  };

  const fetchViewed = async () => {
    try {
      const response = await axios.get(`${API}/viewed/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setViewed(response.data);
    } catch (error) {
      console.error('Failed to fetch viewed:', error);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Profile Header */}
        <div className="glass-panel rounded-xl p-8 mb-8" data-testid="profile-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 bg-gradient-to-br from-[#00ff9d] to-[#00cc7d] rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-black" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Unbounded' }} data-testid="user-name">
                  {user?.full_name}
                </h1>
                <p className="text-[#8b949e]" data-testid="user-email">{user?.email}</p>
                <span className="inline-flex items-center rounded-full border border-[#00ff9d] bg-[#00ff9d]/10 px-3 py-1 text-xs font-semibold text-[#00ff9d] mt-2">
                  {user?.role}
                </span>
              </div>
            </div>
            {(user?.role === 'seller' || user?.role === 'admin') && (
              <Button
                onClick={() => window.location.href = '/seller-dashboard'}
                className="skew-button bg-[#00ff9d] hover:bg-[#00cc7d] text-black"
                data-testid="manage-products-button"
              >
                <span className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Управление товарами
                </span>
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="orders" data-testid="orders-tab">
              <Package className="w-4 h-4 mr-2" />
              Заказы
            </TabsTrigger>
            <TabsTrigger value="favorites" data-testid="favorites-tab">
              <Heart className="w-4 h-4 mr-2" />
              Избранное
            </TabsTrigger>
            <TabsTrigger value="viewed" data-testid="viewed-tab">
              <Eye className="w-4 h-4 mr-2" />
              Просмотренные
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            {orders.length === 0 ? (
              <div className="text-center py-12 text-[#8b949e]" data-testid="no-orders">
                У вас пока нет заказов
              </div>
            ) : (
              <div className="space-y-4" data-testid="orders-list">
                {orders.map(order => (
                  <div key={order.id} className="glass-panel rounded-xl p-6" data-testid={`order-${order.id}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-sm text-[#8b949e]">Заказ #{order.id.slice(0, 8)}</span>
                        <p className="text-sm text-[#8b949e]">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        order.status === 'paid' ? 'bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]' :
                        order.status === 'pending' ? 'bg-[#ffbd00]/10 text-[#ffbd00] border border-[#ffbd00]' :
                        'bg-[#8b949e]/10 text-[#8b949e] border border-[#8b949e]'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="space-y-2 mb-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{item.title} x {item.quantity}</span>
                          <span className="text-[#00ff9d]">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between font-bold pt-4 border-t border-[#30363d]">
                      <span>Итого:</span>
                      <span className="text-[#00ff9d]">${order.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites">
            {favorites.length === 0 ? (
              <div className="text-center py-12 text-[#8b949e]" data-testid="no-favorites">
                У вас пока нет избранных товаров
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {favorites.map(product => (
                  <GameCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="viewed">
            {viewed.length === 0 ? (
              <div className="text-center py-12 text-[#8b949e]">
                У вас пока нет просмотренных товаров
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {viewed.map(product => (
                  <GameCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}