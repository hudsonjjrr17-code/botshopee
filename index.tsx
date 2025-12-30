import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Garante que o objeto process.env exista para compatibilidade com bibliotecas legadas
// Note: process.env.API_KEY será substituído pelo Vite durante o build
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || { env: {} };
  (window as any).process.env = (window as any).process.env || {};
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);