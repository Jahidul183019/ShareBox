import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Default to Vercel-friendly dist output. Use "vite build --mode backend"
  // when you want to embed the built SPA into backend/static.
  const outDir = mode === 'backend'
    ? path.resolve(__dirname, '../backend/static')
    : 'dist';

  return {
    plugins: [react()],
    build: {
      outDir,
      emptyOutDir: true,
    },
    server: {
      port: 5173,
      proxy: {
        // In dev mode (`npm run dev`), proxy API and WS calls to the backend
        '/api': 'http://localhost:8000',
        '/uploads': 'http://localhost:8000',
        '/ws': {
          target: 'ws://localhost:8000',
          ws: true,
        },
      },
    },
  };
});
