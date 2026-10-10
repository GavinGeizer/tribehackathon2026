import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
export default defineConfig({
  root: 'frontend',
  plugins: [react(), cloudflare()],
  server: { host: '127.0.0.1', port: 5173 },
  build: { outDir: '../dist/client', emptyOutDir: true },
});
