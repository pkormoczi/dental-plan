import { defineConfig } from 'vite';

// A sandboxolt preload nem lehet ES-modul: egyetlen CommonJS-fájl, csak az `electron` kívül.
export default defineConfig({
  build: {
    ssr: 'electron/preload.ts',
    outDir: 'dist-electron/preload',
    emptyOutDir: true,
    target: 'node22',
    minify: false,
    copyPublicDir: false,
    rolldownOptions: {
      external: ['electron'],
      output: { format: 'cjs', entryFileNames: 'preload.cjs' },
    },
  },
  ssr: { noExternal: true },
});
