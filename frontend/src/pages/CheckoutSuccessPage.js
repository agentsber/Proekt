import React, { useEffect, useState, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { AuthContext, CartContext, API } from '@/App';

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { token } = useContext(AuthContext);
  const { clearCart } = useContext(CartContext);
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (sessionId && token) {
      checkPaymentStatus();
    }
  }, [sessionId, token, attempts]);

  const checkPaymentStatus = async () => {
    try {
      const response = await axios.get(`${API}/payments/checkout/status/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.payment_status === 'paid') {
        setStatus('success');
        clearCart();
      } else if (attempts < 5) {
        setTimeout(() => setAttempts(prev => prev + 1), 2000);
      } else {
        setStatus('pending');
      }
    } catch (error) {
      console.error('Failed to check payment status:', error);
      setStatus('error');
    }
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center py-16">
        <div className="max-w-md w-full glass-panel rounded-2xl p-8 text-center" data-testid="checkout-success-container">
          {status === 'checking' && (
            <>
              <Loader2 className="w-16 h-16 text-[#00ff9d] mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Unbounded' }}>
                Проверка платежа...
              </h1>
              <p className="text-[#8b949e]">Пожалуйста, подождите</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-16 h-16 text-[#00ff9d] mx-auto mb-4" data-testid="success-icon" />
              <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Unbounded' }}>
                Оплата успешна!
              </h1>
              <p className="text-[#8b949e] mb-6">
                Спасибо за покупку. Ваш заказ обрабатывается.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/profile')}
                  className="w-full bg-[#00ff9d] hover:bg-[#00cc7d] text-black font-bold"
                  data-testid="view-orders-button"
                >
                  Мои заказы
                </Button>
                <Button
                  onClick={() => navigate('/catalog')}
                  variant="outline"
                  className="w-full border-[#30363d]"
                >
                  Продолжить покупки
                </Button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <h1 className="text-2xl font-bold mb-2 text-[#ff003c]" style={{ fontFamily: 'Unbounded' }}>
                Ошибка
              </h1>
              <p className="text-[#8b949e] mb-6">
                Не удалось проверить статус платежа
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                На главную
              </Button>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}