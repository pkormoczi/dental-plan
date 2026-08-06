// Kezelési terv szerkesztő -- a legfontosabb képernyő, portolva
// ui/PlanEditor.jsx-ből. A billentyűzetes ciklus a lényeg, ez veri meg az
// Excelt: gépel -> nyíl -> Enter -> a kereső kiürül és visszakapja a
// fókuszt -> gépel tovább, egérhasználat nélkül. Lásd CLAUDE.md
// "A UX kritikus pontja".

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '../design/tokens';
import { btn, chip, input } from '../design/ui';
import { formatMoney, formatPrice } from '../domain/money';
import { resolveNev } from '../domain/nev';
import { norm } from '../domain/search';
import { parseTeeth } from '../domain/teeth';
import { fazisListaOsszeg, fazisOsszeg } from '../domain/totals';
import type { Fazis, Nyelv, Penznem, Plan, Sor, Tetel } from '../domain/types';
import { useAppState } from '../state/AppState';

export default function PlanEditorPage() {
  const { plan, setPlan, priceList } = useAppState();
  const navigate = useNavigate();
  const currency = plan.penznem;
  const nyelv = plan.nyelv;

  const catName = (id: string): string => {
    const kat = priceList.kategoriak.find((k) => k.id === id);
    return kat ? resolveNev(kat.nev, nyelv).szoveg : 'Egyéb';
  };

  const available = useMemo(
    () => priceList.tetelek.filter((x) => x.aktiv && x.ar[currency]),
    [priceList, currency],
  );
  const frequent = useMemo(() => available.filter((x) => x.gyakori), [available]);

  // D21/1.1: melyik tétel neve esne vissza magyarra ezen a nyelven -- a
  // kereső HU jelölésének és a felvett soroknak a forrása. `hu` tervnél
  // sosem eshet vissza (resolveNev mindig nev.hu-t ad), ezért üres halmaz.
  const fallbackTetelIds = useMemo(() => {
    if (nyelv === 'hu') return new Set<string>();
    return new Set(priceList.tetelek.filter((x) => !x.nev.de).map((x) => x.id));
  }, [priceList, nyelv]);

  function updatePlan(fn: (draft: Plan) => void) {
    setPlan((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }

  function addLine(phaseIdx: number, item: Tetel) {
    const ar = item.ar[currency];
    if (!ar) return; // available már kiszűrte, de a típusnak ez kell
    const base = ar.tipus === 'SAVOS' ? ar.min : ar.ertek;
    updatePlan((draft) => {
      draft.fazisok[phaseIdx].sorok.push({
        tetelId: item.id,
        nevSnapshot: resolveNev(item.nev, nyelv).szoveg,
        savos: ar.tipus === 'SAVOS',
        fogak: '',
        mennyiseg: 1,
        listaEgysegar: base,
        tenylegesEgysegar: base,
      });
    });
  }

  function patchLine(pi: number, li: number, patch: Partial<Sor>) {
    updatePlan((draft) => {
      Object.assign(draft.fazisok[pi].sorok[li], patch);
    });
  }

  const grand = plan.fazisok.reduce((s, p) => s + fazisOsszeg(p), 0);
  const listTotal = plan.fazisok.reduce((s, p) => s + fazisListaOsszeg(p), 0);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Header
        patientName={plan.paciens.nev}
        statusz={plan.statusz}
        onPreview={() => navigate('/elonezet')}
      />

      {plan.fazisok.map((p, pi) => (
        <PhaseCard
          key={pi}
          phase={p}
          currency={currency}
          nyelv={nyelv}
          available={available}
          catName={catName}
          frequent={frequent}
          fallbackTetelIds={fallbackTetelIds}
          canDelete={plan.fazisok.length > 1}
          total={fazisOsszeg(p)}
          onAdd={(item) => addLine(pi, item)}
          onPatchLine={(li, patch) => patchLine(pi, li, patch)}
          onRemoveLine={(li) =>
            updatePlan((draft) => {
              draft.fazisok[pi].sorok.splice(li, 1);
            })
          }
          onRename={(v) =>
            updatePlan((draft) => {
              draft.fazisok[pi].megnevezes = v;
            })
          }
          onNote={(v) =>
            updatePlan((draft) => {
              draft.fazisok[pi].megjegyzes = v;
            })
          }
          onDelete={() =>
            updatePlan((draft) => {
              draft.fazisok.splice(pi, 1);
            })
          }
        />
      ))}

      <button
        style={btn()}
        onClick={() =>
          updatePlan((draft) => {
            draft.fazisok.push({
              sorszam: draft.fazisok.length + 1,
              megnevezes: `${draft.fazisok.length + 1}. kezelés`,
              megjegyzes: '',
              sorok: [],
            });
          })
        }
      >
        + Új kezelési fázis
      </button>

      <Summary grand={grand} listTotal={listTotal} currency={currency} />
    </div>
  );
}

function Header({
  patientName,
  statusz,
  onPreview,
}: {
  patientName: string;
  statusz: Plan['statusz'];
  onPreview: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, color: t.navy }}>Kezelési terv</div>
        <div style={{ fontSize: 13, color: t.textMuted }}>
          {patientName || 'Új páciens'} · {statusz === 'VEGLEGES' ? 'véglegesítve' : 'piszkozat'}
        </div>
      </div>
      <button style={btn(true)} onClick={onPreview}>
        Előnézet
      </button>
    </div>
  );
}

