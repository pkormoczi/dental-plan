/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Content-Security-Policy meta az index.html-be. A `connect-src 'self' data:`
// a „páciens- és kezelési adat nem hagyhatja el a gépet" szabály gépi alakja:
// egy később bekerülő analytics/telemetria/külső API hívás CSP-hibával
// bukik, nem csendben megy ki. Nem 'none', mert a @react-pdf a regisztrált
// fontot és a logót `fetch`-csel tölti be ugyanerről az originről, a yoga
// layout-motor pedig a saját WebAssembly-modulját egy `data:` URL-ből --
// egyik sem hálózati origin. A `'wasm-unsafe-eval'` ugyanezt a wasm-
// fordítást engedi, JS-`eval`-t nem. `frame-src blob:` a PDF-előnézet
// iframe-je miatt; dev-módban a script-src 'unsafe-inline'-t a
// @vitejs/plugin-react inline refresh-preamble-je kényszeríti ki -- a
// buildbe a szigorú variáns kerül.
function cspPlugin(): Plugin {
  let dev = false;
  return {
    name: 'dental-plan-csp',
    configResolved(config) {
      dev = config.command === 'serve';
    },
    transformIndexHtml() {
      const scriptSrc = dev ? "'self' 'wasm-unsafe-eval' 'unsafe-inline'" : "'self' 'wasm-unsafe-eval'";
      const content = [
        "default-src 'self'",
        `script-src ${scriptSrc}`,
        "connect-src 'self' data:",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "style-src 'self' 'unsafe-inline'",
        "frame-src blob:",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
      ].join('; ');
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

// https://vite.dev/config/
// base: a GitHub Pages URL https://pkormoczi.github.io/dental-plan/ alá épül,
// tehát minden asset-hivatkozásnak ez alól kell jönnie.
export default defineConfig({
  base: '/dental-plan/',
  plugins: [react(), cspPlugin()],
  server: {
    // A Kezdőlap két kártyája a repo docs/ mappájában lévő CHANGELOG.md-t és
    // FEATURES.md-t olvassa be `?raw` importtal (components/ChangelogCard.tsx,
    // components/FeatureOverviewCard.tsx) -- ezek az `app/` mappán kívül
    // vannak, enélkül a dev szerver/vitest elutasítaná.
    fs: { allow: ['..'] },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'http://localhost/' },
    },
    globals: true,
    setupFiles: './src/test-setup.ts',
    // Vitest alapértelmezett 5000ms-je néhány `userEvent.type`-tal sok
    // karaktert begépelő tesztnél (pl. PriceListAdminPage kategória-
    // átnevezés) a GitHub Actions runneren már szűken elfér -- lokálisan
    // ~1.6s, CI-n mért 5131ms, tehát a timeout-on buktak el, nem a teszt
    // logikáján.
    testTimeout: 15000,
  },
})
