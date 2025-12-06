import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Eye } from 'lucide-react';
import { CurrencyContext } from '@/App';
import { formatPrice } from '@/utils/currency';

export const GameCard = ({ product, onFavorite }) => {
  const { currency } = useContext(CurrencyContext);

  return (
    <Link
      to={`/product/${product.id}`}
      className="group relative overflow-hidden rounded-xl border border-[#30363d] bg-[#0d1117] transition-all hover:border-primary hover:shadow-[0_0_20px_rgba(0,255,157,0.3)] game-card-hover"
      data-testid={`product-card-${product.id}`}
      style={{
        '--hover-border': 'var(--site-primary)'
      }}
    >
      {/* Image */}
      <div className="aspect-[3/4] overflow-hidden bg-[#161b22]">
        <img
          src={product.images[0] || 'https://images.unsplash.com/photo-1605433887450-490fcd8c0c17?crop=entropy&cs=srgb&fm=jpg&q=85'}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80"></div>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center rounded-full border border-primary bg-primary-10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {product.product_type}
          </span>
          {onFavorite && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onFavorite(product.id);
              }}
              className="p-1.5 rounded-full bg-black/50 hover:bg-primary hover:text-black transition-colors"
              data-testid={`favorite-btn-${product.id}`}
            >
              <Heart className="w-4 h-4" />
            </button>
          )}
        </div>

        <h3 className="text-lg font-bold mb-1 line-clamp-1" style={{ fontFamily: 'Unbounded' }} data-testid={`product-title-${product.id}`}>
          {product.title}
        </h3>

        <p className="text-sm text-[#8b949e] mb-3 line-clamp-2">
          {product.description}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary" data-testid={`product-price-${product.id}`}>
            {formatPrice(product.price, currency)}
          </span>
          <div className="flex items-center space-x-3 text-xs text-[#8b949e]">
            <span className="flex items-center">
              <Eye className="w-3 h-3 mr-1" />
              {product.views_count}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};