import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente baseadas no 'mode' (development/production)
  // O terceiro parâmetro '' permite carregar todas as variáveis, não apenas as com prefixo VITE_
  // Fix: Property 'cwd' does not exist on type 'Process'. Using type assertion for Node.js environment.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Mapeia process.env.API_KEY para ser substituído em tempo de compilação
      // Prioriza VITE_API_KEY (padrão Vite/Vercel) e depois API_KEY
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY || process.env.API_KEY || '')
    }
  };
});