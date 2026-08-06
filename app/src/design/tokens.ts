// Design tokenek -- a marka a klinika nyilvanos honlapjarol (drmandoki.hu)
// szarmazik, NEM a korabbi (2025-os, navy/vilagoskek) logo szineibol -- a
// logo PNG-t is ehhez a palettahoz szineztuk at (lasd
// docs/04-nyomtatvany-spec.md "Logo").
//
// Ket szabaly:
//  - `accent` (#f77409) SOHA nem lehet szovegszin -- feheren 2.82:1. Csak
//    diszitovonal es a fogterkep kiemelese. (A korabbi #7EC7EF szabalyanak
//    utodja.)
//  - `brand` (#976445) feheren 4.97:1 -- alig a WCAG AA kuszob (4.5) folott.
//    Szines hatteren ujra kell szamolni: `accentWash` felett 4.58:1, ennel
//    sotetebb/telitettebb hatteren mar bukhat.
//
// A tokennevek szandekosan szerepalapuak, nem szinnevek -- a korabbi
// navy/sky nevek egy rebrandnel hazugsagga valtak volna.

export const t = {
  // Marka -- drmandoki.hu
  brand: '#976445', // cimsorok, vonalak -- 4.97:1 feheren
  accent: '#f77409', // CSAK diszites -- 2.82:1 feheren
  accentWash: '#FEF4EB', // kivalasztott/aktiv allapot hattere
  ink: '#2D2D2D', // primary gomb hattere (a honlap gombszine) -- 13.77:1
  onBrand: '#FFFFFF', // szoveg ink/brand hatteren

  // Feluletek
  page: '#F7F5F3',
  surface: '#FFFFFF',
  surfaceAlt: '#FBFAF9',

  // Szoveg
  text: '#1A1A1A',
  textMuted: '#5C5651',
  textFaint: '#8C8580',

  // Vonalak
  line: '#E7E2DD',
  lineStrong: '#D3CBC3',

  // Szerep
  warn: '#B26A00',
  warnBg: '#FFF6E6',
  danger: '#B3261E',
  dangerBg: '#FDECEA',
  dangerBorder: '#F3C9C5',
  ok: '#1F7A4D',
  okBg: '#EAF6F0',
  toothInactive: '#EFECE8',
  shadowLg: '0 8px 24px rgba(45,45,45,0.14)',

  // Meretek
  radius: 6,
  radiusLg: 10,
  control: 32,

  // Tipografia -- a honlap rendszer-betukeszlet-stackje
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  lineHeight: 1.65,
} as const;
