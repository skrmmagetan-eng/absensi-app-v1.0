import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 2000, // Increase chunk size warning limit to 2000kb (2MB)
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries into separate chunks
          vendor: ['@supabase/supabase-js'],
          // Split UI components
          components: ['./src/components/navigation.js'],
          // Split utilities
          utils: ['./src/utils/helpers.js']
        }
      }
    },
    // Additional optimizations
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
})