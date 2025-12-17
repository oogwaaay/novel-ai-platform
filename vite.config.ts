import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'editor-vendor': ['react-quill', 'diff-match-patch'],
          'utils-vendor': ['idb', 'jspdf', 'jszip']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: process.env.NODE_ENV === 'production' ? false : true
  },
  server: {
    port: 3002,
    strictPort: true,
    // Proxy API requests to backend server
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 4173,
    strictPort: false
  },
  // SEO optimization
  meta: {
    title: 'Scribely - AI Novel Generator | Create Stories with AI',
    description: 'Generate complete novels with AI in minutes. Free AI novel generator for writers. Create novels about AI, fantasy, romance, mystery, and more.',
    keywords: 'scribely, ai novel generator, ai novel writer, novels about ai, ai story generator, ai book generator',
    image: 'https://scribelydesigns.top/brand1090.png',
    url: 'https://scribelydesigns.top'
  }
});
