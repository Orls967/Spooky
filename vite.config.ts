import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// GitHub Pages serves this project at https://<user>.github.io/Spooky/
export default defineConfig({
  base: '/Spooky/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  worker: { format: 'es' as const },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/ },
            { name: 'r3f', test: /node_modules[\\/](@react-three|its-fine|suspend-react)[\\/]/ },
            { name: 'katex', test: /node_modules[\\/]katex[\\/]/ },
            { name: 'gsap', test: /node_modules[\\/](gsap|@gsap)[\\/]/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/ },
          ],
        },
      },
    },
  },
});
