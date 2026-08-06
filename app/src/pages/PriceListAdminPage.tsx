// Árlista admin -- portolva ui/PriceListAdmin.jsx-ből.
//
// Egy tábla, két ár oszlop -- nem külön magyar és német nézet. Így egy
// pillantás megmutatja, hol hiányzik az EUR ár, és a "Nincs EUR ár" szűrő
// maga a német bevezetés munkalistája.
//
// A sor kinyitása adja a teljes szerkesztést, benne a kategória
// legördülővel -- ez a takarítás fő eszköze (a 11 árva tétel átmozgatása,
// lásd docs/06-arlista-import.md). Kategória hozzáadás/átnevezés NINCS a
// prototípusban sem -- csak a meglévők közötti mozgatás.

import { useMemo, useState } from 'react';
import { t } from '../design/tokens';
import { formatPrice } from '../domain/money';
import { nextTetelId } from '../domain/priceListIds';
import { norm } from '../domain/search';
import type { Ar, Kategoria, PriceList, Tetel } from '../domain/types';
import { useAppState } from '../state/AppState';

type FilterKey = 'all' | 'noeur' | 'range' | 'off' | 'fav';

const FILTERS: Array<[FilterKey, string]> = [
  ['all', 'Mind'],
  ['noeur', 'Nincs EUR ár'],
  ['range', 'Sávos ár'],
  ['off', 'Inaktív'],
  ['fav', 'Gyakori'],
];

