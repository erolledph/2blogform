// vite.config.js
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  // Enhanced build optimizations for Phase 4
  build: {
    outDir: "dist",
    // Aggressive code splitting for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "firebase-vendor": ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/storage"],
          "ui-vendor": ["lucide-react", "react-hot-toast"],
          "editor-vendor": ["react-simplemde-editor", "easymde"],
          "chart-vendor": ["recharts"],
          // Feature chunks
          "auth-features": [
            "./src/features/auth/LoginPage",
            "./src/features/auth/RegisterPage",
            "./src/features/auth/ForgotPasswordPage"
          ],
          "content-features": [
            "./src/features/dashboard/create-content/CreateContentPage",
            "./src/features/dashboard/manage-content/ManageContentPage"
          ],
          "product-features": [
            "./src/features/dashboard/create-product/CreateProductPage",
            "./src/features/dashboard/manage-products/ManageProductsPage"
          ],
          "admin-features": [
            "./src/features/dashboard/admin/UserManagementPage"
          ]
        },
        // Optimize chunk file names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split("/").pop() : "chunk";
          return `js/${facadeModuleId}-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split(".");
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
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info", "console.debug"],
        passes: 2
      },
      mangle: {},
      format: {
        comments: false
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1e3,
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
      "react",
      "react-dom",
      "react-router-dom",
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "firebase/storage",
      "lucide-react",
      "react-hot-toast"
    ],
    exclude: []
  },
  // Preview optimizations
  preview: {
    port: 4173,
    strictPort: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG4gICAgfSxcbiAgfSxcbiAgLy8gRW5oYW5jZWQgYnVpbGQgb3B0aW1pemF0aW9ucyBmb3IgUGhhc2UgNFxuICBidWlsZDoge1xuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIC8vIEFnZ3Jlc3NpdmUgY29kZSBzcGxpdHRpbmcgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICAvLyBWZW5kb3IgY2h1bmtzXG4gICAgICAgICAgJ3JlYWN0LXZlbmRvcic6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcbiAgICAgICAgICAnZmlyZWJhc2UtdmVuZG9yJzogWydmaXJlYmFzZS9hcHAnLCAnZmlyZWJhc2UvYXV0aCcsICdmaXJlYmFzZS9maXJlc3RvcmUnLCAnZmlyZWJhc2Uvc3RvcmFnZSddLFxuICAgICAgICAgICd1aS12ZW5kb3InOiBbJ2x1Y2lkZS1yZWFjdCcsICdyZWFjdC1ob3QtdG9hc3QnXSxcbiAgICAgICAgICAnZWRpdG9yLXZlbmRvcic6IFsncmVhY3Qtc2ltcGxlbWRlLWVkaXRvcicsICdlYXN5bWRlJ10sXG4gICAgICAgICAgJ2NoYXJ0LXZlbmRvcic6IFsncmVjaGFydHMnXSxcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBGZWF0dXJlIGNodW5rc1xuICAgICAgICAgICdhdXRoLWZlYXR1cmVzJzogW1xuICAgICAgICAgICAgJy4vc3JjL2ZlYXR1cmVzL2F1dGgvTG9naW5QYWdlJyxcbiAgICAgICAgICAgICcuL3NyYy9mZWF0dXJlcy9hdXRoL1JlZ2lzdGVyUGFnZScsXG4gICAgICAgICAgICAnLi9zcmMvZmVhdHVyZXMvYXV0aC9Gb3Jnb3RQYXNzd29yZFBhZ2UnXG4gICAgICAgICAgXSxcbiAgICAgICAgICAnY29udGVudC1mZWF0dXJlcyc6IFtcbiAgICAgICAgICAgICcuL3NyYy9mZWF0dXJlcy9kYXNoYm9hcmQvY3JlYXRlLWNvbnRlbnQvQ3JlYXRlQ29udGVudFBhZ2UnLFxuICAgICAgICAgICAgJy4vc3JjL2ZlYXR1cmVzL2Rhc2hib2FyZC9tYW5hZ2UtY29udGVudC9NYW5hZ2VDb250ZW50UGFnZSdcbiAgICAgICAgICBdLFxuICAgICAgICAgICdwcm9kdWN0LWZlYXR1cmVzJzogW1xuICAgICAgICAgICAgJy4vc3JjL2ZlYXR1cmVzL2Rhc2hib2FyZC9jcmVhdGUtcHJvZHVjdC9DcmVhdGVQcm9kdWN0UGFnZScsXG4gICAgICAgICAgICAnLi9zcmMvZmVhdHVyZXMvZGFzaGJvYXJkL21hbmFnZS1wcm9kdWN0cy9NYW5hZ2VQcm9kdWN0c1BhZ2UnXG4gICAgICAgICAgXSxcbiAgICAgICAgICAnYWRtaW4tZmVhdHVyZXMnOiBbXG4gICAgICAgICAgICAnLi9zcmMvZmVhdHVyZXMvZGFzaGJvYXJkL2FkbWluL1VzZXJNYW5hZ2VtZW50UGFnZSdcbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIC8vIE9wdGltaXplIGNodW5rIGZpbGUgbmFtZXNcbiAgICAgICAgY2h1bmtGaWxlTmFtZXM6IChjaHVua0luZm8pID0+IHtcbiAgICAgICAgICBjb25zdCBmYWNhZGVNb2R1bGVJZCA9IGNodW5rSW5mby5mYWNhZGVNb2R1bGVJZCA/IGNodW5rSW5mby5mYWNhZGVNb2R1bGVJZC5zcGxpdCgnLycpLnBvcCgpIDogJ2NodW5rJztcbiAgICAgICAgICByZXR1cm4gYGpzLyR7ZmFjYWRlTW9kdWxlSWR9LVtoYXNoXS5qc2A7XG4gICAgICAgIH0sXG4gICAgICAgIGFzc2V0RmlsZU5hbWVzOiAoYXNzZXRJbmZvKSA9PiB7XG4gICAgICAgICAgY29uc3QgaW5mbyA9IGFzc2V0SW5mby5uYW1lLnNwbGl0KCcuJyk7XG4gICAgICAgICAgY29uc3QgZXh0ID0gaW5mb1tpbmZvLmxlbmd0aCAtIDFdO1xuICAgICAgICAgIGlmICgvcG5nfGpwZT9nfHN2Z3xnaWZ8dGlmZnxibXB8aWNvL2kudGVzdChleHQpKSB7XG4gICAgICAgICAgICByZXR1cm4gYGltYWdlcy9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdYDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKC9jc3MvaS50ZXN0KGV4dCkpIHtcbiAgICAgICAgICAgIHJldHVybiBgY3NzL1tuYW1lXS1baGFzaF1bZXh0bmFtZV1gO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gYGFzc2V0cy9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdYDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgLy8gRW5oYW5jZWQgbWluaWZpY2F0aW9uXG4gICAgbWluaWZ5OiAndGVyc2VyJyxcbiAgICB0ZXJzZXJPcHRpb25zOiB7XG4gICAgICBjb21wcmVzczoge1xuICAgICAgICBkcm9wX2NvbnNvbGU6IHRydWUsXG4gICAgICAgIGRyb3BfZGVidWdnZXI6IHRydWUsXG4gICAgICAgIHB1cmVfZnVuY3M6IFsnY29uc29sZS5sb2cnLCAnY29uc29sZS5pbmZvJywgJ2NvbnNvbGUuZGVidWcnXSxcbiAgICAgICAgcGFzc2VzOiAyXG4gICAgICB9LFxuICAgICAgbWFuZ2xlOiB7XG4gICAgICB9LFxuICAgICAgZm9ybWF0OiB7XG4gICAgICAgIGNvbW1lbnRzOiBmYWxzZVxuICAgICAgfVxuICAgIH0sXG4gICAgLy8gT3B0aW1pemUgY2h1bmsgc2l6ZVxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCxcbiAgICAvLyBFbmFibGUgc291cmNlIG1hcHMgZm9yIHByb2R1Y3Rpb24gZGVidWdnaW5nXG4gICAgc291cmNlbWFwOiBmYWxzZSxcbiAgICAvLyBBc3NldCBpbmxpbmluZyB0aHJlc2hvbGRcbiAgICBhc3NldHNJbmxpbmVMaW1pdDogNDA5NlxuICB9LFxuICAvLyBEZXZlbG9wbWVudCBvcHRpbWl6YXRpb25zXG4gIHNlcnZlcjoge1xuICAgIGhtcjoge1xuICAgICAgb3ZlcmxheTogZmFsc2VcbiAgICB9XG4gIH0sXG4gIC8vIERlcGVuZGVuY3kgb3B0aW1pemF0aW9uXG4gIG9wdGltaXplRGVwczoge1xuICAgIGluY2x1ZGU6IFtcbiAgICAgICdyZWFjdCcsXG4gICAgICAncmVhY3QtZG9tJyxcbiAgICAgICdyZWFjdC1yb3V0ZXItZG9tJyxcbiAgICAgICdmaXJlYmFzZS9hcHAnLFxuICAgICAgJ2ZpcmViYXNlL2F1dGgnLFxuICAgICAgJ2ZpcmViYXNlL2ZpcmVzdG9yZScsXG4gICAgICAnZmlyZWJhc2Uvc3RvcmFnZScsXG4gICAgICAnbHVjaWRlLXJlYWN0JyxcbiAgICAgICdyZWFjdC1ob3QtdG9hc3QnXG4gICAgXSxcbiAgICBleGNsdWRlOiBbXVxuICB9LFxuICAvLyBQcmV2aWV3IG9wdGltaXphdGlvbnNcbiAgcHJldmlldzoge1xuICAgIHBvcnQ6IDQxNzMsXG4gICAgc3RyaWN0UG9ydDogdHJ1ZVxuICB9XG59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
