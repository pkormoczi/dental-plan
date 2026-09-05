# app/src — felület-rendszer
Kötelező, nem javaslat; ütközésnél kérdezz.

## Mi ez
Egy fogorvos órákig használt belső eszköze: sűrű, billentyűzet-központú adattábla. Nem marketing oldal.

## Két felület, két szabály
- Nyomtatvány (`pdf/`): a PÁCIENS látja — drmandoki.hu-arculat, meleg; a PDF-token-blokkba nem kerül
  slate. → symbol:app/src/design/tokens.ts#toothInactive
- App: a doki látja — hideg slate, a márka csak akcentus; a háttér SOHA nem meleg krém/bézs.
- `accent` soha nem szövegszín (2,82:1). → symbol:app/src/design/tokens.ts#accent
- `controlBorder` minden interaktív kontroll kerete (3:1), nem `uiLine`; kivétel: `solid` Button,
  `IconButton`, `ghost` Button. → symbol:app/src/design/tokens.ts#controlBorder
- Radix Themes az egyetlen UI-lib; ikon csak `@radix-ui/react-icons`, kézi SVG nem. Kivétel a „Becsült
  ár” `≈` szövegglyph (a csillag a „gyakori” csillaggal keverhető).

## Amit soha
- Adattáblából carousel/kártyarács/scroll-snap; animáció visszajelzés nélkül; generált kép.
- A tételfelvitel ciklusát eltörni (gépel → ↑↓ → Enter → kereső ürül, fókusz marad) — ez az Excel
  elleni fő előny. → symbol:app/src/pages/planEditor/ItemPicker.tsx#onPickEgyedi
- Kérdés nélkül nyúlni: nyomtatvány-elrendezés, sémák/`schemaVersion`, mappastruktúra, tétel-`id`-k.

## Akadálymentesség (nem opcionális)
- WCAG AA; címke az input FÖLÖTT, hiba ALATTA; látható fókuszgyűrű, `outline: none` tilos; Escape zár;
  a fogtérkép EGY Tab-megálló. `prefers-reduced-motion` → symbol:app/src/design/motion.ts#csokkentettMozgas

## jsdom-vakfoltok → /manual-checks (kézzel, izolált Chrome)
Nincs Radix CSS/Roboto (kontraszt, `controlBorder`, fókuszgyűrű lefedettsége nulla); `paint-order` nincs;
`ResizeObserver`/pointer capture stub; canvas hiányzik (fogtérkép-PNG `null`); `matchMedia` nincs;
`usePDF` fájlonként mockolt. → file:app/src/test-setup.ts

## Find before writing (UI)
- Piszkozat tulajdonosa → symbol:app/src/state/AppState.tsx#useAppState
- Három KÜLÖN guard, ne építsd egymásra → symbol:app/src/components/NavGuardContext.tsx#useNavGuard;
  symbol:app/src/components/LepesGuardContext.tsx#useLepesGuard; symbol:app/src/components/NyelviReviewContext.tsx#useNyelviReview
- Elvetés-megerősítés → symbol:app/src/components/DiscardChangesDialog.tsx#useDiscardGuard
- Verzió-akciók piszkozat-őrrel → symbol:app/src/components/PlanVersionActionDialog.tsx#usePlanVersionActions
- Páciens-kötés → symbol:app/src/components/PaciensKotesContext.tsx#usePaciensKotes
