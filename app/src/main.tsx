import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/600.css'
import '@radix-ui/themes/styles.css'
import './index.css'
import App from './App.tsx'
import { t } from './design/tokens'

// index.css hivatkozik erre a Radix-komponensek keretének felülírásához --
// itt íródik be `tokens.ts`-ből, hogy a controlBorder értékének EGY forrása
// maradjon (a CSS fájl nem tud TS-konstansból importálni).
document.documentElement.style.setProperty('--control-border', t.controlBorder)

// Ugyanez a minta a `solid` variáns kitöltésére: a Radix `brown` accentjének
// step-9-e (#ad7f58) fehér felirattal 3,53:1 -- index.css erre a három
// változóra irányítja át. A hover külön token, hogy a gomb hoverre sötétedjen.
document.documentElement.style.setProperty('--solid-fill', t.ink)
document.documentElement.style.setProperty('--solid-fill-hover', t.text)
document.documentElement.style.setProperty('--solid-fill-text', t.onBrand)

// Pácienslista sor-hover/fókusz háttere (index.css) -- ugyanaz a minta,
// hogy az accentWash-nak EGY forrása maradjon.
document.documentElement.style.setProperty('--accent-wash', t.accentWash)

// Ugyanez a minta a Radix amber/red/green `--accent-a11` szövegszínére (Callout,
// soft Badge/Button, accent-colorral festett Text): a Calloutba ágyazott jelvény
// kettős `accent-a3` washán a Radix saját aliasa 4,5:1 alá bukik -- index.css
// erre a három változóra irányítja át.
document.documentElement.style.setProperty('--warn-accent-text', t.warn)
document.documentElement.style.setProperty('--danger-accent-text', t.danger)
document.documentElement.style.setProperty('--ok-accent-text', t.ok)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
