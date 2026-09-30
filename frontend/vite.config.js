import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:single` bundles everything into one HTML file (handy for sharing a preview).
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  server: {
    port: 5173,
    // Forward /api calls to the Spring Boot backend during development.
    proxy: { '/api': 'http://localhost:8080' },
  },
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist' },
}));
