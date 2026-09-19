import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = process.env.VERCEL === '1';
const isSingleFile = process.env.SINGLE_FILE === '1' && !isVercel;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), isSingleFile ? viteSingleFile() : null].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: !isVercel,
    rollupOptions: isVercel ? {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', '@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
          charts: ['recharts'],
          pdf: ['jspdf', 'jspdf-autotable'],
          utils: ['xlsx', 'lucide-react'],
        },
      },
    } : undefined,
  },
});
