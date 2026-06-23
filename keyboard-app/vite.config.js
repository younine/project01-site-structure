import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/keyboard/',
  build: { outDir: 'dist', emptyOutDir: false },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  resolve: {
    alias: { '@shared': '/home/ubuntu/shared' },
    dedupe: ['react', 'react-dom'],
  },
})
