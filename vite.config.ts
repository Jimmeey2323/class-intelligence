import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Enable minification with terser for better compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Split vendor chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom'],
          // Charts - heavy library
          'vendor-charts': ['recharts'],
          // Animation library
          'vendor-animation': ['framer-motion'],
          // Table and virtualization
          'vendor-table': ['@tanstack/react-table', '@tanstack/react-virtual'],
          // Date utilities
          'vendor-date': ['date-fns', 'react-datepicker'],
          // Spreadsheet handling - very heavy
          'vendor-xlsx': ['xlsx'],
          // State management
          'vendor-state': ['zustand'],
          // PDF generation - load on demand
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
        },
      },
    },
    // Enable source maps for production debugging
    sourcemap: false,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'date-fns'],
    exclude: ['xlsx', 'jspdf'], // These should be dynamically imported
  },
})
