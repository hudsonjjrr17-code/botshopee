
import React from 'react';
import { AffiliateConfig, ApiProvider } from '../types';

interface AffiliatePanelProps {
  config: AffiliateConfig;
  onSave: (config: AffiliateConfig) => void;
}

export const AffiliatePanel: React.FC<AffiliatePanelProps> = ({ config, onSave }) => {
  const [formData, setFormData] = React.useState(config);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, active: true });
    alert("✅ Perfil atualizado com sucesso!");
  };

  const providers: {id: ApiProvider, name: string, color: string, desc: string}[] = [
    { id: 'z-api', name: 'Z-API', color: 'bg-blue-600', desc: 'Padrão Profissional' },
    { id: 'evolution', name: 'Evolution', color: 'bg-green-600', desc: 'Open Source / Barata' },
    { id: 'custom', name: 'Personalizado', color: 'bg-purple-600', desc: 'Sua própria URL' }
  ];

  const getUrlPlaceholder = () => {
    if (formData.apiProvider === 'z-api') return "https://api.z-api.io/instances/SUA_INSTANCIA/token/SEU_TOKEN/send-text";
    if (formData.apiProvider === 'evolution') return "https://sua-api.com/message/sendText/sua_instancia";
    return "URL completa do seu Webhook";
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-24">
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-[2.5rem] p-8 shadow-2xl text-white">
        <h2 className="text-3xl font-black italic tracking-tighter mb-2 uppercase">Configurações</h2>
        <p className="text-orange-100 text-[10px] font-black uppercase tracking-widest opacity-80">
          Gerencie suas chaves de comissão e integração WhatsApp
        </p>
      </div>

      <div className="bg-[#141417] p-10 rounded-[3rem] border border-gray-800 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-10">
          
          <section className="space-y-6">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-3">1. Identidade Afiliado</h4>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-2 ml-1">Shopee Affiliate ID (Opcional se usar links diretos)</label>
              <input 
                type="text" 
                className="w-full px-6 py-5 bg-black border border-gray-800 rounded-3xl focus:border-orange-500 outline-none transition-all text-white text-lg font-bold shadow-inner"
                value={formData.affiliateId}
                onChange={e => setFormData({...formData, affiliateId: e.target.value})}
                placeholder="Ex: 174829381"
              />
            </div>
          </section>

          <section className="space-y-6">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-3">2. Provedor de API</h4>
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
                  {formData.apiProvider === p.id && (
                    <div className="absolute top-2 right-2 text-orange-500">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-6 bg-black/40 p-8 rounded-[2.5rem] border border-gray-800/50">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">3. Credenciais da Instância</h4>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-2 ml-1">URL da API (Endpoint de envio)</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-black border border-gray-800 rounded-2xl focus:border-blue-500 outline-none transition-all text-white text-sm font-mono"
                  value={formData.webhookUrl || ''}
                  onChange={e => setFormData({...formData, webhookUrl: e.target.value})}
                  placeholder={getUrlPlaceholder()}
                />
                <p className="mt-2 text-[9px] text-gray-600 italic">
                  {formData.apiProvider === 'z-api' ? 'Cole a URL que termina em /send-text (ou /send-image para postar com fotos).' : 'A Evolution API usa endpoints como /message/sendText.'}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-2 ml-1">
                  {formData.apiProvider === 'evolution' ? 'API Key (apikey)' : 'Client Token'}
                </label>
                <input 
                  type="password" 
                  className="w-full px-6 py-4 bg-black border border-gray-800 rounded-2xl focus:border-blue-500 outline-none transition-all text-white text-sm font-mono"
                  value={formData.clientToken || ''}
                  onChange={e => setFormData({...formData, clientToken: e.target.value})}
                  placeholder="Seu token secreto..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-2 ml-1">ID do Grupo Padrão (JID) - Opcional aqui</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-black border border-gray-800 rounded-2xl focus:border-blue-500 outline-none transition-all text-white text-sm font-mono"
                  value={formData.webhookRecipient || ''}
                  onChange={e => setFormData({...formData, webhookRecipient: e.target.value})}
                  placeholder="120363... @g.us"
                />
                <p className="mt-2 text-[9px] text-gray-600 italic">Você também pode definir isso na aba ROBÔ usando o link de convite.</p>
              </div>
            </div>
          </section>

          <button type="submit" className="w-full bg-white hover:bg-[#EE4D2D] hover:text-white text-black font-black py-6 rounded-[2rem] transition-all shadow-xl uppercase tracking-widest text-sm active:scale-95">
            Salvar Configurações
          </button>
        </form>
      </div>
    </div>
  );
};
