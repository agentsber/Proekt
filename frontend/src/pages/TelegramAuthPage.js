import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Layout } from '@/components/Layout';
import { AuthContext, API } from '@/App';
import { toast } from 'sonner';
import { MessageCircle, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TelegramAuthPage() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      authenticateWithToken(token);
    } else {
      setStatus('error');
      setErrorMessage('Токен не найден');
    }
  }, [searchParams]);

  const authenticateWithToken = async (token) => {
    try {
      const response = await axios.post(`${API}/auth/telegram/bot-token?token=${token}`);
      
      // Login successful
      login(response.data.access_token, response.data.user);
      setStatus('success');
      toast.success('Добро пожаловать!');
      
      // Redirect to profile after short delay
      setTimeout(() => {
        navigate('/profile');
      }, 1500);
      
    } catch (error) {
      console.error('Telegram auth error:', error);
      setStatus('error');
      setErrorMessage(error.response?.data?.detail || 'Ошибка авторизации');
      toast.error('Ошибка авторизации');
    }
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center py-16">
        <div className="w-full max-w-md">
          <div className="glass-panel rounded-2xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" 
                   style={{ background: status === 'success' ? 'rgba(34, 197, 94, 0.2)' : 
                           status === 'error' ? 'rgba(239, 68, 68, 0.2)' : 
                           'rgba(var(--site-primary-rgb), 0.2)' }}>
                {status === 'loading' && (
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                )}
                {status === 'success' && (
                  <CheckCircle className="w-10 h-10 text-green-500" />
                )}
                {status === 'error' && (
                  <XCircle className="w-10 h-10 text-red-500" />
                )}
              </div>
            </div>

            <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Unbounded' }}>
              {status === 'loading' && 'Авторизация...'}
              {status === 'success' && 'Успешно!'}
              {status === 'error' && 'Ошибка'}
            </h1>

            <p className="text-[#8b949e] mb-6">
              {status === 'loading' && 'Подождите, проверяем ваши данные...'}
              {status === 'success' && 'Вы успешно вошли через Telegram. Перенаправляем...'}
              {status === 'error' && errorMessage}
            </p>

            {status === 'error' && (
              <div className="space-y-3">
                <Button
                  onClick={() => window.open('https://t.me/eplaysbot', '_blank')}
                  className="w-full skew-button bg-primary hover:bg-primary-hover text-black"
                >
                  <span className="flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Открыть бота
                  </span>
                </Button>
                <Button
                  onClick={() => navigate('/auth')}
                  variant="outline"
                  className="w-full"
                >
                  Войти другим способом
                </Button>
              </div>
            )}

            {status === 'success' && (
              <div className="flex items-center justify-center space-x-2 text-primary">
                <MessageCircle className="w-5 h-5" />
                <span>Telegram авторизация</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
