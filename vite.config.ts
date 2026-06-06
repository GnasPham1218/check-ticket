import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

function backendProxy() {
  return {
    target: 'http://localhost:4000',
    changeOrigin: true,
    configure(proxy) {
      proxy.on('error', (_error, _request, response) => {
        if (!response || response.headersSent) return;
        response.writeHead(503, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: 'Backend is restarting. Please retry shortly.' }));
      });
    },
  };
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': backendProxy(),
      '/sample-data': backendProxy(),
    },
  },
});
