import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { AuthContext, CartContext, CurrencyContext, API } from '@/App';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { formatPrice } from '@/utils/currency';

export default function CheckoutPage() {
  const { user, token } = useContext(AuthContext);
  const { cart, clearCart } = useContext(CartContext);
  const { currency } = useContext(CurrencyContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Create order
      const orderData = {
        items: cart.map(item => ({
          product_id: item.id,
          title: item.title,
          price: item.price,
          quantity: item.quantity
        })),
        currency: currency
      };

      const orderResponse = await axios.post(`${API}/orders`, orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Create checkout session
      const checkoutResponse = await axios.post(
        `${API}/payments/checkout/session`,
        { order_id: orderResponse.data.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Redirect to Stripe
      window.location.href = checkoutResponse.data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Ошибка оформления заказа');
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8" style={{ fontFamily: 'Unbounded' }} data-testid="checkout-heading">
          Оформление заказа
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Unbounded' }}>
                Ваши товары
              </h2>
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between pb-4 border-b border-[#30363d] last:border-0" data-testid={`checkout-item-${item.id}`}>
                    <div className="flex items-center space-x-4">
                      <img
                        src={item.images[0] || 'https://images.unsplash.com/photo-1605433887450-490fcd8c0c17?crop=entropy&cs=srgb&fm=jpg&q=85'}
                        alt={item.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div>
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="text-sm text-[#8b949e]">Количество: {item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-bold text-[#00ff9d]">{formatPrice(item.price * item.quantity, currency)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Unbounded' }}>
                Информация о покупателе
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#8b949e]">Имя:</span>
                  <span>{user?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8b949e]">Email:</span>
                  <span>{user?.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary & Payment */}
          <div className="lg:col-span-1">
            <div className="glass-panel rounded-xl p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Unbounded' }}>
                Итого
              </h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-[#8b949e]">Сумма:</span>
                  <span>{formatPrice(total, currency)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-3 border-t border-[#30363d]">
                  <span>К оплате:</span>
                  <span className="text-[#00ff9d]" data-testid="checkout-total">{formatPrice(total, currency)}</span>
                </div>
              </div>
              <Button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full skew-button bg-[#00ff9d] hover:bg-[#00cc7d] text-black font-bold py-6"
                data-testid="payment-button"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Обработка...
                  </span>
                ) : (
                  <span>Оплатить</span>
                )}
              </Button>
              <p className="text-xs text-[#8b949e] text-center mt-4">
                Безопасная оплата через Stripe
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}