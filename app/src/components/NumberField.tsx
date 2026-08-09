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

import { useEffect, useState, type CSSProperties } from 'react';
import { t } from '../design/tokens';
import { formatCentForInput, parseEuroInput } from '../domain/money';

// Radix TextField.Root méretéhez igazítva (a NumberField a szomszéd
// mezőkkel, pl. a "fogak" TextField.Root-tal egy sorban áll) -- nincs
// Radix megfelelője egy léptető nyilakkal bővített számmezőnek, ezért ez
// marad kézzel írva (lásd docs/07-felulet-rendszer.md kivétele: fogtérkép
// + nyomtatvány mellett ez a harmadik, be nem jelentett, de indokolt eset).
const inputStyle: CSSProperties = {
  width: '100%',
  height: 30,
  fontSize: 13,
  padding: '0 7px',
  boxSizing: 'border-box',
  border: `1px solid ${t.controlBorder}`,
  borderRadius: t.radius,
  background: t.surface,
  color: t.text,
  fontFamily: 'inherit',
};

export interface NumberFieldProps {
  /** `null` = nincs érték (pl. egy tételnek nincs EUR ára) -- üresen jelenik meg, nem "0". */
  value: number | null;
  onCommit: (next: number) => void;
  /** 'EUR': a mező euróban jelenik meg, a commit centben történik (a tárolás változatlan). */
  unit?: 'HUF' | 'EUR';
  /** Ez alatti (parseolt) érték nem commitálódik -- visszaáll az utolsó ismert értékre. */
  min?: number;
  /**
   * Minden leütésre hívódik a még nem committált, parseolt piszkozattal
   * (érvénytelen/üres esetén `null`) -- KIZÁRÓLAG live UI-visszajelzéshez
   * (pl. "a fogak száma nem egyezik a darabszámmal" figyelmeztetés), sosem
   * a törzsadat írásához, azt továbbra is `onCommit` végzi blur/Enter-re.
   */
  onDraftChange?: (parsed: number | null) => void;
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
  onDraftChange,
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
      onDraftChange?.(value);
      return;
    }
    const rounded = Math.round(parsed);
    setDraft(formatForDisplay(rounded, unit));
    onDraftChange?.(rounded);
    if (rounded !== value) onCommit(rounded);
  }

  // A natív <input type="number"> nyilai (és a Fel/Le billentyű) az EUR-mező
  // vessző-tizedes megjelenítése miatt bevezetett type="text"-tel nem
  // működnek -- ez pótolja őket, a natív mezőhöz hasonlóan AZONNAL
  // commitálva, blur nélkül.
  function step(delta: number) {
    const base = parseDraft(draft, unit) ?? value ?? 0;
    const next = Math.round(base) + delta;
    const clamped = min != null ? Math.max(min, next) : next;
    setDraft(formatForDisplay(clamped, unit));
    onDraftChange?.(clamped);
    if (clamped !== value) onCommit(clamped);
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        {...rest}
        type="text"
        inputMode="decimal"
        value={draft}
        placeholder={placeholder}
        style={{
          ...inputStyle,
          textAlign,
          paddingRight: 16,
          fontVariantNumeric: 'tabular-nums',
          ...style,
        }}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          setDraft(e.target.value);
          onDraftChange?.(parseDraft(e.target.value, unit));
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            setDraft(formatForDisplay(value, unit));
            onDraftChange?.(value);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            step(1);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            step(-1);
          }
        }}
      />
      <div style={stepperWrap}>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Növelés"
          style={stepperBtnTop}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => step(1)}
        >
          ▲
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Csökkentés"
          style={stepperBtnBottom}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => step(-1)}
        >
          ▼
        </button>
      </div>
    </div>
  );
}

const stepperWrap: CSSProperties = {
  position: 'absolute',
  right: 1,
  top: 1,
  bottom: 1,
  width: 14,
  display: 'flex',
  flexDirection: 'column',
};

const stepperBtnBase: CSSProperties = {
  flex: 1,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 7,
  lineHeight: 1,
  padding: 0,
  color: t.uiTextFaint,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const stepperBtnTop: CSSProperties = { ...stepperBtnBase, borderBottom: `1px solid ${t.uiLine}` };
const stepperBtnBottom: CSSProperties = { ...stepperBtnBase };
