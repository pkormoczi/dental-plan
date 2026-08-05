// Design tokenek -- portolva ui/tokens.js:6-41-bol.
//
// A markaszinek a klinika logojabol szarmaznak. A vilagoskek SOHA nem lehet
// szovegszin: #7EC7EF feheren, kis meretben olvashatatlan -- csak diszito-
// vonalra es a fogterkep kiemelesere valo. Lasd docs/04-nyomtatvany-spec.md.

export const t = {
  // Marka
  navy: '#233C79',
  navySoft: '#3B5490',
  sky: '#7EC7EF',
  skyWash: '#EAF4FC',

  // Feluletek
  page: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFBFC',

  // Szoveg
  text: '#1A1A1A',
  textMuted: '#5A6579',
  textFaint: '#8A93A3',

  // Vonalak
  line: '#E2E6ED',
  lineStrong: '#C9D2E2',

  // Szerep
  warn: '#B26A00',
  warnBg: '#FFF6E6',
  danger: '#B3261E',
  ok: '#1F7A4D',

  // Meretek
  radius: 6,
  radiusLg: 10,
  control: 32,

  // Tipografia
  font: '-apple-system, "Segoe UI", Inter, system-ui, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
} as const;
