import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Layout } from '@/components/Layout';
import { AuthContext, API } from '@/App';
import { MessageCircle, Send, ArrowLeft, User, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ChatsPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (chatId) {
      fetchChatDetails(chatId);
      fetchMessages(chatId);
    } else {
      setActiveChat(null);
      setMessages([]);
    }
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!chatId) return;
    
    const interval = setInterval(() => {
      fetchMessages(chatId);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [chatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChats = async () => {
    try {
      const response = await axios.get(`${API}/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChats(response.data);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatDetails = async (id) => {
    try {
      const response = await axios.get(`${API}/chats/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveChat(response.data);
    } catch (error) {
      console.error('Failed to fetch chat:', error);
    }
  };

  const fetchMessages = async (id) => {
    try {
      const response = await axios.get(`${API}/chats/${id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId) return;

    try {
      await axios.post(`${API}/chats/${chatId}/messages`, 
        { content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewMessage('');
      fetchMessages(chatId);
      fetchChats(); // Update chat list
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return formatTime(dateStr);
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    } else {
      return date.toLocaleDateString('ru-RU');
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="glass-panel rounded-xl overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
          <div className="flex h-full">
            {/* Chat List */}
            <div className={`w-full md:w-80 border-r border-[#30363d] flex flex-col ${chatId ? 'hidden md:flex' : 'flex'}`}>
              <div className="p-4 border-b border-[#30363d]">
                <h2 className="text-xl font-bold flex items-center" style={{ fontFamily: 'Unbounded' }}>
                  <MessageCircle className="w-5 h-5 mr-2 text-primary" />
                  Чаты
                </h2>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-[#8b949e]">Загрузка...</div>
                ) : chats.length === 0 ? (
                  <div className="p-4 text-center text-[#8b949e]">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>У вас пока нет чатов</p>
                    <p className="text-sm mt-2">Начните общение с продавцом на странице товара</p>
                  </div>
                ) : (
                  chats.map(chat => (
                    <div
                      key={chat.id}
                      onClick={() => navigate(`/chats/${chat.id}`)}
                      className={`p-4 border-b border-[#30363d] cursor-pointer hover:bg-[#161b22] transition-colors ${chatId === chat.id ? 'bg-[#161b22]' : ''}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full bg-[#21262d] flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-[#8b949e]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold truncate">
                              {chat.other_user?.full_name || 'Пользователь'}
                            </span>
                            <span className="text-xs text-[#8b949e]">
                              {formatDate(chat.last_message_at)}
                            </span>
                          </div>
                          {chat.product && (
                            <div className="flex items-center text-xs text-primary mt-0.5">
                              <Package className="w-3 h-3 mr-1" />
                              {chat.product.title}
                            </div>
                          )}
                          <p className="text-sm text-[#8b949e] truncate">
                            {chat.last_message || 'Нет сообщений'}
                          </p>
                        </div>
                        {chat.unread_count > 0 && (
                          <span className="bg-primary text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Messages */}
            <div className={`flex-1 flex flex-col ${!chatId ? 'hidden md:flex' : 'flex'}`}>
              {activeChat ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-[#30363d] flex items-center space-x-3">
                    <button
                      onClick={() => navigate('/chats')}
                      className="md:hidden p-2 hover:bg-[#161b22] rounded-lg"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-[#21262d] flex items-center justify-center">
                      <User className="w-5 h-5 text-[#8b949e]" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{activeChat.other_user?.full_name || 'Пользователь'}</h3>
                      {activeChat.product && (
                        <p className="text-xs text-primary flex items-center">
                          <Package className="w-3 h-3 mr-1" />
                          {activeChat.product.title}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-[#8b949e] py-8">
                        Начните общение
                      </div>
                    ) : (
                      messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                              msg.sender_id === user.id
                                ? 'bg-primary text-black rounded-br-md'
                                : 'bg-[#21262d] rounded-bl-md'
                            }`}
                          >
                            <p className="break-words">{msg.content}</p>
                            <p className={`text-xs mt-1 ${msg.sender_id === user.id ? 'text-black/60' : 'text-[#8b949e]'}`}>
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-[#30363d]">
                    <div className="flex space-x-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Введите сообщение..."
                        className="flex-1"
                      />
                      <Button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-primary hover:bg-primary-hover text-black px-4"
                      >
                        <Send className="w-5 h-5" />
                      </Button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[#8b949e]">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Выберите чат для просмотра сообщений</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
