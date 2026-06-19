import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/coupang/',
  build: { outDir: '/var/www/html/coupang', emptyOutDir: false },
  resolve: {
    alias: { '@shared': '/home/ubuntu/shared' },
    dedupe: ['react', 'react-dom'],
  },
})
