import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' — чтобы сборка работала и на GitHub Pages в подкаталоге, и на любом хостинге
export default defineConfig({
  base: './',
  plugins: [react()],
})
