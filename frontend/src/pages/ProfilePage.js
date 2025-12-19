import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthContext, FavoritesContext, API } from '@/App';
import { Package, Heart, Eye, User, Wallet, Plus, Minus, DollarSign, History, MessageCircle, Copy } from 'lucide-react';
import { GameCard } from '@/components/GameCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, token } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [favoritesProducts, setFavoritesProducts] = useState([]);
  const [viewed, setViewed] = useState([]);
  const [balance, setBalance] = useState(user?.balance || 0);
  const [transactions, setTransactions] = useState([]);
  
  // Modal states
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchFavorites();
    fetchViewed();
    fetchBalance();
    fetchTransactions();
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
      setFavoritesProducts(response.data);
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

  const fetchBalance = async () => {
    try {
      const response = await axios.get(`${API}/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBalance(response.data.balance);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (amount <= 0) {
      toast.error('Сумма должна быть больше 0');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/balance/deposit`, 
        { amount, method: 'stripe' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBalance(response.data.new_balance);
      setDepositModalOpen(false);
      setDepositAmount('');
      fetchTransactions();
      toast.success(`Баланс пополнен на $${amount.toFixed(2)}`);
    } catch (error) {
      toast.error('Ошибка пополнения баланса');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (amount <= 0) {
      toast.error('Сумма должна быть больше 0');
      return;
    }
    if (amount > balance) {
      toast.error('Недостаточно средств');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/balance/withdrawal`,
        { amount, method: 'bank_transfer' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBalance(response.data.new_balance);
      setWithdrawModalOpen(false);
      setWithdrawAmount('');
      fetchTransactions();
      toast.success(`Заявка на вывод $${amount.toFixed(2)} создана`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка вывода средств');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Profile Header */}
        <div className="glass-panel rounded-xl p-8 mb-8" data-testid="profile-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, var(--site-primary), var(--site-primary-hover))' }}>
                <User className="w-12 h-12 text-black" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Unbounded' }} data-testid="user-name">
                  {user?.full_name}
                </h1>
                <p className="text-[#8b949e]" data-testid="user-email">{user?.email}</p>
                <span className="inline-flex items-center rounded-full border border-primary bg-primary-10 px-3 py-1 text-xs font-semibold text-primary mt-2">
                  {user?.role}
                </span>
              </div>
            </div>
            {(user?.role === 'seller' || user?.role === 'admin') && (
              <Button
                onClick={() => window.location.href = '/seller-dashboard'}
                className="skew-button bg-primary hover:bg-primary-hover text-black"
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

        {/* Balance Card */}
        <div className="glass-panel rounded-xl p-8 mb-8" data-testid="balance-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-primary-10">
                <Wallet className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-[#8b949e] mb-1">Баланс</p>
                <h2 className="text-4xl font-bold" style={{ fontFamily: 'Unbounded' }} data-testid="balance-amount">
                  ${balance.toFixed(2)}
                </h2>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() => setDepositModalOpen(true)}
                className="skew-button bg-primary hover:bg-primary-hover text-black"
                data-testid="deposit-button"
              >
                <span className="flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Пополнить
                </span>
              </Button>
              <Button
                onClick={() => setWithdrawModalOpen(true)}
                variant="outline"
                className="skew-button border-primary hover:bg-primary-10"
                data-testid="withdraw-button"
              >
                <span className="flex items-center">
                  <Minus className="w-5 h-5 mr-2" />
                  Вывести
                </span>
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orders" className="w-full" onValueChange={(value) => {
          if (value === 'favorites') {
            fetchFavorites();
          } else if (value === 'viewed') {
            fetchViewed();
          }
        }}>
          <TabsList className="mb-8">
            <TabsTrigger value="orders" data-testid="orders-tab">
              <Package className="w-4 h-4 mr-2" />
              Заказы
            </TabsTrigger>
            <TabsTrigger value="transactions" data-testid="transactions-tab">
              <History className="w-4 h-4 mr-2" />
              Транзакции
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
                        order.status === 'paid' ? 'bg-primary-10 text-primary border border-primary' :
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
                          <span className="text-primary">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between font-bold pt-4 border-t border-[#30363d]">
                      <span>Итого:</span>
                      <span className="text-primary">${order.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transactions">
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-[#8b949e]" data-testid="no-transactions">
                У вас пока нет транзакций
              </div>
            ) : (
              <div className="space-y-4" data-testid="transactions-list">
                {transactions.map(transaction => (
                  <div key={transaction.id} className="glass-panel rounded-xl p-6" data-testid={`transaction-${transaction.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          transaction.type === 'deposit' ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}>
                          {transaction.type === 'deposit' ? (
                            <Plus className="w-6 h-6 text-green-500" />
                          ) : (
                            <Minus className="w-6 h-6 text-red-500" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">
                            {transaction.type === 'deposit' ? 'Пополнение' : 'Вывод'} ${transaction.amount.toFixed(2)}
                          </h3>
                          <p className="text-sm text-[#8b949e]">
                            {new Date(transaction.created_at).toLocaleString('ru-RU')}
                          </p>
                          {transaction.description && (
                            <p className="text-xs text-[#8b949e] mt-1">{transaction.description}</p>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        transaction.status === 'completed' ? 'bg-green-500/10 text-green-500 border border-green-500' :
                        transaction.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500' :
                        'bg-red-500/10 text-red-500 border border-red-500'
                      }`}>
                        {transaction.status === 'completed' ? 'Завершено' :
                         transaction.status === 'pending' ? 'В обработке' : 
                         'Отменено'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites">
            {favoritesProducts.length === 0 ? (
              <div className="text-center py-12 text-[#8b949e]" data-testid="no-favorites">
                У вас пока нет избранных товаров
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {favoritesProducts.map(product => (
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

      {/* Deposit Modal */}
      {depositModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDepositModalOpen(false)}>
          <div className="glass-panel rounded-xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Unbounded' }}>
              Пополнение баланса
            </h2>
            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <Label htmlFor="deposit-amount">Сумма</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b949e]" />
                  <Input
                    id="deposit-amount"
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="pl-10"
                    required
                    data-testid="deposit-amount-input"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 skew-button bg-primary hover:bg-primary-hover text-black"
                  data-testid="deposit-submit-button"
                >
                  <span>{loading ? 'Обработка...' : 'Пополнить'}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDepositModalOpen(false)}
                  className="flex-1 skew-button"
                >
                  <span>Отмена</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {withdrawModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setWithdrawModalOpen(false)}>
          <div className="glass-panel rounded-xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Unbounded' }}>
              Вывод средств
            </h2>
            <div className="mb-4 p-4 bg-[#161b22] rounded-lg">
              <p className="text-sm text-[#8b949e]">Доступно для вывода:</p>
              <p className="text-2xl font-bold text-primary">${balance.toFixed(2)}</p>
            </div>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <Label htmlFor="withdraw-amount">Сумма</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b949e]" />
                  <Input
                    id="withdraw-amount"
                    type="number"
                    step="0.01"
                    min="1"
                    max={balance}
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="pl-10"
                    required
                    data-testid="withdraw-amount-input"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 skew-button bg-primary hover:bg-primary-hover text-black"
                  data-testid="withdraw-submit-button"
                >
                  <span>{loading ? 'Обработка...' : 'Вывести'}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWithdrawModalOpen(false)}
                  className="flex-1 skew-button"
                >
                  <span>Отмена</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}