import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Minus } from 'lucide-react';
import { CartContext } from '@/App';

export default function CartPage() {
  const { cart, removeFromCart, updateCartQuantity } = useContext(CartContext);
  const navigate = useNavigate();

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (cart.length === 0) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center" data-testid="empty-cart">
          <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Unbounded' }}>
            Корзина пуста
          </h1>
          <p className="text-[#8b949e] mb-8">Добавьте товары в корзину</p>
          <Button
            onClick={() => navigate('/catalog')}
            className="skew-button bg-[#00ff9d] hover:bg-[#00cc7d] text-black"
          >
            <span>К покупкам</span>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8" style={{ fontFamily: 'Unbounded' }} data-testid="cart-heading">
          Корзина
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4" data-testid="cart-items">
            {cart.map(item => (
              <div key={item.id} className="glass-panel rounded-xl p-6" data-testid={`cart-item-${item.id}`}>
                <div className="flex items-center space-x-4">
                  <img
                    src={item.images[0] || 'https://images.unsplash.com/photo-1605433887450-490fcd8c0c17?crop=entropy&cs=srgb&fm=jpg&q=85'}
                    alt={item.title}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold mb-1" data-testid={`cart-item-title-${item.id}`}>{item.title}</h3>
                    <p className="text-sm text-[#8b949e] mb-2">{item.product_type}</p>
                    <p className="text-[#00ff9d] font-bold" data-testid={`cart-item-price-${item.id}`}>${item.price}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                      className="p-2 hover:bg-[#161b22] rounded-lg transition-colors"
                      data-testid={`decrease-quantity-${item.id}`}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold" data-testid={`cart-item-quantity-${item.id}`}>{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                      className="p-2 hover:bg-[#161b22] rounded-lg transition-colors"
                      data-testid={`increase-quantity-${item.id}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 hover:bg-[#ff003c] hover:text-white rounded-lg transition-colors"
                    data-testid={`remove-item-${item.id}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="glass-panel rounded-xl p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Unbounded' }}>
                Итого
              </h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-[#8b949e]">Товаров:</span>
                  <span>{cart.length}</span>
                </div>
                <div className="flex justify-between text-xl font-bold">
                  <span>Итого:</span>
                  <span className="text-[#00ff9d]" data-testid="cart-total">${total.toFixed(2)}</span>
                </div>
              </div>
              <Button
                onClick={() => navigate('/checkout')}
                className="w-full skew-button bg-[#00ff9d] hover:bg-[#00cc7d] text-black font-bold py-6"
                data-testid="checkout-button"
              >
                <span>Оформить заказ</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}