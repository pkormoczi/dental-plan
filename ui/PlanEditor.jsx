import React, { useState, useRef, useMemo, useEffect } from 'react';
import { t, formatMoney, formatPrice, basePrice, norm, parseTeeth } from './tokens';

/**
 * Kezelési terv szerkesztő — a legfontosabb képernyő.
 *
 * A billentyűzetes ciklus a lényeg, ez veri meg az Excelt:
 *   gépel -> nyíl -> Enter -> a kereső kiürül és visszakapja a fókuszt -> gépel tovább
 *
 * A state shape megegyezik a terv.json fazisok[] szerkezetével
 * (lásd docs/02-domain-modell.md).
 */

const SAMPLE = {
  kategoriak: [
    { id: 'k02', nev: { hu: 'Tömések' } },
    { id: 'k03', nev: { hu: 'Gyökérkezelés' } },
    { id: 'k08', nev: { hu: 'Szájsebészet' } },
    { id: 'k10', nev: { hu: 'Korona és hídpótlások' } },
  ],
  tetelek: [
    { id: 't009', kategoriaId: 'k02', aktiv: true, gyakori: true, nev: { hu: 'Esztétikus tömés 3 felszín' }, ar: { HUF: { tipus: 'FIX', ertek: 45000 } } },
    { id: 't007', kategoriaId: 'k02', aktiv: true, gyakori: false, nev: { hu: 'Fognyaki tömés' }, ar: { HUF: { tipus: 'FIX', ertek: 25000 } } },
    { id: 't016', kategoriaId: 'k03', aktiv: true, gyakori: false, nev: { hu: 'Gyökértömés csatornaszámtól függően' }, ar: { HUF: { tipus: 'SAVOS', min: 38000, max: 65000 } } },
    { id: 't014', kategoriaId: 'k03', aktiv: true, gyakori: false, nev: { hu: 'Fogbél megnyitás + gyógyszeres zárás' }, ar: { HUF: { tipus: 'SAVOS', min: 35000, max: 55000 } } },
    { id: 't051', kategoriaId: 'k08', aktiv: true, gyakori: true, nev: { hu: 'Fogeltávolítás' }, ar: { HUF: { tipus: 'FIX', ertek: 25000 } } },
    { id: 't077', kategoriaId: 'k08', aktiv: true, gyakori: false, nev: { hu: 'Neodent implantatum' }, ar: { HUF: { tipus: 'FIX', ertek: 170000 } } },
    { id: 't100', kategoriaId: 'k10', aktiv: true, gyakori: true, nev: { hu: 'Fémkerámia' }, ar: { HUF: { tipus: 'FIX', ertek: 95000 } } },
    { id: 't103', kategoriaId: 'k10', aktiv: true, gyakori: true, nev: { hu: 'Zirkonkerámia fogra' }, ar: { HUF: { tipus: 'FIX', ertek: 135000 } } },
  ],
};

export default function PlanEditor({ priceList = SAMPLE, currency = 'HUF' }) {
  const [phases, setPhases] = useState([
    { sorszam: 1, megnevezes: '1. kezelés', megjegyzes: '', sorok: [] },
  ]);

  const catName = (id) =>
    priceList.kategoriak.find((k) => k.id === id)?.nev.hu || 'Egyéb';

  const available = useMemo(
    () => priceList.tetelek.filter((x) => x.aktiv && x.ar[currency]),
    [priceList, currency]
  );

  const frequent = available.filter((x) => x.gyakori);

  function addLine(phaseIdx, item) {
    const ar = item.ar[currency];
    const base = basePrice(ar);
    setPhases((prev) => {
      const next = structuredClone(prev);
      next[phaseIdx].sorok.push({
        tetelId: item.id,
        nevSnapshot: item.nev.hu,
        savos: ar.tipus === 'SAVOS',
        fogak: '',
        mennyiseg: 1,
        listaEgysegar: base,
        tenylegesEgysegar: base,
      });
      return next;
    });
  }

  function patchLine(pi, li, patch) {
    setPhases((prev) => {
      const next = structuredClone(prev);
      Object.assign(next[pi].sorok[li], patch);
      return next;
    });
  }

  const phaseTotal = (p) =>
    p.sorok.reduce((s, l) => s + l.tenylegesEgysegar * l.mennyiseg, 0);

  const grand = phases.reduce((s, p) => s + phaseTotal(p), 0);
  const listTotal = phases.reduce(
    (s, p) => s + p.sorok.reduce((a, l) => a + l.listaEgysegar * l.mennyiseg, 0),
    0
  );

  return (
    <div style={{ background: t.page, minHeight: '100vh', padding: 24, fontFamily: t.font, color: t.text }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Header />

        {phases.map((p, pi) => (
          <PhaseCard
            key={pi}
            phase={p}
            currency={currency}
            available={available}
            catName={catName}
            frequent={frequent}
            canDelete={phases.length > 1}
            total={phaseTotal(p)}
            onAdd={(item) => addLine(pi, item)}
            onPatchLine={(li, patch) => patchLine(pi, li, patch)}
            onRemoveLine={(li) =>
              setPhases((prev) => {
                const n = structuredClone(prev);
                n[pi].sorok.splice(li, 1);
                return n;
              })
            }
            onRename={(v) =>
              setPhases((prev) => {
                const n = structuredClone(prev);
                n[pi].megnevezes = v;
                return n;
              })
            }
            onNote={(v) =>
              setPhases((prev) => {
                const n = structuredClone(prev);
                n[pi].megjegyzes = v;
                return n;
              })
            }
            onDelete={() =>
              setPhases((prev) => prev.filter((_, i) => i !== pi))
            }
          />
        ))}

        <button
          style={btn()}
          onClick={() =>
            setPhases((p) => [
              ...p,
              { sorszam: p.length + 1, megnevezes: `${p.length + 1}. kezelés`, megjegyzes: '', sorok: [] },
            ])
          }
        >
          + Új kezelési fázis
        </button>

        <Summary grand={grand} listTotal={listTotal} currency={currency} />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, color: t.navy }}>Kezelési terv</div>
        <div style={{ fontSize: 13, color: t.textMuted }}>Kovács János · piszkozat</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={btn()}>Előnézet</button>
        <button style={btn(true)}>Véglegesítés és mentés</button>
      </div>
    </div>
  );
}

