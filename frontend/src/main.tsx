import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import 'maplibre-gl/dist/maplibre-gl.css'

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #000; color: #fff; font-family: sans-serif;">
      <div style="text-align: center; padding: 2rem;">
        <h1 style="color: #ef4444; margin-bottom: 1rem;">Application Error</h1>
        <p style="margin-bottom: 1rem;">${error instanceof Error ? error.message : 'Unknown error'}</p>
        <p style="color: #9ca3af; font-size: 0.875rem;">Please check the browser console for more details.</p>
      </div>
    </div>
  `;
}

