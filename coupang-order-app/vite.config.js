import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/coupang/order/',
  build: { outDir: '/var/www/html/coupang/order', emptyOutDir: false },
  resolve: {
    alias: { '@shared': '/home/ubuntu/shared' },
    dedupe: ['react', 'react-dom'],
  },
})
