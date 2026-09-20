import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { nitro } from 'nitro/vite'

export default defineConfig({
  plugins: [tsconfigPaths(), tailwindcss(), tanstackStart(), nitro({
    preset: 'vercel',
    // PDF.js loads its worker dynamically and Tesseract starts a worker thread
    // which in turn loads its WASM core. Dependency tracers cannot discover
    // those files from the static import graph, so copy the complete packages.
    traceDeps: ['@napi-rs/canvas*', 'pdfjs-dist*', 'tesseract.js*', 'tesseract.js-core*'],
    rollupConfig: { external: [/^@napi-rs\/canvas(?:\/|$)/, /^tesseract\.js(?:\/|$)/] },
    // Keep OCR independent of outbound network access in the deployed function.
    serverAssets: [{ baseName: 'ocr', dir: '.', pattern: 'eng.traineddata' }],
    vercel: {
      // TanStack Start is emitted as one catch-all function, so this must be
      // applied to the base function rather than a per-route function rule.
      functions: { maxDuration: 60 },
    },
  }), react()],
  optimizeDeps: {
    exclude: [
      '@napi-rs/canvas',
      '@napi-rs/canvas-win32-x64-msvc',
      'pdfjs-dist',
      'tesseract.js',
    ],
  },
  ssr: {
    external: [
      '@napi-rs/canvas',
      '@napi-rs/canvas-win32-x64-msvc',
    ],
  },
})
