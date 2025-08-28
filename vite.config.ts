import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  optimizeDeps: {
    include: [
      'lucide-react',
      'framer-motion',
      'react',
      'react-dom',
    ],
  },
  
  server: {
    port: 5173,
    host: true,
    open: true,
    strictPort: true, // Запрещаем автоматический поиск свободного порта
    proxy: {
      '/api': {
        target: 'http://localhost:3010',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
      '/media': {
        target: 'http://localhost:3010',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react', 'framer-motion'],
        },
      },
    },
  },
  
  preview: {
    port: 4173,
    host: true,
  },
})
