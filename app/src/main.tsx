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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
