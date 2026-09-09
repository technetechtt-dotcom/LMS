import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { buildVersionPlugin } from './build-version-plugin'

/** Standalone Ops Console — port 5177, separate from the LMS user platform. */
export default defineConfig({
  root: path.resolve(__dirname, 'ops-portal'),
  envDir: path.resolve(__dirname),
  publicDir: path.resolve(__dirname, 'public'),
  plugins: [react(), buildVersionPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5177,
    strictPort: true,
    hmr: {
      clientPort: 5177,
    },
    fs: {
      allow: [path.resolve(__dirname)],
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist-ops'),
    emptyOutDir: true,
  },
})
