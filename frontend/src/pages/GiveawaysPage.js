import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { AuthContext, API } from '@/App';
import { Gift, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function GiveawaysPage() {
  const { user, token } = useContext(AuthContext);
  const [giveaways, setGiveaways] = useState([]);

  useEffect(() => {
    fetchGiveaways();
  }, []);

  const fetchGiveaways = async () => {
    try {
      const response = await axios.get(`${API}/giveaways`);
      setGiveaways(response.data);
    } catch (error) {
      console.error('Failed to fetch giveaways:', error);
    }
  };

  const handleEnter = async (giveawayId) => {
    if (!user) {
      toast.error('Войдите для участия');
      return;
    }
    try {
      await axios.post(`${API}/giveaways/enter/${giveawayId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Вы участвуете в раздаче!');
      fetchGiveaways();
    } catch (error) {
      toast.error('Ошибка участия');
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12" data-testid="giveaways-header">
          <Gift className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Unbounded' }}>
            Раздачи
          </h1>
          <p className="text-[#8b949e] max-w-2xl mx-auto">
            Участвуйте в розыгрышах и выигрывайте игровые товары
          </p>
        </div>

        {giveaways.length === 0 ? (
          <div className="text-center py-12 text-[#8b949e]" data-testid="no-giveaways">
            Активных раздач пока нет
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="giveaways-grid">
            {giveaways.map(giveaway => (
              <div key={giveaway.id} className="glass-panel rounded-xl p-6" data-testid={`giveaway-${giveaway.id}`}>
                <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Unbounded' }}>
                  {giveaway.title}
                </h3>
                <p className="text-[#8b949e] mb-4">{giveaway.description}</p>
                <div className="flex items-center space-x-4 text-sm text-[#8b949e] mb-4">
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(giveaway.end_date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {giveaway.entries.length} участников
                  </span>
                </div>
                <Button
                  onClick={() => handleEnter(giveaway.id)}
                  className="w-full skew-button bg-primary hover:bg-primary-hover text-black font-bold"
                  disabled={user && giveaway.entries.includes(user.id)}
                  data-testid={`enter-giveaway-${giveaway.id}`}
                >
                  <span>
                    {user && giveaway.entries.includes(user.id) ? 'Вы участвуете' : 'Участвовать'}
                  </span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}