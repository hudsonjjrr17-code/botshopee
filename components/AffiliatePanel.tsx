
import React, { useState } from 'react';
import { AffiliateConfig, ApiProvider } from '../types';

interface AffiliatePanelProps {
  config: AffiliateConfig;
  onSave: (config: AffiliateConfig) => void;
}

export const AffiliatePanel: React.FC<AffiliatePanelProps> = ({ config, onSave }) => {
  const [formData, setFormData] = React.useState(config);
  const [isTesting, setIsTesting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, active: true });
    alert("✅ Configurações salvas localmente!");
  };

  const testConnection = async () => {
    if (!formData.webhookUrl) return alert("Insira a URL primeiro.");
    setIsTesting(true);
    
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (formData.clientToken) {
        const key = formData.apiProvider === 'evolution' ? 'apikey' : 'client-token';
        headers[key] = formData.clientToken;
      }

      // Tenta um endpoint de status simples
      let testUrl = formData.webhookUrl.replace(/\/(send-text|send-image)$/, '');
      if (formData.apiProvider === 'z-api') {
        testUrl = testUrl + '/status';
      } else if (formData.apiProvider === 'evolution') {
        const base = formData.webhookUrl.split('/message')[0];
        testUrl = base + '/instance/connectionState';
      }

      const res = await fetch(testUrl, { headers });
      if (res.ok) {
        alert("✅ Conexão estabelecida com sucesso! Sua API está respondendo.");
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`❌ Erro ${res.status}: ${errData.message || 'Verifique seus tokens e se o IP da Vercel está liberado no painel da sua API.'}`);
      }
    } catch (e) {
      alert("❌ Falha na rede. Verifique se a URL está correta ou se a API permite conexões externas (CORS).");
    } finally {
      setIsTesting(false);
    }
  };

  const providers: {id: ApiProvider, name: string, color: string, desc: string}[] = [
    { id: 'z-api', name: 'Z-API', color: 'bg-blue-600', desc: 'Padrão Profissional' },
    { id: 'evolution', name: 'Evolution', color: 'bg-green-600', desc: 'Open Source / Barata' },
    { id: 'custom', name: 'Personalizado', color: 'bg-purple-600', desc: 'Sua própria URL' }
  ];

  const getUrlHelpText = () => {
    if (formData.apiProvider === 'z-api') return "Ex: https://api.z-api.io/instances/ID/token/TOKEN/send-text";
    if (formData.apiProvider === 'evolution') return "Ex: https://sua-api.com/message/sendText/instancia";
    return "Sua URL de Webhook customizada";
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-24">
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-[2.5rem] p-8 shadow-2xl text-white">
        <h2 className="text-3xl font-black italic tracking-tighter mb-2 uppercase">Configurações</h2>
        <p className="text-orange-100 text-[10px] font-black uppercase tracking-widest opacity-80">
          Gerencie seu robô e integração WhatsApp
        </p>
      </div>

      <div className="bg-[#141417] p-10 rounded-[3rem] border border-gray-800 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-10">
          
          <section className="space-y-6">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-3">1. Perfil Afiliado</h4>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-2 ml-1">Seu ID de Afiliado Shopee</label>
              <input 
                type="text" 
                className="w-full px-6 py-5 bg-black border border-gray-800 rounded-3xl focus:border-orange-500 outline-none transition-all text-white text-lg font-bold shadow-inner"
                value={formData.affiliateId}
                onChange={e => setFormData({...formData, affiliateId: e.target.value})}
                placeholder="Ex: 123456789"
              />
              <p className="mt-2 text-[9px] text-gray-600 italic">Usado para transformar links comuns em links de comissão automaticamente.</p>
            </div>
          </section>

          <section className="space-y-6">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-3">2. Escolha sua API</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {providers.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFormData({...formData, apiProvider: p.id})}
                  className={`p-5 rounded-3xl border-2 transition-all text-left flex flex-col gap-1 relative overflow-hidden ${formData.apiProvider === p.id ? 'border-orange-500 bg-orange-500/5' : 'border-gray-800 hover:border-gray-700 bg-black'}`}
                >
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full w-fit text-white mb-2 ${p.color}`}>{p.name}</span>
                  <span className="text-white font-black text-xs uppercase">{p.desc}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-6 bg-black/40 p-8 rounded-[2.5rem] border border-gray-800/50">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">3. Dados da Conexão</h4>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-2 ml-1">URL da Instância (Send Text)</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-black border border-gray-800 rounded-2xl focus:border-blue-500 outline-none transition-all text-white text-sm font-mono"
                  value={formData.webhookUrl || ''}
                  onChange={e => setFormData({...formData, webhookUrl: e.target.value})}
                  placeholder={getUrlHelpText()}
                />
                <p className="mt-2 text-[9px] text-gray-400/60 italic">O robô tentará detectar a lista de grupos a partir desta URL.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-2 ml-1">Token de Acesso (Client Token / API Key)</label>
                <input 
                  type="password" 
                  className="w-full px-6 py-4 bg-black border border-gray-800 rounded-2xl focus:border-blue-500 outline-none transition-all text-white text-sm font-mono"
                  value={formData.clientToken || ''}
                  onChange={e => setFormData({...formData, clientToken: e.target.value})}
                  placeholder="Seu token secreto..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={testConnection}
                  disabled={isTesting}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-black py-4 rounded-2xl text-[10px] uppercase transition-all disabled:opacity-50"
                >
                  {isTesting ? 'TESTANDO...' : '🧪 TESTAR CONEXÃO AGORA'}
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-white hover:bg-orange-600 hover:text-white text-black font-black py-4 rounded-2xl transition-all uppercase text-[10px]"
                >
                  Salvar Tudo
                </button>
              </div>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
};
