
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Product, DealContent, AppStatus, AffiliateConfig, AutomationSettings, ApiProvider } from './types';
import { findTrendingProducts, generateWhatsAppCopy, analyzeProductFromUrl } from './services/geminiService';
import { ProductCard } from './components/ProductCard';
import { WhatsAppPreview } from './components/WhatsAppPreview';
import { AffiliatePanel } from './components/AffiliatePanel';

const STORAGE_KEY = 'shopee_affiliate_config';
const HISTORY_KEY = 'shopee_posted_history';
const CATEGORIES = ["mais vendidos hoje", "tecnologia eletronicos", "casa decoracao utilidades", "cozinha utilidades", "maquiagem beleza"];

interface WhatsAppGroup {
  id: string;
  name: string;
}

const formatCountdown = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'explore' | 'panel' | 'auto'>('explore');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dealContent, setDealContent] = useState<DealContent | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [manualUrl, setManualUrl] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isResolvingInvite, setIsResolvingInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [availableGroups, setAvailableGroups] = useState<WhatsAppGroup[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [instanceStatus, setInstanceStatus] = useState<'IDLE' | 'CONNECTED' | 'DISCONNECTED' | 'CHECKING'>('IDLE');

  const [postedHistory, setPostedHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [automation, setAutomation] = useState<AutomationSettings>({
    isEnabled: false,
    minInterval: 1, 
    maxInterval: 1, 
  });

  const [countdown, setCountdown] = useState<number | null>(null);
  
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
      apiProvider: 'z-api',
      active: false
    };
  });

  const isApiReady = !!(
    affiliateConfig.webhookUrl && 
    affiliateConfig.webhookRecipient && 
    affiliateConfig.webhookRecipient.trim().includes('@g.us')
  );

  const addLog = (msg: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const icons = { info: '🔹', success: '✅', warn: '⚠️', error: '❌' };
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${icons[type]} ${msg}`, ...prev].slice(0, 80));
  };

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(postedHistory));
  }, [postedHistory]);

  const updateAffiliateConfig = (newConfig: AffiliateConfig) => {
    setAffiliateConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  };

  const getHeaders = () => {
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    const token = affiliateConfig.clientToken?.trim() || '';
    if (token) {
      if (affiliateConfig.apiProvider === 'evolution') {
        headers['apikey'] = token;
      } else {
        headers['client-token'] = token;
      }
    }
    return headers;
  };

  const resolveJidFromInvite = async () => {
    if (!inviteLink.includes('chat.whatsapp.com/')) {
      return alert("Cole um link de convite válido: chat.whatsapp.com/...");
    }
    if (!affiliateConfig.webhookUrl) return alert("Configure a URL da API primeiro.");

    setIsResolvingInvite(true);
    addLog("Resolvendo ID através do link de convite...");

    try {
      const inviteCode = inviteLink.split('chat.whatsapp.com/')[1];
      let resolveUrl = '';

      if (affiliateConfig.apiProvider === 'evolution') {
        const base = affiliateConfig.webhookUrl.split('/message')[0];
        resolveUrl = `${base}/group/inviteInfo?inviteUrl=${encodeURIComponent(inviteLink)}`;
      } else {
        const base = affiliateConfig.webhookUrl.split('/send')[0];
        resolveUrl = `${base}/groups/from-invite/${inviteCode}`;
      }

      const response = await fetch(resolveUrl, { headers: getHeaders() });
      const data = await response.json();

      const jid = data.id || data.jid || data.groupJid || data.metadata?.id;
      
      if (jid && jid.includes('@g.us')) {
        updateAffiliateConfig({ ...affiliateConfig, webhookRecipient: jid });
        addLog(`ID Identificado: ${jid}`, "success");
        alert(`✅ Sucesso! O ID do grupo foi identificado: ${jid}`);
      } else {
        throw new Error("A API não conseguiu extrair o ID deste link.");
      }
    } catch (e: any) {
      addLog(`Falha ao resolver: ${e.message}`, "error");
      alert("Não foi possível descobrir o ID via link. Tente listar os grupos ou copiar o ID manualmente do painel da API.");
    } finally {
      setIsResolvingInvite(false);
    }
  };

  const fetchGroups = async () => {
    if (!affiliateConfig.webhookUrl) return alert("URL da API é obrigatória.");
    
    setIsLoadingGroups(true);
    setHasSearched(true);
    addLog(`Buscando grupos via ${affiliateConfig.apiProvider.toUpperCase()}...`);

    try {
      let groupsUrl = '';
      if (affiliateConfig.apiProvider === 'evolution') {
        const base = affiliateConfig.webhookUrl.split('/message')[0];
        groupsUrl = `${base}/group/fetchAllGroups`;
      } else {
        const base = affiliateConfig.webhookUrl.split('/send')[0];
        groupsUrl = `${base}/groups`;
      }

      const response = await fetch(groupsUrl, { method: 'GET', headers: getHeaders() });
      if (!response.ok) throw new Error(`Erro ${response.status}`);

      const data = await response.json();
      let rawList: any[] = [];
      
      if (Array.isArray(data)) rawList = data;
      else if (data.value && Array.isArray(data.value)) rawList = data.value;
      else if (data.data && Array.isArray(data.data)) rawList = data.data;

      if (rawList.length > 0) {
        const validGroups = rawList
          .map(g => ({ 
            id: g.id || g.jid || g.groupJid, 
            name: g.name || g.groupName || g.subject || 'Grupo sem Nome' 
          }))
          .filter(g => g.id && g.id.includes('@g.us'));
        
        setAvailableGroups(validGroups);
        addLog(`${validGroups.length} grupos carregados.`, "success");
      } else {
        addLog("Nenhum grupo retornado.", "warn");
      }
    } catch (e: any) {
      addLog(`Erro ao listar: ${e.message}. Tente resolver pelo link de convite abaixo.`, "error");
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const shareToWhatsApp = async (p: Product, c: DealContent, isAuto = false) => {
    const isImageMode = affiliateConfig.webhookUrl?.includes('/send-image') || affiliateConfig.webhookUrl?.includes('/image');
    const fullMessage = `${!isImageMode ? `🛍️ *${p.title.toUpperCase()}*\n\n` : ''}${c.caption}\n\n🛒 Compre aqui: ${p.affiliateUrl || p.productUrl}\n\n${c.hashtags.map(h => `#${h}`).join(' ')}`;
    
    if (isApiReady) {
      try {
        let payload: any = {};
        const recipient = affiliateConfig.webhookRecipient;

        if (affiliateConfig.apiProvider === 'evolution') {
          payload = { number: recipient };
          if (isImageMode) {
            payload.image = p.imageUrl.startsWith('//') ? `https:${p.imageUrl}` : p.imageUrl;
            payload.caption = fullMessage;
          } else {
            payload.text = fullMessage;
          }
        } else {
          payload = { phone: recipient };
          if (isImageMode) {
            payload.image = p.imageUrl.startsWith('//') ? `https:${p.imageUrl}` : p.imageUrl;
            payload.caption = fullMessage;
          } else {
            payload.message = fullMessage;
          }
        }

        const response = await fetch(affiliateConfig.webhookUrl!, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          addLog(`✅ Postado: ${p.title.substring(0, 15)}...`, "success");
          setPostedHistory(prev => [...prev, p.id]);
        } else {
          addLog(`❌ Erro na API.`, "error");
        }
      } catch (err: any) {
        addLog(`❌ Falha na Rede: ${err.message}`, "error");
      }
    } else if (!isAuto) {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullMessage)}`, '_blank');
    }
  };

  const loadProducts = useCallback(async () => {
    if (status === AppStatus.SEARCHING) return [];
    setStatus(AppStatus.SEARCHING);
    const currentCat = CATEGORIES[categoryIndex];
    addLog(`Buscando ofertas: ${currentCat.toUpperCase()}`);
    try {
      const trending = await findTrendingProducts(currentCat);
      setProducts(trending);
      return trending;
    } catch (error: any) {
      addLog(`Erro de busca: ${error.message}`, 'error');
      return [];
    } finally {
      setStatus(AppStatus.IDLE);
    }
  }, [categoryIndex, status]);

  useEffect(() => {
    if (activeTab === 'explore' && products.length === 0) loadProducts();
    if (activeTab === 'auto') checkInstance();
  }, [loadProducts, activeTab, products.length]);

  const handleProductSelect = async (product: Product, isAuto = false) => {
    if (!isAuto) setSelectedProduct(product);
    setStatus(AppStatus.GENERATING_COPY);
    const affiliateUrl = affiliateConfig.affiliateId 
      ? `https://shope.ee/c/${affiliateConfig.affiliateId}?url=${encodeURIComponent(product.productUrl)}`
      : product.productUrl;

    const productWithAffiliate = { ...product, affiliateUrl };
    try {
      const copy = await generateWhatsAppCopy(productWithAffiliate);
      if (!isAuto) setDealContent(copy);
      return { product: productWithAffiliate, copy };
    } catch (error: any) {
      return null;
    } finally {
      if (!isAuto) setStatus(AppStatus.IDLE);
    }
  };

  const runAutomationStep = useCallback(async () => {
    if (!automation.isEnabled || !isApiReady) return;
    setStatus(AppStatus.AUTOMATING);
    try {
      let targetList = products.filter(p => !postedHistory.includes(p.id));
      if (targetList.length === 0) {
        setCategoryIndex(prev => (prev + 1) % CATEGORIES.length);
        const fresh = await loadProducts();
        targetList = fresh.filter(p => !postedHistory.includes(p.id));
      }
      if (targetList.length > 0) {
        const result = await handleProductSelect(targetList[0], true);
        if (result) await shareToWhatsApp(result.product, result.copy, true);
      }
    } catch (e: any) {
      addLog(`Erro robô: ${e.message}`, 'error');
    } finally {
      setCountdown(automation.minInterval * 60);
      setStatus(AppStatus.IDLE);
    }
  }, [automation.isEnabled, products, postedHistory, categoryIndex, loadProducts, affiliateConfig, isApiReady]);

  useEffect(() => {
    if (automation.isEnabled && !countdown) runAutomationStep();
  }, [automation.isEnabled, runAutomationStep]);

  useEffect(() => {
    let timer: any;
    if (automation.isEnabled && countdown !== null && countdown > 0) {
      timer = setInterval(() => setCountdown(c => (c !== null ? c - 1 : null)), 1000);
    } else if (countdown === 0 && automation.isEnabled) {
      runAutomationStep();
    }
    return () => clearInterval(timer);
  }, [automation.isEnabled, countdown, runAutomationStep]);

  const checkInstance = async () => {
    if (!affiliateConfig.webhookUrl || affiliateConfig.apiProvider !== 'z-api') return;
    setInstanceStatus('CHECKING');
    try {
      const base = affiliateConfig.webhookUrl.split('/instances/')[0];
      const instId = affiliateConfig.webhookUrl.match(/\/instances\/([^\/]+)/)?.[1];
      const tokId = affiliateConfig.webhookUrl.match(/\/token\/([^\/]+)/)?.[1];
      if (!instId || !tokId) throw new Error();
      const response = await fetch(`${base}/instances/${instId}/token/${tokId}/status`, { headers: getHeaders() });
      const data = await response.json();
      setInstanceStatus(data.connected ? 'CONNECTED' : 'DISCONNECTED');
    } catch (e) {
      setInstanceStatus('DISCONNECTED');
    }
  };

  return (
    <div className="min-h-screen pb-12 bg-[#0A0A0B] text-gray-300">
      <header className="bg-[#EE4D2D] sticky top-0 z-50 shadow-2xl border-b-4 border-orange-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl text-[#EE4D2D]">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg>
            </div>
            <h1 className="text-white text-xl font-black italic tracking-tighter uppercase">Shopee Auto-Bot</h1>
          </div>
          <nav className="flex gap-2">
            <button onClick={() => setActiveTab('explore')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'explore' ? 'bg-white text-black' : 'hover:bg-white/10'}`}>Explorar</button>
            <button onClick={() => setActiveTab('auto')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'auto' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-500/20' : 'hover:bg-white/10'}`}>ROBÔ</button>
            <button onClick={() => setActiveTab('panel')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'panel' ? 'bg-white text-black' : 'hover:bg-white/10'}`}>Conta</button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 mt-8">
        {activeTab === 'panel' ? (
          <AffiliatePanel config={affiliateConfig} onSave={updateAffiliateConfig} />
        ) : activeTab === 'auto' ? (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              
              <div className="bg-[#141417] p-8 rounded-[3rem] border border-gray-800 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-blue-400 font-black text-xs uppercase tracking-widest text-glow">Passo 1: Identificar Grupo</h4>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500">
                    Provedor: <span className="text-white">{affiliateConfig.apiProvider.toUpperCase()}</span>
                  </div>
                </div>

                <div className="bg-blue-600/5 p-6 rounded-3xl border border-blue-500/20 mb-8 space-y-6">
                  {/* OPÇÃO 1: LISTAR */}
                  <div>
                    <button 
                      onClick={fetchGroups}
                      disabled={isLoadingGroups}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl text-[10px] uppercase transition-all shadow-lg active:scale-95 mb-4"
                    >
                      {isLoadingGroups ? 'CARREGANDO LISTA...' : '🔍 LISTAR GRUPOS (AUTODETECT)'}
                    </button>
                  </div>

                  <div className="relative flex items-center gap-3">
                    <div className="flex-1 h-[1px] bg-gray-800"></div>
                    <span className="text-[9px] font-black text-gray-600 uppercase">OU</span>
                    <div className="flex-1 h-[1px] bg-gray-800"></div>
                  </div>

                  {/* OPÇÃO 2: RESOLVER LINK DE CONVITE */}
                  <div className="bg-black/40 p-5 rounded-2xl border border-gray-800">
                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-2">Descobrir ID pelo Link de Convite:</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="https://chat.whatsapp.com/..."
                        className="flex-1 bg-black border border-gray-700 rounded-xl px-4 py-3 text-xs text-white focus:border-blue-500 outline-none transition-all"
                        value={inviteLink}
                        onChange={e => setInviteLink(e.target.value)}
                      />
                      <button 
                        onClick={resolveJidFromInvite}
                        disabled={isResolvingInvite}
                        className="bg-white text-black font-black px-6 rounded-xl text-[9px] uppercase hover:bg-blue-600 hover:text-white transition-all disabled:opacity-30"
                      >
                        {isResolvingInvite ? 'RESOLVENDO...' : 'IDENTIFICAR'}
                      </button>
                    </div>
                  </div>

                  {hasSearched && availableGroups.length > 0 && (
                    <div className="bg-black/95 rounded-[2.5rem] p-6 border border-blue-500/40 shadow-2xl animate-fade-in">
                       <p className="text-[10px] font-black text-blue-400 uppercase tracking-[2px] mb-4">Selecione:</p>
                       <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto custom-scrollbar">
                          {availableGroups.map(group => (
                            <button 
                              key={group.id} 
                              onClick={() => updateAffiliateConfig({...affiliateConfig, webhookRecipient: group.id})}
                              className={`p-4 rounded-2xl border text-left flex justify-between items-center transition-all ${affiliateConfig.webhookRecipient === group.id ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-gray-800 text-gray-400 hover:bg-blue-500/5'}`}
                            >
                              <span className="font-bold text-xs">{group.name}</span>
                              <span className="text-[8px] opacity-40 font-mono">{group.id}</span>
                            </button>
                          ))}
                       </div>
                    </div>
                  )}

                  <div className="pt-4">
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 ml-2">ID Final do Grupo (JID):</label>
                    <input 
                      type="text" 
                      placeholder="120363... @g.us"
                      className={`w-full bg-black border ${affiliateConfig.webhookRecipient?.includes('@g.us') ? 'border-green-500 text-green-400' : 'border-gray-800 text-gray-600'} rounded-2xl px-6 py-4 text-xs font-mono transition-all`}
                      value={affiliateConfig.webhookRecipient || ''}
                      onChange={e => updateAffiliateConfig({...affiliateConfig, webhookRecipient: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#141417] p-8 rounded-[3rem] border border-gray-800 shadow-2xl flex flex-col items-center">
                <div className="grid grid-cols-2 gap-6 w-full mb-8">
                  <div className="bg-black/40 p-8 rounded-[2.5rem] border border-gray-800/50 text-center shadow-inner">
                    <span className="text-[9px] font-black text-gray-600 uppercase mb-3 block tracking-widest">Postar em</span>
                    <div className="text-6xl font-black text-white italic tracking-tighter">{countdown !== null ? formatCountdown(countdown) : '--:--'}</div>
                  </div>
                  <div className="bg-black/40 p-8 rounded-[2.5rem] border border-gray-800/50 text-center shadow-inner">
                    <span className="text-[9px] font-black text-gray-600 uppercase mb-3 block tracking-widest">Enviadas</span>
                    <div className="text-6xl font-black text-[#EE4D2D] italic tracking-tighter">{postedHistory.length}</div>
                  </div>
                </div>

                <div className="w-full px-8 mb-10">
                  <div className="flex justify-between mb-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    <span>INTERVALO: <span className="text-white">{automation.minInterval} minutos</span></span>
                  </div>
                  <input type="range" min="1" max="120" value={automation.minInterval} onChange={e => setAutomation(p => ({...p, minInterval: parseInt(e.target.value)}))} className="w-full h-2 bg-black rounded-lg accent-[#EE4D2D] appearance-none cursor-pointer" />
                </div>

                <button 
                  onClick={() => setAutomation(p => ({...p, isEnabled: !p.isEnabled}))}
                  disabled={!isApiReady}
                  className={`w-full py-8 rounded-[2.5rem] font-black text-2xl uppercase tracking-[6px] shadow-2xl transition-all active:scale-[0.98] ${automation.isEnabled ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white disabled:opacity-20'}`}
                >
                  {automation.isEnabled ? 'PARAR ROBÔ' : 'LIGAR ROBÔ'}
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 bg-black/80 rounded-[3rem] border border-gray-800 flex flex-col h-[850px] shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-800 text-[10px] font-black text-gray-500 uppercase flex justify-between items-center">
                <span>MONITORAMENTO</span>
                <button onClick={() => setLogs([])} className="text-red-500 text-[8px] hover:underline uppercase font-black">Limpar</button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3 font-mono text-[10px] custom-scrollbar">
                {logs.map((log, i) => (
                  <div key={i} className={`pb-2 border-b border-gray-900/20 break-words ${log.includes('✅') ? 'text-green-400' : log.includes('❌') ? 'text-red-400' : 'text-gray-400'}`}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <section className="bg-[#141417] p-6 rounded-[2.5rem] border border-gray-800 shadow-xl flex gap-3">
                <input type="text" placeholder="Cole link da Shopee..." className="flex-1 px-6 py-4 bg-black border border-gray-800 rounded-2xl outline-none text-white text-sm focus:border-orange-500 transition-all shadow-inner" value={manualUrl} onChange={e => setManualUrl(e.target.value)} />
                <button onClick={() => analyzeProductFromUrl(manualUrl).then(handleProductSelect)} className="bg-[#EE4D2D] text-white px-10 rounded-2xl font-black uppercase text-xs hover:bg-orange-500 transition-all active:scale-95 shadow-lg">Analisar</button>
              </section>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map(p => <ProductCard key={p.id} product={p} onSelect={handleProductSelect} isSelected={selectedProduct?.id === p.id} />)}
              </div>
            </div>
            <aside className="lg:col-span-4 lg:sticky lg:top-24 h-fit">
              <WhatsAppPreview 
                product={selectedProduct!} 
                dealContent={dealContent} 
                isGenerating={status === AppStatus.GENERATING_COPY} 
                isApiConfigured={isApiReady}
                onShare={() => selectedProduct && dealContent && shareToWhatsApp(selectedProduct, dealContent)} 
              />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
