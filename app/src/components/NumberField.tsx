// Blur-re (és Enterre) commitáló szám-mező -- az árlista admin és a terv
// szerkesztő ár/mennyiség mezői korábban MINDEN billentyűleütésre azonnal a
// törzsadatba írtak (`Number(e.target.value) || 0`), debounce/floor nélkül.
// Ez önmagában több review-találatot okozott:
//  - P0-4: üres mező commitja némán 0-ra esett
//  - P0-5: EUR mező centben kért, de semmi sem védte ki az "euróban
//    gépelek" tévesztést -- lásd `unit="EUR"`
//  - P1-4: minden leütés azonnal a törzsárlistába írt, törléskor a
//    pillanatnyi 0 azonnal perzisztálódott
//  - P0-7 fele: gépelés közben a sor kieshetett egy aktív szűrő alól,
//    mert a lista minden leütésre újraszámolt
//
// Lásd review/99-osszesites.md és a jóváhagyott terv "0. Közös alap" pontja.

import { useEffect, useState, type CSSProperties } from 'react';
import { input as inputStyle } from '../design/ui';
import { formatCentForInput, parseEuroInput } from '../domain/money';

export interface NumberFieldProps {
  /** `null` = nincs érték (pl. egy tételnek nincs EUR ára) -- üresen jelenik meg, nem "0". */
  value: number | null;
  onCommit: (next: number) => void;
  /** 'EUR': a mező euróban jelenik meg, a commit centben történik (a tárolás változatlan). */
  unit?: 'HUF' | 'EUR';
  /** Ez alatti (parseolt) érték nem commitálódik -- visszaáll az utolsó ismert értékre. */
  min?: number;
  placeholder?: string;
  textAlign?: CSSProperties['textAlign'];
  style?: CSSProperties;
  'aria-label'?: string;
}

function formatForDisplay(value: number | null, unit: 'HUF' | 'EUR'): string {
  if (value == null || !Number.isFinite(value)) return '';
  return unit === 'EUR' ? formatCentForInput(value) : String(value);
}

function parseDraft(text: string, unit: 'HUF' | 'EUR'): number | null {
  if (unit === 'EUR') return parseEuroInput(text);
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export default function NumberField({
  value,
  onCommit,
  unit = 'HUF',
  min,
  placeholder,
  textAlign,
  style,
  ...rest
}: NumberFieldProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => formatForDisplay(value, unit));

  // A `value` propból csak akkor szinkronizálunk, ha a mező NINCS
  // fókuszban -- így egy időközben érkező (pl. reset utáni) prop-frissítés
  // nem írja felül a doki éppen folyamatban lévő gépelését.
  useEffect(() => {
    if (!focused) setDraft(formatForDisplay(value, unit));
  }, [value, unit, focused]);

  function commit() {
    const parsed = parseDraft(draft, unit);
    if (parsed == null || !Number.isFinite(parsed) || (min != null && parsed < min)) {
      // Üres/érvénytelen/min alatti érték -- SOHA nem esik 0-ra, az utolsó
      // ismert értékre áll vissza (P0-4).
      setDraft(formatForDisplay(value, unit));
      return;
    }
    const rounded = Math.round(parsed);
    setDraft(formatForDisplay(rounded, unit));
    if (rounded !== value) onCommit(rounded);
  }

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      value={draft}
      placeholder={placeholder}
      style={{ ...inputStyle, textAlign, ...style }}
      onFocus={() => setFocused(true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          setDraft(formatForDisplay(value, unit));
        }
      }}
    />
  );
}
