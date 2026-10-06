import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { buildVersionPlugin } from './build-version-plugin'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), buildVersionPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('pdfkit')) {
            return 'pdf-vendor';
          }
          if (id.includes('chart.js') || id.includes('react-chartjs-2') || id.includes('recharts')) {
            return 'charts-vendor';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 5176,
    strictPort: true,
    hmr: {
      clientPort: 5176,
    },
  },
})
