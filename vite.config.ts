import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Résout l'alias @/ pour pointer vers le dossier src/ de manière robuste
      '@': path.resolve(process.cwd(), './src'),
    },
  },
})