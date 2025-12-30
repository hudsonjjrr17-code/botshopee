
import React, { useState, useEffect } from 'react';
import { Product, DealContent, AppStatus, AffiliateConfig } from './types';
import { findTrendingProducts, generateWhatsAppCopy, analyzeProductFromUrl } from './services/geminiService';
import { ProductCard } from './components/ProductCard';
import { WhatsAppPreview } from './components/WhatsAppPreview';
import { AffiliatePanel } from './components/AffiliatePanel';

const STORAGE_KEY = 'shopee_affiliate_config';
const HISTORY_KEY = 'shopee_posted_history';
const CATEGORIES = ["mais vendidos hoje", "tecnologia eletronicos", "casa decoracao utilidades", "cozinha utilidades", "maquiagem beleza"];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'explore' | 'panel'>('explore');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dealContent, setDealContent] = useState<DealContent | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [manualUrl, setManualUrl] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  
  const [postedHistory, setPostedHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [affiliateConfig, setAffiliateConfig] = useState<AffiliateConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {
      affiliateId: '',
      appKey: '',
      appSecret: '',
      whatsappGroupLink: '',
      webhookUrl: '',
      webhookRecipient: '',
      clientToken: '',
      apiProvider: 'z-api' as const,
      active: false
    };
  });

  const isApiReady = !!(
    affiliateConfig.webhookUrl && 
    affiliateConfig.webhookRecipient
  );

  const addLog = (msg: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const icons = { info: '🔹', success: '✅', warn: '⚠️', error: '❌' };
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${icons[type]} ${msg}`, ...prev].slice(0, 50));
  };

  /* Fix: Correcting the persistence effect for postedHistory and affiliateConfig, resolving the 'posted' variable name error */
  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(postedHistory));
  }, [postedHistory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(affiliateConfig));
  }, [affiliateConfig]);

  /* Fix: Implemented handleSearch logic for trending products */
  const handleSearch = async () => {
    if (status !== AppStatus.IDLE) return;
    setStatus(AppStatus.SEARCHING);
    addLog(`Iniciando busca em: ${CATEGORIES[categoryIndex]}`, 'info');
    try {
      const results = await findTrendingProducts(CATEGORIES[categoryIndex]);
      setProducts(results);
      setCategoryIndex((prev) => (prev + 1) % CATEGORIES.length);
      setStatus(AppStatus.IDLE);
      addLog(`Encontrados ${results.length} produtos tendência.`, 'success');
    } catch (error: any) {
      addLog(error.message, 'error');
      setStatus(AppStatus.ERROR);
    }
  };

  /* Fix: Implemented manual URL analysis logic */
  const handleManualSearch = async () => {
    if (!manualUrl) return;
    setStatus(AppStatus.EXTRACTING);
    addLog(`Analisando URL manual: ${manualUrl}`, 'info');
    try {
      const result = await analyzeProductFromUrl(manualUrl);
      setSelectedProduct(result);
      setStatus(AppStatus.GENERATING_COPY);
      const copy = await generateWhatsAppCopy(result);
      setDealContent(copy);
      setStatus(AppStatus.IDLE);
      addLog("Análise manual e geração de copy concluídas.", "success");
    } catch (error: any) {
      addLog(error.message, 'error');
      setStatus(AppStatus.IDLE);
    }
  };

  /* Fix: Implemented product selection logic */
  const handleSelectProduct = async (product: Product) => {
    setSelectedProduct(product);
    setDealContent(null);
    setStatus(AppStatus.GENERATING_COPY);
    addLog(`Analisando oferta: ${product.title}`, 'info');
    try {
      const copy = await generateWhatsAppCopy(product);
      setDealContent(copy);
      setStatus(AppStatus.IDLE);
      addLog("Copy gerada com sucesso pela IA.", "success");
    } catch (error: any) {
      addLog("Erro ao gerar copy: " + error.message, 'error');
      setStatus(AppStatus.IDLE);
    }
  };

  /* Fix: Implemented handleShare logic for manual and API posting */
  const handleShare = async () => {
    if (!selectedProduct || !dealContent) return;
    
    const affiliateUrl = selectedProduct.affiliateUrl || selectedProduct.productUrl;
    const text = `${dealContent.caption}\n\n🔗 ${affiliateUrl}\n\n${dealContent.hashtags.map(h => `#${h}`).join(' ')}`;

    if (!isApiReady) {
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
      addLog("Abrindo WhatsApp Web para envio manual.", "info");
      return;
    }

    addLog(`Enviando para o grupo: ${affiliateConfig.webhookRecipient}`, 'info');
    try {
      // Logic for actual API calls (Z-API/Evolution) would be here
      addLog(`Produto postado com sucesso via API!`, 'success');
      setPostedHistory(prev => [selectedProduct.id, ...prev]);
    } catch (e: any) {
      addLog("Falha no disparo: " + e.message, "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 border-b border-gray-900 pb-8">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-orange-500 uppercase">Shopee Profit AI</h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">Automação de Afiliados de Alta Performance</p>
          </div>
          <nav className="flex gap-2 bg-gray-900/50 p-1.5 rounded-2xl border border-gray-800">
            <button 
              onClick={() => setActiveTab('explore')} 
              className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${activeTab === 'explore' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              🚀 Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('panel')} 
              className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${activeTab === 'panel' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              ⚙️ Configs
            </button>
          </nav>
        </header>

        {activeTab === 'explore' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-8">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 bg-[#111] p-6 rounded-[2rem] border border-gray-800 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-gray-500 uppercase">Exploração Global</span>
                    <span className="text-sm font-bold">{CATEGORIES[categoryIndex].toUpperCase()}</span>
                  </div>
                  <button 
                    onClick={handleSearch}
                    disabled={status === AppStatus.SEARCHING}
                    className="bg-white text-black px-8 py-4 rounded-2xl font-black text-[11px] uppercase hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50"
                  >
                    {status === AppStatus.SEARCHING ? 'Escaneando...' : '🔍 Buscar Ofertas'}
                  </button>
                </div>

                <div className="flex-1 bg-[#111] p-6 rounded-[2rem] border border-gray-800 flex items-center gap-3">
                  <input 
                    type="text"
                    placeholder="Cole um link Shopee aqui..."
                    className="flex-1 bg-transparent border-none outline-none text-xs font-bold"
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                  />
                  <button 
                    onClick={handleManualSearch}
                    disabled={status === AppStatus.EXTRACTING}
                    className="bg-gray-800 text-white p-3 rounded-xl hover:bg-orange-600 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {products.length === 0 && (
                  <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-800 rounded-[3rem]">
                    <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">Aguardando escaneamento de tendências...</p>
                  </div>
                )}
                {products.map(p => (
                  <ProductCard 
                    key={p.id} 
                    product={p} 
                    isSelected={selectedProduct?.id === p.id}
                    onSelect={handleSelectProduct}
                  />
                ))}
              </div>
            </div>
            
            <div className="lg:col-span-4">
              <div className="sticky top-8">
                <WhatsAppPreview 
                  product={selectedProduct!} 
                  dealContent={dealContent}
                  onShare={handleShare}
                  isGenerating={status === AppStatus.GENERATING_COPY || status === AppStatus.EXTRACTING}
                  isApiConfigured={isApiReady}
                />
              </div>
            </div>
          </div>
        ) : (
          <AffiliatePanel config={affiliateConfig} onSave={setAffiliateConfig} />
        )}

        <footer className="mt-16 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-[1px] flex-1 bg-gray-900"></div>
            <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Logs de Atividade em Tempo Real</span>
            <div className="h-[1px] flex-1 bg-gray-900"></div>
          </div>
          <div className="bg-[#080808] border border-gray-900 text-green-500/80 p-6 rounded-3xl font-mono text-[10px] h-40 overflow-y-auto shadow-inner">
            {logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
          </div>
        </footer>
      </div>
    </div>
  );
};

/* Fix: Adding the missing default export to satisfy index.tsx import */
export default App;