function PhaseCard({
  phase,
  currency,
  nyelv,
  available,
  catName,
  frequent,
  fallbackTetelIds,
  total,
  canDelete,
  onAdd,
  onPatchLine,
  onRemoveLine,
  onRename,
  onNote,
  onDelete,
}: {
  phase: Fazis;
  currency: Penznem;
  nyelv: Nyelv;
  available: Tetel[];
  catName: (id: string) => string;
  frequent: Tetel[];
  fallbackTetelIds: Set<string>;
  total: number;
  canDelete: boolean;
  onAdd: (item: Tetel) => void;
  onPatchLine: (li: number, patch: Partial<Sor>) => void;
  onRemoveLine: (li: number) => void;
  onRename: (v: string) => void;
  onNote: (v: string) => void;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.line}`,
        borderRadius: t.radiusLg,
        padding: '14px 18px',
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <input
          value={phase.megnevezes}
          onChange={(e) => onRename(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            font: 'inherit',
            fontSize: 15,
            fontWeight: 600,
            color: t.navy,
            background: 'transparent',
            width: 320,
          }}
        />
        {canDelete && (
          <button style={btn()} onClick={onDelete}>
            Fázis törlése
          </button>
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
          fallback={fallbackTetelIds.has(l.tetelId)}
          onPatch={(p) => onPatchLine(li, p)}
          onRemove={() => onRemoveLine(li)}
        />
      ))}

      <ItemPicker
        available={available}
        catName={catName}
        currency={currency}
        nyelv={nyelv}
        onPick={onAdd}
      />

      {frequent.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {frequent.map((f) => (
            <button key={f.id} style={chip} onClick={() => onAdd(f)}>
              + {resolveNev(f.nev, nyelv).szoveg}
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

      <div
        style={{
          textAlign: 'right',
          fontSize: 13,
          marginTop: 10,
          paddingTop: 8,
          borderTop: `1px solid ${t.line}`,
        }}
      >
        Fázis összesen: <b>{formatMoney(total, currency)}</b>
      </div>
    </div>
  );
}

function LineRow({
  line,
  currency,
  fallback,
  onPatch,
  onRemove,
}: {
  line: Sor;
  currency: Penznem;
  fallback: boolean;
  onPatch: (patch: Partial<Sor>) => void;
  onRemove: () => void;
}) {
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
          {fallback && <HuChip />}
          {discount > 0 && (
            <span
              style={{
                fontSize: 11,
                marginLeft: 6,
                color: t.ok,
                background: '#EAF6F0',
                padding: '1px 5px',
                borderRadius: 4,
              }}
            >
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
          onChange={(e) => onPatch({ mennyiseg: Math.max(1, Number(e.target.value) || 1) })}
          style={{ ...input, textAlign: 'center' }}
        />

        <div style={{ fontSize: 12, color: t.textFaint, textAlign: 'right', paddingTop: 8 }}>
          {formatMoney(line.listaEgysegar, currency)}
        </div>

        <input
          type="number"
          value={line.tenylegesEgysegar}
          onChange={(e) => onPatch({ tenylegesEgysegar: Number(e.target.value) || 0 })}
          style={{
            ...input,
            textAlign: 'right',
            borderColor: discount || line.savos ? t.navy : t.line,
          }}
        />

        <div
          style={{
            fontSize: 13,
            textAlign: 'right',
            paddingTop: 8,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatMoney(line.tenylegesEgysegar * line.mennyiseg, currency)}
        </div>

        <button onClick={onRemove} style={{ ...btn(), padding: '0 8px', height: 30 }}>
          ×
        </button>
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
function ItemPicker({
  available,
  catName,
  currency,
  nyelv,
  onPick,
}: {
  available: Tetel[];
  catName: (id: string) => string;
  currency: Penznem;
  nyelv: Nyelv;
  onPick: (item: Tetel) => void;
}) {
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLInputElement>(null);

  // A kereső mindkét nyelven keres, mindig -- a doki magyar, magyarul gépel
  // akkor is, ha német ajánlatot állít össze. Csak a megjelenített és
  // snapshotolt név nyelvfüggő (lásd domain/nev.ts).
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const nq = norm(q);
    return available
      .filter((x) => norm(x.nev.hu).includes(nq) || norm(x.nev.de).includes(nq))
      .slice(0, 12);
  }, [q, available]);

  useEffect(() => setHi(0), [q]);

  function commit(item: Tetel) {
    onPick(item);
    setQ('');
    requestAnimationFrame(() => ref.current?.focus());
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHi((h) => (h + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit(results[hi]);
    } else if (e.key === 'Escape') {
      setQ('');
    }
  }

  let lastCat: string | null = null;

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
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 40,
            zIndex: 30,
            background: t.surface,
            border: `1px solid ${t.lineStrong}`,
            borderRadius: t.radiusLg,
            padding: 4,
            maxHeight: 280,
            overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(35,60,121,0.12)',
          }}
        >
          {results.map((r, i) => {
            const category = catName(r.kategoriaId);
            const header = category !== lastCat ? ((lastCat = category), category) : null;
            const rn = resolveNev(r.nev, nyelv);
            return (
              <div key={r.id}>
                {header && (
                  <div style={{ fontSize: 11, color: t.textFaint, padding: '6px 10px 2px' }}>
                    {header}
                  </div>
                )}
                <div
                  onMouseEnter={() => setHi(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(r);
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '7px 10px',
                    fontSize: 13,
                    cursor: 'pointer',
                    borderRadius: t.radius,
                    background: i === hi ? t.skyWash : 'transparent',
                  }}
                >
                  <span>
                    {rn.szoveg}
                    {rn.fallback && <HuChip />}
                  </span>
                  <span style={{ color: t.textFaint, whiteSpace: 'nowrap' }}>
                    {formatPrice(r.ar[currency], currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {results.length === 0 && q.trim() && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 40,
            zIndex: 30,
            background: available.length === 0 ? t.warnBg : t.surface,
            border: `1px solid ${available.length === 0 ? t.warn : t.lineStrong}`,
            borderRadius: t.radiusLg,
            padding: '10px 12px',
            fontSize: 12.5,
            color: available.length === 0 ? t.warn : t.textFaint,
          }}
        >
          {available.length === 0
            ? `Nincs találat. Ebben a pénznemben (${currency}) egyetlen aktív tétel sincs beárazva — az Árlistán tölthetők ki.`
            : 'Nincs találat.'}
        </div>
      )}
    </div>
  );
}

function HuChip() {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: t.warn,
        background: t.warnBg,
        padding: '1px 5px',
        borderRadius: 4,
        marginLeft: 6,
      }}
    >
      HU
    </span>
  );
}

function Summary({
  grand,
  listTotal,
  currency,
}: {
  grand: number;
  listTotal: number;
  currency: Penznem;
}) {
  const discount = listTotal - grand;
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.line}`,
        borderRadius: t.radiusLg,
        padding: '14px 18px',
        marginTop: 14,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}
    >
      <span style={{ fontSize: 14, color: t.textMuted }}>Mindösszesen</span>
      <div style={{ textAlign: 'right' }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: t.navy,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatMoney(grand, currency)}
        </div>
        {discount > 0 && (
          // Csak a szerkesztőben látszik. A nyomtatványon NEM (D9).
          <div style={{ fontSize: 12, color: t.ok }}>Kedvezmény: {formatMoney(discount, currency)}</div>
        )}
      </div>
    </div>
  );
}

const gridRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 84px 52px 100px 108px 108px 32px',
  gap: 8,
  alignItems: 'start',
};

const headStyle: CSSProperties = {
  fontSize: 11,
  color: t.textFaint,
  paddingBottom: 4,
};
