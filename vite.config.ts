import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 3000, // Increased limit to avoid warnings for vendor chunks
    emptyOutDir: true,
    rollupOptions: {
        output: {
            manualChunks: undefined
        }
    }
  },
  base: '/'
})