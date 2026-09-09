import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { buildVersionPlugin } from './build-version-plugin'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), buildVersionPlugin()],
  server: {
    port: 5176,
    strictPort: true,
    hmr: {
      clientPort: 5176,
    },
  },
})
