import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthContext, API } from '@/App';
import { Users, Package, ShoppingBag, DollarSign } from 'lucide-react';

export default function AdminPage() {
  const { token } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchProducts();
    fetchOrders();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/admin/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8" style={{ fontFamily: 'Unbounded' }} data-testid="admin-heading">
          Админ-панель
        </h1>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" data-testid="admin-stats">
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8b949e]">Пользователи</span>
                <Users className="w-5 h-5 text-[#00ff9d]" />
              </div>
              <p className="text-3xl font-bold" data-testid="total-users">{stats.total_users}</p>
            </div>
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8b949e]">Товары</span>
                <Package className="w-5 h-5 text-[#00ff9d]" />
              </div>
              <p className="text-3xl font-bold" data-testid="total-products">{stats.total_products}</p>
            </div>
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8b949e]">Заказы</span>
                <ShoppingBag className="w-5 h-5 text-[#00ff9d]" />
              </div>
              <p className="text-3xl font-bold" data-testid="total-orders">{stats.total_orders}</p>
            </div>
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8b949e]">Доход</span>
                <DollarSign className="w-5 h-5 text-[#00ff9d]" />
              </div>
              <p className="text-3xl font-bold" data-testid="total-revenue">${stats.total_revenue.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="users" data-testid="users-tab">Пользователи</TabsTrigger>
            <TabsTrigger value="products" data-testid="products-tab">Товары</TabsTrigger>
            <TabsTrigger value="orders" data-testid="orders-tab">Заказы</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <div className="glass-panel rounded-xl overflow-hidden">
              <table className="w-full" data-testid="users-table">
                <thead className="bg-[#0d1117]">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Имя</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Роль</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-t border-[#30363d]">
                      <td className="px-6 py-4">{user.full_name}</td>
                      <td className="px-6 py-4 text-[#8b949e]">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full border border-[#00ff9d] bg-[#00ff9d]/10 px-2.5 py-0.5 text-xs font-semibold text-[#00ff9d]">
                          {user.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="products">
            <div className="glass-panel rounded-xl overflow-hidden">
              <table className="w-full" data-testid="products-table">
                <thead className="bg-[#0d1117]">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Название</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Цена</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Склад</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Продажи</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id} className="border-t border-[#30363d]">
                      <td className="px-6 py-4">{product.title}</td>
                      <td className="px-6 py-4 text-[#00ff9d]">${product.price}</td>
                      <td className="px-6 py-4 text-[#8b949e]">{product.stock}</td>
                      <td className="px-6 py-4 text-[#8b949e]">{product.sales_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="glass-panel rounded-xl overflow-hidden">
              <table className="w-full" data-testid="orders-table">
                <thead className="bg-[#0d1117]">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Заказ</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Сумма</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Статус</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} className="border-t border-[#30363d]">
                      <td className="px-6 py-4">#{order.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-[#00ff9d]">${order.total.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          order.status === 'paid' ? 'bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]' :
                          'bg-[#8b949e]/10 text-[#8b949e] border border-[#8b949e]'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#8b949e]">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}