
import React, { useState } from 'react';
import { Product, DealContent } from '../types';

interface WhatsAppPreviewProps {
  product: Product;
  dealContent: DealContent | null;
  onShare: () => void;
  isGenerating: boolean;
  isApiConfigured: boolean;
}

export const WhatsAppPreview: React.FC<WhatsAppPreviewProps> = ({ 
  product, 
  dealContent, 
  onShare,
  isGenerating,
  isApiConfigured
}) => {
  const [activeImage, setActiveImage] = useState(0);

  if (isGenerating) {
    return (
      <div className="bg-[#141417] p-8 rounded-[2.5rem] shadow-xl border border-gray-800 flex flex-col items-center justify-center min-h-[500px]">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-gray-800 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-6 text-white font-black uppercase tracking-widest text-[10px]">IA em Processamento</p>
        <p className="text-[10px] text-gray-500 mt-2">Sincronizando metadados da Shopee...</p>
      </div>
    );
  }

  if (!product || !dealContent) {
    return (
      <div className="bg-[#141417] p-8 rounded-[2.5rem] shadow-xl border border-gray-800 flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <p className="text-gray-500 text-center font-bold text-xs uppercase tracking-widest leading-loose">Selecione uma oferta para<br/>visualizar o preview de disparo.</p>
      </div>
    );
  }

  const images = product.imageUrls || [product.imageUrl];

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#0b141a] p-3 rounded-[2.5rem] shadow-2xl border border-gray-800">
        <div className="bg-[#202c33] rounded-3xl p-3 shadow-sm border-l-4 border-green-500">
          <div className="relative group mb-3">
            <img 
              src={images[activeImage]} 
              alt="Product" 
              className="w-full h-64 object-cover rounded-2xl transition-all duration-300" 
            />
            {images.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                {images.map((_, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setActiveImage(idx)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${idx === activeImage ? 'bg-orange-500 w-4' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="p-1">
            <div className="whitespace-pre-wrap text-[12px] leading-relaxed text-gray-200">
              {dealContent.caption}
              <div className="mt-3 py-2 px-3 bg-blue-500/10 rounded-xl text-blue-400 font-black border border-blue-500/20 text-[11px] truncate">
                🔗 {product.affiliateUrl || product.productUrl}
              </div>
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={onShare}
        className={`w-full ${isApiConfigured ? 'bg-blue-600 hover:bg-blue-500' : 'bg-[#25D366] hover:bg-[#1DA851]'} text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl hover:scale-[1.02] active:scale-95 uppercase tracking-widest text-xs`}
      >
        {isApiConfigured ? (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            🚀 POSTAR NO GRUPO AGORA
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.29-4.171c1.589.945 3.554 1.443 5.548 1.444 5.46 0 9.903-4.443 9.906-9.903 0-2.646-1.03-5.132-2.903-7.005-1.873-1.872-4.358-2.903-7.003-2.903-5.463 0-9.903 4.44-9.906 9.903-.001 2.1.543 4.146 1.574 5.956l-1.057 3.856 3.941-1.034z"/>
            </svg>
            Disparar Manual (Link)
          </>
        )}
      </button>
      
      {isApiConfigured && (
        <p className="text-[9px] text-gray-500 text-center uppercase font-bold tracking-tighter">
          Modo Automático Ativo: Envia direto para o grupo via Z-API
        </p>
      )}
    </div>
  );
};
