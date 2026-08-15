import { defineConfig } from 'vite';

// Dev-only proxy: forward same-origin API/RPC calls to the legacy Python backend
// (python server.py on 0.0.0.0:4173) so the modular app talks to the real server.
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Allow the dynamic sandbox preview host (the sandbox id changes per session).
    allowedHosts: true,
    proxy: {
      '/api': 'http://127.0.0.1:4173',
      '/rpc': 'http://127.0.0.1:4173',
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
});
