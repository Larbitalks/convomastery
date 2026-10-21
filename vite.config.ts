import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// "demo" mode builds a self-contained preview with relative asset paths.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'demo' ? './' : '/',
}))