function PhaseCard({
  phase, currency, available, catName, frequent, total,
  canDelete, onAdd, onPatchLine, onRemoveLine, onRename, onNote, onDelete,
}) {
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.line}`, borderRadius: t.radiusLg, padding: '14px 18px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <input
          value={phase.megnevezes}
          onChange={(e) => onRename(e.target.value)}
          style={{ border: 'none', outline: 'none', font: 'inherit', fontSize: 15, fontWeight: 600, color: t.navy, background: 'transparent', width: 320 }}
        />
        {canDelete && (
          <button style={btn()} onClick={onDelete}>Fázis törlése</button>
        )}
      </div>

      <div style={{ ...gridRow, ...headStyle }}>
        <div>Beavatkozás</div>
        <div>Fog</div>
        <div style={{ textAlign: 'center' }}>Db</div>
        <div style={{ textAlign: 'right' }}>Listaár</div>
        <div style={{ textAlign: 'right' }}>Tényleges</div>
        <div style={{ textAlign: 'right' }}>Összeg</div>
        <div />
      </div>

      {phase.sorok.map((l, li) => (
        <LineRow
          key={li}
          line={l}
          currency={currency}
          onPatch={(p) => onPatchLine(li, p)}
          onRemove={() => onRemoveLine(li)}
        />
      ))}

      <ItemPicker
        available={available}
        catName={catName}
        currency={currency}
        onPick={onAdd}
      />

      {frequent.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {frequent.map((f) => (
            <button key={f.id} style={chip} onClick={() => onAdd(f)}>
              + {f.nev.hu}
            </button>
          ))}
        </div>
      )}

      <input
        value={phase.megjegyzes}
        onChange={(e) => onNote(e.target.value)}
        placeholder="Megjegyzés a fázishoz (megjelenik a nyomtatványon)"
        style={{ ...input, marginTop: 10, fontSize: 13 }}
      />

      <div style={{ textAlign: 'right', fontSize: 13, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${t.line}` }}>
        Fázis összesen: <b>{formatMoney(total, currency)}</b>
      </div>
    </div>
  );
}

