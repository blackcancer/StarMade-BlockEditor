/**
 * @fileoverview Vite build configuration — StarMade Block Editor client.
 *
 * ## Dev mode
 * - Runs on port 5174 with HMR.
 * - Proxies `/api/*` to the Express server on port 3847.
 *
 * ## Production build
 * - Outputs to `client/dist/` (served as static files by the Express server).
 * - Manual chunk splitting keeps the initial JS bundle small:
 *     vendor-three  → Three.js core          (~600 kB raw)
 *     vendor-r3f    → react-three-fiber/drei  (~200 kB raw)
 *     vendor-react  → React + ReactDOM        (~150 kB raw)
 *     index         → Application code        (small)
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },

  build: {
    // Output to dist/ (default); the Express server serves this in production.
    outDir: 'dist',

    // Suppress warning for large 3D vendor chunks — these are expected given
    // the Three.js + R3F dependency set.
    chunkSizeWarningLimit: 700,

    rollupOptions: {
      output: {
        /**
         * Manual chunk splitting strategy:
         *
         *  vendor-three  — Three.js core geometry/math/loaders
         *  vendor-r3f    — @react-three/fiber + @react-three/drei
         *  vendor-react  — React + ReactDOM
         *  vendor-zustand— Zustand state library
         *
         * Benefits:
         *  • Each vendor chunk is cached separately by the browser.
         *  • Updating app code does not bust the large Three.js cache entry.
         *  • Parallel HTTP/2 download of smaller chunks vs one monolithic bundle.
         */
        manualChunks(id: string) {
          // Three.js core — largest single dependency
          if (id.includes('node_modules/three/')) {
            return 'vendor-three';
          }
          // react-three-fiber and drei (R3F ecosystem)
          if (
            id.includes('node_modules/@react-three/fiber') ||
            id.includes('node_modules/@react-three/drei')
          ) {
            return 'vendor-r3f';
          }
          // React core
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/')
          ) {
            return 'vendor-react';
          }
          // Zustand state management
          if (id.includes('node_modules/zustand/')) {
            return 'vendor-zustand';
          }
          // All other node_modules go into a shared vendor chunk
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
        },
      },
    },
  },

  server: {
    port: 5174,
    proxy: {
      // Forward all /api/* requests to the Express backend during development.
      '/api': {
        target: 'http://localhost:3847',
        changeOrigin: true,
      },
    },
  },
});
