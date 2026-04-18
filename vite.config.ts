import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],

  build: {
    // esbuild es más rápido que terser y viene incluido en Vite
    minify: 'esbuild' as const,
    target: 'es2018', // compatibilidad amplia sin transpilar innecesariamente

    rollupOptions: {
      output: {
        // Chunk manual: React y ReactDOM en su propio archivo (se cachea por separado)
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },

    // Alerta si algún chunk supera 300 KiB (previene regresiones futuras)
    chunkSizeWarningLimit: 300,
  },
})
