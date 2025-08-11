import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Enhanced build optimizations for Phase 4
  build: {
    outDir: 'dist',
    // Aggressive code splitting for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'ui-vendor': ['lucide-react', 'react-hot-toast'],
          'editor-vendor': ['react-simplemde-editor', 'easymde'],
          'chart-vendor': ['recharts'],
          
          // Feature chunks
          'auth-features': [
            './src/features/auth/LoginPage',
            './src/features/auth/RegisterPage',
            './src/features/auth/ForgotPasswordPage'
          ],
          'content-features': [
            './src/features/dashboard/create-content/CreateContentPage',
            './src/features/dashboard/manage-content/ManageContentPage'
          ],
          'product-features': [
            './src/features/dashboard/create-product/CreateProductPage',
            './src/features/dashboard/manage-products/ManageProductsPage'
          ],
          'admin-features': [
            './src/features/dashboard/admin/UserManagementPage'
          ]
        },
        // Optimize chunk file names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      }
    },
    // Enhanced minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2
      },
      mangle: {
      },
      format: {
        comments: false
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging
    sourcemap: false,
    // Asset inlining threshold
    assetsInlineLimit: 4096
  },
  // Development optimizations
  server: {
    hmr: {
      overlay: false
    }
  },
  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/storage',
      'lucide-react',
      'react-hot-toast'
    ],
    exclude: []
  },
  // Preview optimizations
  preview: {
    port: 4173,
    strictPort: true
  }
})