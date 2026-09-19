import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { nitro } from 'nitro/vite'

export default defineConfig({
  plugins: [tsconfigPaths(), tailwindcss(), tanstackStart(), nitro({
    preset: 'vercel',
    traceDeps: ['@napi-rs/canvas*'],
    rollupConfig: { external: [/^@napi-rs\/canvas(?:\/|$)/] },
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
