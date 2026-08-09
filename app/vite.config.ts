/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base: a GitHub Pages URL https://pkormoczi.github.io/dental-plan/ alá épül,
// tehát minden asset-hivatkozásnak ez alól kell jönnie.
export default defineConfig({
  base: '/dental-plan/',
  plugins: [react()],
  server: {
    // A Kezdőlap changelog-blokkja a repo gyökerében lévő CHANGELOG.md-t
    // olvassa be `?raw` importtal (components/ChangelogCard.tsx) -- az az
    // `app/` mappán kívül van, enélkül a dev szerver/vitest elutasítaná.
    fs: { allow: ['..'] },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'http://localhost/' },
    },
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
