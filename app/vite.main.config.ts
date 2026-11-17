import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

// A main process bundlerrel épül, nem tsc-emittel: így közvetlenül importálhatja a renderer
// DOM-mentes megosztott moduljait (storage, domain), amik kiterjesztés nélkül importálnak
// (migrációs terv §9.1).
export default defineConfig({
  build: {
    ssr: 'electron/main.ts',
    outDir: 'dist-electron/main',
    emptyOutDir: true,
    target: 'node22',
    minify: false,
    copyPublicDir: false,
    rolldownOptions: {
      external: ['electron', ...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
      output: { format: 'es', entryFileNames: 'main.js' },
    },
  },
  ssr: { noExternal: true },
});
