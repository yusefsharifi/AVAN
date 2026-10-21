import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SECURITY FIX (CONFIG-002): Frontend now has backend API URL configuration.
// In development, requests to /api/v1/* are proxied to the backend.
// In production, set VITE_API_URL to the backend URL.
const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

// SECURITY FIX (QUAL-002): Removed viteSingleFile for production builds.
// Production uses Nginx with proper static file serving and gzip compression.
// viteSingleFile bundles everything into one HTML file which is unsuitable for
// enterprise production (no caching, no code splitting, huge file size).

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Production build optimizations
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          charts: ['recharts'],
          forms: ['react-hook-form', 'zod', '@hookform/resolvers'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  // SECURITY FIX (CONFIG-002): Proxy /api requests to backend in development
  server: {
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
