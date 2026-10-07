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
          if (id.includes('node_modules')) {
            if (id.includes('jspdf')) {
              return 'jspdf-vendor';
            }
            if (id.includes('pdf-lib') || id.includes('pdfkit') || id.includes('fflate')) {
              return 'pdflib-vendor';
            }
            if (id.includes('html2canvas')) {
              return 'html2canvas-vendor';
            }
            if (id.includes('chart.js') || id.includes('react-chartjs-2') || id.includes('recharts') || id.includes('d3-')) {
              return 'charts-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
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