export default function PriceListAdminPage() {
  const { priceList, savePriceList } = useAppState();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [open, setOpen] = useState<string | null>(null);

  function commit(next: PriceList) {
    void savePriceList({ ...next, modositva: new Date().toISOString().slice(0, 10) });
  }

  function patchItem(id: string, patch: Partial<Tetel>) {
    commit({
      ...priceList,
      tetelek: priceList.tetelek.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    });
  }

  function addNewItem() {
    const id = nextTetelId(priceList.tetelek);
    const newItem: Tetel = {
      id,
      kategoriaId: priceList.kategoriak[0]?.id ?? '',
      sorrend: priceList.tetelek.length + 1,
      aktiv: true,
      gyakori: false,
      nev: { hu: 'Új tétel', de: null },
      ar: { HUF: { tipus: 'FIX', ertek: 0 }, EUR: null },
    };
    commit({ ...priceList, tetelek: [...priceList.tetelek, newItem] });
    setFilter('all');
    setQ('');
    setOpen(id);
  }

  const keep = (x: Tetel): boolean => {
    if (q && !norm(x.nev.hu).includes(norm(q))) return false;
    if (filter === 'noeur') return !x.ar.EUR;
    if (filter === 'range') return x.ar.HUF?.tipus === 'SAVOS';
    if (filter === 'off') return !x.aktiv;
    if (filter === 'fav') return x.gyakori;
    return true;
  };

  const grouped = useMemo(() => {
    return priceList.kategoriak
      .slice()
      .sort((a, b) => a.sorrend - b.sorrend)
      .map((k) => ({
        cat: k,
        items: priceList.tetelek.filter((x) => x.kategoriaId === k.id && keep(x)),
      }))
      .filter((g) => g.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceList, q, filter]);

  const missingEur = priceList.tetelek.filter((x) => !x.ar.EUR).length;
  const shown = grouped.reduce((s, g) => s + g.items.length, 0);

  return (
    <div style={{ maxWidth: 940, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600, color: t.brand }}>Árlista</div>
        <div style={{ fontSize: 12, color: t.textMuted, fontFamily: t.mono }}>
          verzió {priceList.arlistaVerzio}
        </div>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Keresés a tételek között…"
        style={{ ...input, height: 36, marginBottom: 10 }}
      />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        {FILTERS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            style={{
              ...chip,
              background: filter === k ? t.accentWash : t.surface,
              borderColor: filter === k ? t.brand : t.line,
              color: filter === k ? t.brand : t.textMuted,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {grouped.map(({ cat, items }) => (
        <div key={cat.id}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '16px 0 4px',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: t.brand }}>{cat.nev.hu}</span>
            <span style={{ fontSize: 11, color: t.textFaint }}>{items.length} tétel</span>
          </div>

          <div style={{ ...row, ...headStyle }}>
            <div />
            <div>Megnevezés</div>
            <div style={{ textAlign: 'right' }}>Ár (HUF)</div>
            <div style={{ textAlign: 'right' }}>Ár (EUR)</div>
            <div />
          </div>

          {items.map((it) => (
            <div
              key={it.id}
              style={{ borderTop: `1px solid ${t.line}`, opacity: it.aktiv ? 1 : 0.5 }}
            >
              <div
                style={{ ...row, padding: '5px 0', cursor: 'pointer' }}
                onClick={() => setOpen(open === it.id ? null : it.id)}
              >
                <button
                  aria-label="Gyakori tétel"
                  onClick={(e) => {
                    e.stopPropagation();
                    patchItem(it.id, { gyakori: !it.gyakori });
                  }}
                  style={{ ...iconBtn, color: it.gyakori ? t.warn : t.textFaint }}
                >
                  {it.gyakori ? '★' : '☆'}
                </button>

                <div
                  style={{
                    fontSize: 13,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {it.nev.hu}
                  {it.ar.HUF?.tipus === 'SAVOS' && (
                    <span style={{ fontSize: 11, color: t.warn, marginLeft: 6 }}>sávos</span>
                  )}
                  {!it.nev.de && (
                    <span style={{ fontSize: 11, color: t.textFaint, marginLeft: 6 }}>
                      nincs DE név
                    </span>
                  )}
                </div>

                <div
                  style={{ fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatPrice(it.ar.HUF, 'HUF')}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    color: it.ar.EUR ? t.text : t.warn,
                  }}
                >
                  {it.ar.EUR ? formatPrice(it.ar.EUR, 'EUR') : '—'}
                </div>

                <button
                  aria-label="Aktív"
                  onClick={(e) => {
                    e.stopPropagation();
                    patchItem(it.id, { aktiv: !it.aktiv });
                  }}
                  style={iconBtn}
                >
                  {it.aktiv ? '👁' : '🚫'}
                </button>
              </div>

              {open === it.id && (
                <ItemEditor
                  item={it}
                  categories={priceList.kategoriak}
                  onPatch={(p) => patchItem(it.id, p)}
                />
              )}
            </div>
          ))}
        </div>
      ))}

      <div
        style={{
          borderTop: `1px solid ${t.lineStrong}`,
          marginTop: 16,
          paddingTop: 12,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: t.textMuted,
        }}
      >
        <span>
          {shown} / {priceList.tetelek.length} tétel látszik · {missingEur} tételnél hiányzik az
          EUR ár
        </span>
        <button style={btn(true)} onClick={addNewItem}>
          + Új tétel
        </button>
      </div>
    </div>
  );
}

/** Kinyitott sor -- itt van minden mező, köztük a kategória-mozgatás. */
function ItemEditor({
  item,
  categories,
  onPatch,
}: {
  item: Tetel;
  categories: Kategoria[];
  onPatch: (patch: Partial<Tetel>) => void;
}) {
  const hufAr = item.ar.HUF ?? null;
  const savos = hufAr?.tipus === 'SAVOS';

  function toggleType() {
    const next: Ar =
      savos && hufAr?.tipus === 'SAVOS'
        ? { tipus: 'FIX', ertek: hufAr.min }
        : { tipus: 'SAVOS', min: hufAr?.tipus === 'FIX' ? hufAr.ertek : 0, max: hufAr?.tipus === 'FIX' ? hufAr.ertek : 0 };
    onPatch({ ar: { ...item.ar, HUF: next } });
  }

  function setFixPrice(ertek: number) {
    onPatch({ ar: { ...item.ar, HUF: { tipus: 'FIX', ertek } } });
  }

  function setSavosPrice(patch: Partial<{ min: number; max: number }>) {
    const base = hufAr?.tipus === 'SAVOS' ? hufAr : { tipus: 'SAVOS' as const, min: 0, max: 0 };
    onPatch({ ar: { ...item.ar, HUF: { ...base, ...patch } } });
  }

  function setEur(ertek: number | null) {
    onPatch({ ar: { ...item.ar, EUR: ertek == null ? null : { tipus: 'FIX', ertek } } });
  }

  return (
    <div
      style={{ background: t.surfaceAlt, borderTop: `1px solid ${t.line}`, padding: '12px 14px 14px' }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <Field label="Megnevezés (magyar)">
          <input
            value={item.nev.hu}
            style={input}
            onChange={(e) => onPatch({ nev: { ...item.nev, hu: e.target.value } })}
          />
        </Field>
        <Field label="Bezeichnung (német)">
          <input
            value={item.nev.de || ''}
            placeholder="még nincs megadva"
            style={input}
            onChange={(e) => onPatch({ nev: { ...item.nev, de: e.target.value || null } })}
          />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <Field label="Kategória">
          <select
            value={item.kategoriaId}
            style={input}
            onChange={(e) => onPatch({ kategoriaId: e.target.value })}
          >
            {categories.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nev.hu}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Ártípus">
          <button onClick={toggleType} style={{ ...btn(), width: '100%' }}>
            {savos ? 'Sávos → fix' : 'Fix → sávos'}
          </button>
        </Field>

        <Field label="EUR ár (cent)">
          <input
            type="number"
            value={item.ar.EUR?.tipus === 'FIX' ? item.ar.EUR.ertek : ''}
            placeholder="—"
            style={input}
            onChange={(e) => setEur(e.target.value === '' ? null : Number(e.target.value))}
          />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
        {savos && hufAr?.tipus === 'SAVOS' ? (
          <>
            <Field label="HUF ár — tól">
              <input
                type="number"
                value={hufAr.min}
                style={input}
                onChange={(e) => setSavosPrice({ min: Number(e.target.value) })}
              />
            </Field>
            <Field label="HUF ár — ig">
              <input
                type="number"
                value={hufAr.max}
                style={input}
                onChange={(e) => setSavosPrice({ max: Number(e.target.value) })}
              />
            </Field>
          </>
        ) : (
          <Field label="HUF ár">
            <input
              type="number"
              value={hufAr?.tipus === 'FIX' ? hufAr.ertek : 0}
              style={input}
              onChange={(e) => setFixPrice(Number(e.target.value))}
            />
          </Field>
        )}
      </div>

      <div style={{ fontSize: 11, color: t.textFaint, marginTop: 10, fontFamily: t.mono }}>
        id: {item.id} — soha nem használjuk újra, a régi tervek erre hivatkoznak
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 3 }}>{label}</div>
      {children}
    </label>
  );
}

const row: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '26px 1fr 120px 110px 34px',
  gap: 10,
  alignItems: 'center',
};

const headStyle: React.CSSProperties = { fontSize: 11, color: t.textFaint, paddingBottom: 3 };

const input: React.CSSProperties = {
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

const chip: React.CSSProperties = {
  fontSize: 12,
  padding: '4px 10px',
  border: `1px solid ${t.line}`,
  borderRadius: 99,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const iconBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  padding: 0,
  lineHeight: 1,
};

function btn(primary?: boolean): React.CSSProperties {
  return {
    height: 30,
    fontSize: 12.5,
    padding: '0 12px',
    borderRadius: t.radius,
    cursor: 'pointer',
    fontFamily: 'inherit',
    border: `1px solid ${primary ? t.ink : t.lineStrong}`,
    background: primary ? t.ink : t.surface,
    color: primary ? t.onBrand : t.text,
  };
}
