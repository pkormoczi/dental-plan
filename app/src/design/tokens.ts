// Design tokenek -- a marka a klinika nyilvanos honlapjarol (drmandoki.hu)
// szarmazik (2026-08-08-i ellenorzes: #976445 18x, #f77409 14x az elo oldal
// nyers HTML-jeben -- ez a ket ertek stimmel). A logo PNG-t is ehhez a
// palettahoz szineztuk at.
//
// KETFELE FELULET, KETFELE SZABALY (lasd app/src/CLAUDE.md):
//  - A PDF/nyomtatvany (pdf/*.tsx) a márkát koveti -- meleg, a
//    drmandoki.hu-val egyezo paletta. Ezt a fajlt a PDF importalja, ide
//    NE kerüljön semmi hideg/slate ertek a `brand`/`accent`/`ink`/`text`/
//    `line`/`lineStrong`/`textMuted`/`textFaint`/`toothInactive` alol --
//    ezeket a pdf/ hasznalja valtozatlanul, a nyomtatvanyhoz nem nyulunk.
//  - Az APP felulete (components/, pages/) viszont semleges, hideg slate:
//    ehhez valo a lenti `ui*`/`controlBorder`
//    keszlet, ami KULON all a nyomtatvany fenti tokenjeitol, es csak az
//    app kepernyoin hasznalando.
//
// Harom szabaly:
//  - `accent` (#f77409) SOHA nem lehet szovegszin -- feheren 2.82:1. Csak
//    diszitovonal es a fogterkep kiemelese. (A korabbi #7EC7EF szabalyanak
//    utodja.)
//  - `brand` (#976445) feheren 4.97:1 -- alig a WCAG AA kuszob (4.5) folott.
//    Szines hatteren ujra kell szamolni: `accentWash` felett 4.58:1, ennel
//    sotetebb/telitettebb hatteren mar bukhat.
//  - `controlBorder` (nem `uiLine`/`uiLineStrong`!) kell minden interaktiv
//    kontroll (input, gomb, chip, dropdown) kerete -- a hajszalvonal
//    (`uiLine`) tul halvany a WCAG 1.4.11 3:1-hez, csak diszito
//    sorelvalasztora valo. A keret `inset` box-shadow (index.css), tehat KET
//    szomszedja van: kivul a szulofelulet, belul a kontroll sajat kitoltese
//    (pl. egy `soft` gomb `accent-a3`/`a4`/`a5` washe) -- ez utobbi a
//    szigorubb mertek, mert sotetebb, mint a lap hattere (K4).
//
// A tokennevek szandekosan szerepalapuak, nem szinnevek -- a korabbi
// navy/sky nevek egy rebrandnel hazugsagga valtak volna.

export const t = {
  // Marka -- drmandoki.hu
  brand: '#976445', // cimsorok, vonalak -- 4.97:1 feheren
  accent: '#f77409', // CSAK diszites -- 2.82:1 feheren
  accentWash: '#FEF4EB', // kivalasztott/aktiv allapot hattere (app), csak app-on hasznalt
  ink: '#2D2D2D', // primary gomb hattere (a honlap gombszine) -- 13.77:1
  onBrand: '#FFFFFF', // szoveg ink/brand hatteren

  // Feluletek -- csak app, PDF nem hasznalja
  page: '#F1F5F9', // slate-100
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC', // slate-50

  // Szoveg -- `text` mindket felulet hasznalja (mar eleg semleges: 17.4:1)
  text: '#1A1A1A',

  // --- PDF/PrintPreview tokenjei: NE valtoztasd, a pdf/*.tsx importalja ---
  textMuted: '#5C5651',
  textFaint: '#8C8580',
  line: '#E7E2DD',
  lineStrong: '#D3CBC3',
  toothInactive: '#EFECE8',
  // --- PDF tokenek vege ---

  // App UI (semleges, hideg slate) -- a fenti négy PDF-tokennek EBBEN a
  // szerepben ez a megfeleloje, csak components/ es pages/ hasznalja
  uiTextMuted: '#475569', // slate-600 -- 7.58:1 feheren
  uiTextFaint: '#64748B', // slate-500 -- 4.76:1 feheren (a regi #8C8580 3.63:1 bukott)
  uiLine: '#E2E8F0', // slate-200 -- CSAK diszito sorelvalasztora (tablasor, kartyaszel)
  uiLineStrong: '#CBD5E1', // slate-300 -- diszito, erosebb hajszalvonal
  controlBorder: '#64748B', // slate-500, 3:1 folött minden szomszed ellen (K4: a
  // regi #8896AB csak feheren 3.00:1, a tenyleges belso (soft-kitoltes) es
  // kulso (t.page) szomszedok ellen 2-3:1 volt) -- WCAG 1.4.11: minden
  // interaktiv kontroll kerete. Azonos ertek, mint `uiTextFaint`, de kulon
  // szerep -- szandekos egyezes, ne vond ossze a ket tokent

  // Szerep -- csak app, PDF nem hasznalja
  warn: '#9A5B00', // 5.43:1 feheren, 5.06:1 warnBg-n (a regi #B26A00 4.24:1/3.95:1 bukott)
  warnBg: '#FFF6E6',
  danger: '#B3261E',
  dangerBg: '#FDECEA',
  dangerBorder: '#F3C9C5',
  ok: '#1F7A4D',
  okBg: '#EAF6F0',
  shadowLg: '0 8px 24px rgba(45,45,45,0.14)',

  // Meretek -- EGY radius rendszer, csak app
  radius: 6,
  radiusLg: 6,
  control: 32,

  font: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  lineHeight: 1.65,
} as const;
