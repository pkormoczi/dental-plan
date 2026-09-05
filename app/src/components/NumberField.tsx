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
import { useMentesJelzo } from './useMentesJelzo';

// Radix TextField.Root méretéhez igazítva (a NumberField a szomszéd
// mezőkkel, pl. a "fogak" TextField.Root-tal egy sorban áll) -- nincs
// Radix megfelelője egy léptető nyilakkal bővített számmezőnek, ezért ez
// marad kézzel írva (kivétel a Radix-only szabály alól, lásd app/src/CLAUDE.md:
// a fogtérkép és a nyomtatvány mellett ez a harmadik, indokolt eset).
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
  /**
   * Szerződéses összeget hordoz-e a mező -- KÖTELEZŐ, mert a `unit` megléte
   * nem különbözteti meg a HUF ár-mezőt a darabszámtól (`unit` alapból is
   * 'HUF'). `penz` mezőn nincs ▲/▼ gomb és a nyíl-billentyű nem léptet: egy
   * ±1 Ft/cent sosem hasznos szerződéses összegen, a véletlen elmozdulás
   * kockázata viszont valós (doctor-review 2026-09-05, 6. megállapítás).
   */
  penz: boolean;
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
  /**
   * Blur UTÁN hívódik, a `commit()` lefutása után -- kizárólag "a mező most
   * vesztette el a fókuszt" jelzéshez (pl. egy kötelező-mező hiba, ami csak
   * blur/Enter után jelenhet meg, nem azonnal fókuszáláskor, backlog-64 6.
   * döntése). NEM helyettesíti az `onCommit`-ot, ami az új értéket adja át.
   */
  onBlur?: () => void;
  placeholder?: string;
  textAlign?: CSSProperties['textAlign'];
  style?: CSSProperties;
  'aria-label'?: string;
  autoFocus?: boolean;
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
  penz,
  unit = 'HUF',
  min,
  onDraftChange,
  onBlur,
  placeholder,
  textAlign,
  style,
  ...rest
}: NumberFieldProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => formatForDisplay(value, unit));
  // Rövid, magától elmúló jelzés a néma visszaálláshoz -- a projekt meglévő
  // ref-alapú, unmountkor takarító időzítő-primitívje (lásd useMentesJelzo.ts
  // fejlécét: negyedik kézi setTimeout-másolat helyett ezt hasznosítja újra).
  const { saved: revertJelzesLathato, jelez: mutatRevertJelzest } = useMentesJelzo(2500);

  // A `value` propból csak akkor szinkronizálunk, ha a mező NINCS
  // fókuszban -- így egy időközben érkező (pl. reset utáni) prop-frissítés
  // nem írja felül a doki éppen folyamatban lévő gépelését. Ehhez a
  // `focused` false-ra állítása onBlur-kor KÖTELEZŐ (lásd lent) -- enélkül
  // ez a hatás a mező életének első fókuszálása után örökre leállna, akkor
  // is, ha a mező rég elvesztette a tényleges DOM-fókuszt.
  useEffect(() => {
    if (!focused) setDraft(formatForDisplay(value, unit));
  }, [value, unit, focused]);

  function commit() {
    const parsed = parseDraft(draft, unit);
    if (parsed == null || !Number.isFinite(parsed) || (min != null && parsed < min)) {
      // Üres/érvénytelen/min alatti érték -- SOHA nem esik 0-ra, az utolsó
      // ismert értékre áll vissza (P0-4). A visszaállás NEM néma (lásd a
      // review 6. megállapítását): csak akkor jelez, ha a piszkozat tényleg
      // eltért a visszaállított megjelenítéstől, hogy egy üres -> üres blur
      // (pl. az ElolegBlokk frissen bekapcsolt mezőjén) ne fusson riasztásba.
      const visszaallitott = formatForDisplay(value, unit);
      if (draft !== visszaallitott) mutatRevertJelzest();
      setDraft(visszaallitott);
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
  // commitálva, blur nélkül. NEM pénzmezőn (`penz` prop, lásd fent) -- egy
  // ±1 Ft/cent lépés sosem hasznos szerződéses összegen, csak véletlen
  // elmozdulás kockázata (doctor-review 2026-09-05, 6. megállapítás).
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
          paddingRight: penz ? 7 : 16,
          fontVariantNumeric: 'tabular-nums',
          ...style,
        }}
        onFocus={(e) => {
          setFocused(true);
          // Excel-cella jelleg: fókuszáláskor a teljes tartalom kijelölve, hogy
          // az első leütés lecserélje, ne a meglévő érték végéhez fűződjön
          // (pl. "24000" mezőbe "28000"-et gépelve ne "2400028000" legyen).
          e.currentTarget.select();
        }}
        onChange={(e) => {
          setDraft(e.target.value);
          onDraftChange?.(parseDraft(e.target.value, unit));
        }}
        onBlur={() => {
          commit();
          setFocused(false);
          onBlur?.();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            setDraft(formatForDisplay(value, unit));
            onDraftChange?.(value);
          } else if (!penz && e.key === 'ArrowUp') {
            e.preventDefault();
            step(1);
          } else if (!penz && e.key === 'ArrowDown') {
            e.preventDefault();
            step(-1);
          }
        }}
      />
      {!penz && (
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
      )}
      {/* Mindig a DOM-ban, csak a szövege vált -- egy dinamikusan beszúrt
          aria-live régiót sok képernyőolvasó nem mond ki (lásd
          PriceListAdminPage.tsx a mentés-jelzőnél). */}
      <div aria-live="polite" style={revertHintStyle(revertJelzesLathato)}>
        {revertJelzesLathato ? 'Érvénytelen érték — az előző maradt' : ''}
      </div>
    </div>
  );
}

function revertHintStyle(lathato: boolean): CSSProperties {
  return {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: lathato ? 2 : 0,
    padding: lathato ? '1px 4px' : 0,
    fontSize: 11,
    whiteSpace: 'nowrap',
    color: t.warn,
    background: lathato ? t.warnBg : 'transparent',
    borderRadius: t.radius,
    pointerEvents: 'none',
  };
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
