
import React from 'react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  isSelected: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect, isSelected }) => {
  const discount = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) 
    : 0;

  return (
    <div 
      className={`bg-white rounded-3xl overflow-hidden border-2 transition-all cursor-pointer hover:shadow-xl group relative ${
        isSelected ? 'border-orange-500 ring-4 ring-orange-50' : 'border-gray-50'
      }`}
      onClick={() => onSelect(product)}
    >
      <div className="relative aspect-square overflow-hidden">
        <img 
          src={product.imageUrl} 
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        
        {/* Badges de Tendência */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && (
            <div className="bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-full shadow-lg w-fit">
              -{discount}%
            </div>
          )}
          {product.trendMetric && (
            <div className="bg-orange-500 text-white text-[9px] font-black px-2 py-1 rounded-full shadow-lg w-fit flex items-center gap-1">
              <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              {product.trendMetric}
            </div>
          )}
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-[11px] font-bold text-gray-800 line-clamp-2 h-8 mb-2 leading-tight">
          {product.title}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-black text-orange-600">
              R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-green-100 text-green-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
            🔥 Hot
          </div>
        </div>
      </div>
    </div>
  );
};
