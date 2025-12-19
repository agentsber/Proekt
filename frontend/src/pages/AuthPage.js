import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthContext, API } from '@/App';
import { toast } from 'sonner';
import { TelegramLoginButton } from '@/components/TelegramLoginButton';

export default function AuthPage() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'buyer'
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, loginData);
      login(response.data.access_token, response.data.user);
      toast.success('Успешный вход!');
      navigate('/profile');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, registerData);
      login(response.data.access_token, response.data.user);
      toast.success('Регистрация успешна!');
      navigate('/profile');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramAuth = async (telegramUser) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/telegram/widget`, {
        id: telegramUser.id,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name || null,
        username: telegramUser.username || null,
        photo_url: telegramUser.photo_url || null,
        auth_date: telegramUser.auth_date,
        hash: telegramUser.hash
      });
      
      login(response.data.access_token, response.data.user);
      toast.success('Вход через Telegram успешен!');
      navigate('/profile');
    } catch (error) {
      console.error('Telegram auth error:', error);
      toast.error(error.response?.data?.detail || 'Ошибка авторизации через Telegram');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center py-16">
        <div className="w-full max-w-md">
          <div className="glass-panel rounded-2xl p-8" data-testid="auth-container">
            <h1 className="text-3xl font-bold mb-6 text-center" style={{ fontFamily: 'Unbounded' }}>
              Добро пожаловать
            </h1>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" data-testid="login-tab">Вход</TabsTrigger>
                <TabsTrigger value="register" data-testid="register-tab">Регистрация</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
                  <div>
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                      data-testid="login-email-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="login-password">Пароль</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                      data-testid="login-password-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-hover text-black font-bold"
                    disabled={loading}
                    data-testid="login-submit-button"
                  >
                    {loading ? 'Загрузка...' : 'Войти'}
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-[#30363d]" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[#0d1117] px-2 text-[#8b949e]">или</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center space-y-3">
                    <TelegramLoginButton onAuth={handleTelegramAuth} />
                    <a 
                      href="https://t.me/eplaysbot" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-[#8b949e] hover:text-primary transition-colors"
                    >
                      Или войдите через бота @eplaysbot →
                    </a>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4" data-testid="register-form">
                  <div>
                    <Label htmlFor="register-name">Полное имя</Label>
                    <Input
                      id="register-name"
                      type="text"
                      value={registerData.full_name}
                      onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                      required
                      data-testid="register-name-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      required
                      data-testid="register-email-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="register-password">Пароль</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      required
                      data-testid="register-password-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="register-role">Роль</Label>
                    <select
                      id="register-role"
                      className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg"
                      value={registerData.role}
                      onChange={(e) => setRegisterData({ ...registerData, role: e.target.value })}
                      data-testid="register-role-select"
                    >
                      <option value="buyer">Покупатель</option>
                      <option value="seller">Продавец</option>
                    </select>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-hover text-black font-bold"
                    disabled={loading}
                    data-testid="register-submit-button"
                  >
                    {loading ? 'Загрузка...' : 'Зарегистрироваться'}
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-[#30363d]" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[#0d1117] px-2 text-[#8b949e]">или</span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <TelegramLoginButton onAuth={handleTelegramAuth} />
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
}
