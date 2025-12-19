import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Layout } from '@/components/Layout';
import { GameCard } from '@/components/GameCard';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Heart, Eye, Package, MessageCircle } from 'lucide-react';
import { AuthContext, CartContext, CurrencyContext, API } from '@/App';
import { toast } from 'sonner';
import { formatPrice } from '@/utils/currency';

export default function ProductPage() {
  const { id } = useParams();
  const { user, token } = useContext(AuthContext);
  const { addToCart } = useContext(CartContext);
  const { currency } = useContext(CurrencyContext);
  const [product, setProduct] = useState(null);
  const [similar, setSimilar] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProduct();
    fetchSimilar();
    if (user && token) {
      addViewed();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API}/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Failed to fetch product:', error);
      toast.error('Ошибка загрузки товара');
    }
  };

  const fetchSimilar = async () => {
    try {
      const response = await axios.get(`${API}/products/${id}/similar`);
      setSimilar(response.data);
    } catch (error) {
      console.error('Failed to fetch similar products:', error);
    }
  };

  const addViewed = async () => {
    try {
      await axios.post(`${API}/viewed/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Failed to add viewed:', error);
    }
  };

  const handleAddToCart = () => {
    addToCart(product);
    toast.success('Добавлено в корзину');
  };

  const handleAddToFavorites = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    try {
      await axios.post(`${API}/favorites?product_id=${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Добавлено в избранное');
    } catch (error) {
      toast.error('Ошибка добавления в избранное');
    }
  };

  if (!product) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-primary text-xl">Загрузка...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Product Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Image */}
          <div className="aspect-square rounded-2xl overflow-hidden" data-testid="product-image-container">
            <img
              src={product.images[0] || 'https://images.unsplash.com/photo-1605433887450-490fcd8c0c17?crop=entropy&cs=srgb&fm=jpg&q=85'}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Info */}
          <div>
            <div className="inline-flex items-center rounded-full border border-primary bg-primary-10 px-3 py-1 text-sm font-semibold text-primary mb-4">
              {product.product_type}
            </div>
            <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Unbounded' }} data-testid="product-title">
              {product.title}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-[#8b949e] mb-6">
              <span className="flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                {product.views_count} просмотров
              </span>
              <span className="flex items-center">
                <Package className="w-4 h-4 mr-1" />
                {product.stock} в наличии
              </span>
            </div>

            <p className="text-[#8b949e] mb-8 leading-relaxed" data-testid="product-description">
              {product.description}
            </p>

            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[#8b949e]">Цена:</span>
                <span className="text-4xl font-bold text-primary" data-testid="product-price">
                  {formatPrice(product.price, currency)}
                </span>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={handleAddToCart}
                  className="flex-1 skew-button bg-primary hover:bg-primary-hover text-black font-bold py-6"
                  data-testid="add-to-cart-button"
                >
                  <span className="flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    В корзину
                  </span>
                </Button>
                <Button
                  onClick={handleAddToFavorites}
                  variant="outline"
                  className="p-6 border-[#30363d] hover:bg-[#161b22]"
                  data-testid="add-to-favorites-button"
                >
                  <Heart className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {product.seller_id && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate(`/seller/${product.seller_id}`)}
                  className="text-primary hover:text-primary-hover text-sm"
                  data-testid="view-seller-button"
                >
                  Посмотреть продавца →
                </button>
                {user && user.id !== product.seller_id && (
                  <Button
                    onClick={async () => {
                      try {
                        const response = await axios.post(
                          `${API}/chats?seller_id=${product.seller_id}&product_id=${product.id}`,
                          {},
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        navigate(`/chats/${response.data.id}`);
                      } catch (error) {
                        toast.error('Ошибка создания чата');
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="border-primary text-primary hover:bg-primary hover:text-black"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Написать
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Similar Products */}
        {similar.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: 'Unbounded' }} data-testid="similar-products-heading">
              Похожие товары
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {similar.map(p => (
                <GameCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}