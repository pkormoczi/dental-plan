// Közös inline-style objektumok -- a ui/*.jsx prototípusokban ismétlődő
// stílusok (input, btn, chip, row) egy helyre kiemelve, hogy a képernyők
// ne duplikálják őket.

import type { CSSProperties } from 'react';
import { t } from './tokens';

export const pageWrap: CSSProperties = {
  background: t.page,
  minHeight: '100vh',
  padding: 24,
  fontFamily: t.font,
  color: t.text,
};

export const input: CSSProperties = {
  width: '100%',
  height: 30,
  fontSize: 13,
  padding: '0 7px',
  boxSizing: 'border-box',
  border: `1px solid ${t.line}`,
  borderRadius: t.radius,
  background: t.surface,
  color: t.text,
  fontFamily: 'inherit',
};

export const chip: CSSProperties = {
  fontSize: 12,
  padding: '4px 10px',
  border: `1px solid ${t.line}`,
  borderRadius: 99,
  background: t.surfaceAlt,
  color: t.textMuted,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export function btn(primary?: boolean): CSSProperties {
  return {
    height: 32,
    fontSize: 13,
    padding: '0 12px',
    borderRadius: t.radius,
    cursor: 'pointer',
    fontFamily: 'inherit',
    border: `1px solid ${primary ? t.navy : t.lineStrong}`,
    background: primary ? t.navy : t.surface,
    color: primary ? '#fff' : t.text,
  };
}

export const iconBtn: CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 15,
  padding: '0 4px',
  fontFamily: 'inherit',
};

export const card: CSSProperties = {
  background: t.surface,
  border: `1px solid ${t.line}`,
  borderRadius: t.radiusLg,
  padding: '14px 18px',
  marginBottom: 12,
};
