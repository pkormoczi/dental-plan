/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base: a GitHub Pages URL https://pkormoczi.github.io/dental-plan/ alá épül,
// tehát minden asset-hivatkozásnak ez alól kell jönnie.
export default defineConfig({
  base: '/dental-plan/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
