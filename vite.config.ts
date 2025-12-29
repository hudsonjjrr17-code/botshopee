
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Injeta as variáveis de ambiente para que process.env.API_KEY funcione no navegador
    'process.env': process.env
  }
});