function LineRow({ line, currency, onPatch, onRemove }) {
  const teeth = parseTeeth(line.fogak);
  const mismatch = teeth.valid && teeth.teeth.length !== line.mennyiseg;
  const discount =
    line.tenylegesEgysegar < line.listaEgysegar
      ? Math.round((1 - line.tenylegesEgysegar / line.listaEgysegar) * 100)
      : 0;

  return (
    <div style={{ borderTop: `1px solid ${t.line}`, padding: '6px 0' }}>
      <div style={gridRow}>
        <div style={{ fontSize: 13 }}>
          {line.nevSnapshot}
          {line.savos && <span style={{ color: t.warn, fontSize: 11, marginLeft: 6 }}>sávos</span>}
          {discount > 0 && (
            <span style={{ fontSize: 11, marginLeft: 6, color: t.ok, background: '#EAF6F0', padding: '1px 5px', borderRadius: 4 }}>
              −{discount}%
            </span>
          )}
        </div>

        <input
          value={line.fogak}
          placeholder="16, 17, 26"
          onChange={(e) => onPatch({ fogak: e.target.value })}
          style={{ ...input, textAlign: 'center' }}
        />

        <input
          type="number"
          min={1}
          value={line.mennyiseg}
          onChange={(e) => onPatch({ mennyiseg: Math.max(1, +e.target.value || 1) })}
          style={{ ...input, textAlign: 'center' }}
        />

        <div style={{ fontSize: 12, color: t.textFaint, textAlign: 'right', paddingTop: 8 }}>
          {formatMoney(line.listaEgysegar, currency)}
        </div>

        <input
          type="number"
          value={line.tenylegesEgysegar}
          onChange={(e) => onPatch({ tenylegesEgysegar: +e.target.value || 0 })}
          style={{
            ...input,
            textAlign: 'right',
            borderColor: discount || line.savos ? t.navy : t.line,
          }}
        />

        <div style={{ fontSize: 13, textAlign: 'right', paddingTop: 8, fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(line.tenylegesEgysegar * line.mennyiseg, currency)}
        </div>

        <button onClick={onRemove} style={{ ...btn(), padding: '0 8px', height: 30 }}>×</button>
      </div>

      {mismatch && (
        <div style={{ fontSize: 11, color: t.warn, paddingLeft: 2, paddingTop: 2 }}>
          {teeth.teeth.length} fog van felsorolva, a darabszám {line.mennyiseg}. Szándékos?
        </div>
      )}
    </div>
  );
}

/** Csak keresés, nincs kategória böngésző (D19). Ékezetfüggetlen. */
function ItemPicker({ available, catName, currency, onPick }) {
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const ref = useRef(null);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const nq = norm(q);
    return available.filter((x) => norm(x.nev.hu).includes(nq)).slice(0, 12);
  }, [q, available]);

  useEffect(() => setHi(0), [q]);

  function commit(item) {
    onPick(item);
    setQ('');
    requestAnimationFrame(() => ref.current?.focus());
  }

  function onKeyDown(e) {
    if (!results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => (h + 1) % results.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => (h - 1 + results.length) % results.length); }
    else if (e.key === 'Enter') { e.preventDefault(); commit(results[hi]); }
    else if (e.key === 'Escape') { setQ(''); }
  }

  let lastCat = null;

  return (
    <div style={{ position: 'relative', marginTop: 8 }}>
      <input
        ref={ref}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Tétel keresése…  (ékezet nélkül is: eszt, koron, gyoker)"
        style={{ ...input, height: 36, textAlign: 'left' }}
      />
      {results.length > 0 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 40, zIndex: 30,
          background: t.surface, border: `1px solid ${t.lineStrong}`,
          borderRadius: t.radiusLg, padding: 4, maxHeight: 280, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(35,60,121,0.12)',
        }}>
          {results.map((r, i) => {
            const header = catName(r.kategoriaId) !== lastCat ? (lastCat = catName(r.kategoriaId)) : null;
            return (
              <React.Fragment key={r.id}>
                {header && (
                  <div style={{ fontSize: 11, color: t.textFaint, padding: '6px 10px 2px' }}>{header}</div>
                )}
                <div
                  onMouseEnter={() => setHi(i)}
                  onMouseDown={(e) => { e.preventDefault(); commit(r); }}
                  style={{
                    display: 'flex', justifyContent: 'space-between', gap: 12,
                    padding: '7px 10px', fontSize: 13, cursor: 'pointer',
                    borderRadius: t.radius,
                    background: i === hi ? t.skyWash : 'transparent',
                  }}
                >
                  <span>{r.nev.hu}</span>
                  <span style={{ color: t.textFaint, whiteSpace: 'nowrap' }}>
                    {formatPrice(r.ar[currency], currency)}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Summary({ grand, listTotal, currency }) {
  const discount = listTotal - grand;
  return (
    <div style={{
      background: t.surface, border: `1px solid ${t.line}`, borderRadius: t.radiusLg,
      padding: '14px 18px', marginTop: 14,
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    }}>
      <span style={{ fontSize: 14, color: t.textMuted }}>Mindösszesen</span>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: t.navy, fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(grand, currency)}
        </div>
        {discount > 0 && (
          // Csak a szerkesztőben látszik. A nyomtatványon NEM (D9).
          <div style={{ fontSize: 12, color: t.ok }}>
            Kedvezmény: {formatMoney(discount, currency)}
          </div>
        )}
      </div>
    </div>
  );
}

const gridRow = {
  display: 'grid',
  gridTemplateColumns: '1fr 84px 52px 100px 108px 108px 32px',
  gap: 8,
  alignItems: 'start',
};

const headStyle = {
  fontSize: 11,
  color: t.textFaint,
  paddingBottom: 4,
};

const input = {
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

const chip = {
  fontSize: 12,
  padding: '4px 10px',
  border: `1px solid ${t.line}`,
  borderRadius: 99,
  background: t.surfaceAlt,
  color: t.textMuted,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

function btn(primary) {
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
