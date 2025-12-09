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
    port: 3000,
    strictPort: false,
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
  }
});
