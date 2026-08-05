// Design tokenek — Mándoki Dental kezelési terv app
//
// A márkaszínek a klinika logójából származnak (CorelDRAW PDF-ből mintavételezve).
// A világoskék SOHA nem lehet szövegszín: #7EC7EF fehéren, kis méretben olvashatatlan.

export const t = {
  // Márka
  navy: '#233C79',
  navySoft: '#3B5490',
  sky: '#7EC7EF',
  skyWash: '#EAF4FC',

  // Felületek
  page: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFBFC',

  // Szöveg
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

  // Méretek
  radius: 6,
  radiusLg: 10,
  control: 32,

  // Tipográfia
  font: '-apple-system, "Segoe UI", Inter, system-ui, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
};

// A pénz egész számként tárolódik a pénznem alapegységében:
// HUF -> forint, EUR -> cent. Így nincs lebegőpontos hiba az összegzésben.
export function formatMoney(value, currency) {
  if (value == null) return '—';
  if (currency === 'EUR') {
    return (value / 100).toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' €';
  }
  return Math.round(value).toLocaleString('hu-HU').replace(/\u00A0/g, ' ') + ' Ft';
}

export function formatPrice(ar, currency) {
  if (!ar) return null;
  if (ar.tipus === 'SAVOS') {
    return formatMoney(ar.min, currency) + '–' + formatMoney(ar.max, currency);
  }
  return formatMoney(ar.ertek, currency);
}

export function basePrice(ar) {
  if (!ar) return 0;
  return ar.tipus === 'SAVOS' ? ar.min : ar.ertek;
}

// Ékezetfüggetlen kereséshez. "gyoker" -> "gyökérkezelés"
export function norm(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// FDI fogszámok: maradó 11-18, 21-28, 31-38, 41-48; tejfog 51-55, 61-65, 71-75, 81-85
const FDI = /^(?:[1-4][1-8]|[5-8][1-5])$/;

export function parseTeeth(input) {
  const tokens = (input || '').split(/[\s,;]+/).filter(Boolean);
  if (!tokens.length) return { valid: false, teeth: [] };
  const ok = tokens.every((x) => FDI.test(x));
  return { valid: ok, teeth: ok ? tokens : [] };
}
