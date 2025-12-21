import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000, // Increase chunk size warning limit to 1000kb
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries into separate chunks
          vendor: ['@supabase/supabase-js'],
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
})