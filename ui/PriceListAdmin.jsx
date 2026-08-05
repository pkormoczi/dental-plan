import React, { useState, useMemo } from 'react';
import { t, formatMoney, formatPrice, norm } from './tokens';

/**
 * Árlista admin.
 *
 * Egy tábla, két ár oszlop — nem külön magyar és német nézet. Így egy
 * pillantás megmutatja, hol hiányzik az EUR ár, és a "Nincs EUR ár"
 * szűrő maga a német bevezetés munkalistája.
 *
 * A sor kinyitása adja a teljes szerkesztést, benne a kategória
 * legördülővel — ez a takarítás fő eszköze (a 11 árva tétel átmozgatása).
 *
 * Élesben: props.priceList = a gyökérmappa arlista.json-ja.
 */

const SAMPLE = {
  schemaVersion: 1,
  arlistaVerzio: '2026-07-01',
  kategoriak: [
    { id: 'k01', nev: { hu: 'Besorolatlan', de: null }, sorrend: 1 },
    { id: 'k02', nev: { hu: 'Tömések', de: null }, sorrend: 2 },
    { id: 'k03', nev: { hu: 'Gyökérkezelés', de: null }, sorrend: 3 },
    { id: 'k12', nev: { hu: 'Egyéb kezelések', de: null }, sorrend: 12 },
  ],
  tetelek: [
    { id: 't001', kategoriaId: 'k01', aktiv: true, gyakori: true, nev: { hu: 'Konzultáció/fél óránként', de: 'Beratung pro halbe Stunde' }, ar: { HUF: { tipus: 'FIX', ertek: 10000 }, EUR: { tipus: 'FIX', ertek: 2500 } } },
    { id: 't002', kategoriaId: 'k01', aktiv: true, gyakori: false, nev: { hu: 'Panoráma-, TeleRtg, Arcüregfelvétel', de: null }, ar: { HUF: { tipus: 'FIX', ertek: 9000 }, EUR: null } },
    { id: 't003', kategoriaId: 'k01', aktiv: true, gyakori: false, nev: { hu: 'CBCT', de: null }, ar: { HUF: { tipus: 'FIX', ertek: 24000 }, EUR: null } },
    { id: 't009', kategoriaId: 'k02', aktiv: true, gyakori: true, nev: { hu: 'Esztétikus tömés 3 felszín', de: null }, ar: { HUF: { tipus: 'FIX', ertek: 45000 }, EUR: null } },
    { id: 't010', kategoriaId: 'k02', aktiv: true, gyakori: false, nev: { hu: 'Esztétikus tömés 2felszin', de: null }, ar: { HUF: { tipus: 'FIX', ertek: 40000 }, EUR: null } },
    { id: 't014', kategoriaId: 'k03', aktiv: true, gyakori: false, nev: { hu: 'Fogbél megnyitás + gyógyszeres zárás', de: null }, ar: { HUF: { tipus: 'SAVOS', min: 35000, max: 55000 }, EUR: null } },
    { id: 't016', kategoriaId: 'k03', aktiv: true, gyakori: true, nev: { hu: 'Gyökértömés csatornaszámtól függően', de: null }, ar: { HUF: { tipus: 'SAVOS', min: 38000, max: 65000 }, EUR: null } },
    { id: 't111', kategoriaId: 'k12', aktiv: false, gyakori: false, nev: { hu: 'Dévitalisation', de: null }, ar: { HUF: { tipus: 'FIX', ertek: 12000 }, EUR: null } },
    { id: 't112', kategoriaId: 'k12', aktiv: false, gyakori: false, nev: { hu: 'Couronne zircon', de: null }, ar: { HUF: { tipus: 'FIX', ertek: 72000 }, EUR: null } },
    { id: 't115', kategoriaId: 'k12', aktiv: true, gyakori: false, nev: { hu: 'Hyrax készülék', de: null }, ar: { HUF: { tipus: 'FIX', ertek: 60000 }, EUR: null } },
  ],
};

const FILTERS = [
  ['all', 'Mind'],
  ['noeur', 'Nincs EUR ár'],
  ['range', 'Sávos ár'],
  ['off', 'Inaktív'],
  ['fav', 'Gyakori'],
];

export default function PriceListAdmin({ initial = SAMPLE }) {
  const [data, setData] = useState(initial);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null);

  function patchItem(id, patch) {
    setData((d) => ({
      ...d,
      tetelek: d.tetelek.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  }

  const keep = (x) => {
    if (q && !norm(x.nev.hu).includes(norm(q))) return false;
    if (filter === 'noeur') return !x.ar.EUR;
    if (filter === 'range') return x.ar.HUF?.tipus === 'SAVOS';
    if (filter === 'off') return !x.aktiv;
    if (filter === 'fav') return x.gyakori;
    return true;
  };

  const grouped = useMemo(() => {
    return data.kategoriak
      .slice()
      .sort((a, b) => a.sorrend - b.sorrend)
      .map((k) => ({
        cat: k,
        items: data.tetelek.filter((x) => x.kategoriaId === k.id && keep(x)),
      }))
      .filter((g) => g.items.length);
  }, [data, q, filter]);

  const missingEur = data.tetelek.filter((x) => !x.ar.EUR).length;
  const shown = grouped.reduce((s, g) => s + g.items.length, 0);

  return (
    <div style={{ background: t.page, minHeight: '100vh', padding: 24, fontFamily: t.font, color: t.text }}>
      <div style={{ maxWidth: 940, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: t.navy }}>Árlista</div>
          <div style={{ fontSize: 12, color: t.textMuted, fontFamily: t.mono }}>
            verzió {data.arlistaVerzio}
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
                background: filter === k ? t.skyWash : t.surface,
                borderColor: filter === k ? t.navy : t.line,
                color: filter === k ? t.navy : t.textMuted,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {grouped.map(({ cat, items }) => (
          <div key={cat.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '16px 0 4px' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.navy }}>{cat.nev.hu}</span>
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
              <div key={it.id} style={{ borderTop: `1px solid ${t.line}`, opacity: it.aktiv ? 1 : 0.5 }}>
                <div style={{ ...row, padding: '5px 0', cursor: 'pointer' }}
                     onClick={() => setOpen(open === it.id ? null : it.id)}>
                  <button
                    aria-label="Gyakori tétel"
                    onClick={(e) => { e.stopPropagation(); patchItem(it.id, { gyakori: !it.gyakori }); }}
                    style={{ ...iconBtn, color: it.gyakori ? t.warn : t.textFaint }}
                  >
                    {it.gyakori ? '★' : '☆'}
                  </button>

                  <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {it.nev.hu}
                    {it.ar.HUF?.tipus === 'SAVOS' && (
                      <span style={{ fontSize: 11, color: t.warn, marginLeft: 6 }}>sávos</span>
                    )}
                    {!it.nev.de && (
                      <span style={{ fontSize: 11, color: t.textFaint, marginLeft: 6 }}>nincs DE név</span>
                    )}
                  </div>

                  <div style={{ fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {formatPrice(it.ar.HUF, 'HUF')}
                  </div>

                  <div style={{
                    fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                    color: it.ar.EUR ? t.text : t.warn,
                  }}>
                    {it.ar.EUR ? formatPrice(it.ar.EUR, 'EUR') : '—'}
                  </div>

                  <button
                    aria-label="Aktív"
                    onClick={(e) => { e.stopPropagation(); patchItem(it.id, { aktiv: !it.aktiv }); }}
                    style={iconBtn}
                  >
                    {it.aktiv ? '👁' : '🚫'}
                  </button>
                </div>

                {open === it.id && (
                  <ItemEditor
                    item={it}
                    categories={data.kategoriak}
                    onPatch={(p) => patchItem(it.id, p)}
                  />
                )}
              </div>
            ))}
          </div>
        ))}

        <div style={{
          borderTop: `1px solid ${t.lineStrong}`, marginTop: 16, paddingTop: 12,
          display: 'flex', justifyContent: 'space-between', fontSize: 12, color: t.textMuted,
        }}>
          <span>
            {shown} / {data.tetelek.length} tétel látszik · {missingEur} tételnél hiányzik az EUR ár
          </span>
          <button style={btn(true)}>+ Új tétel</button>
        </div>
      </div>
    </div>
  );
}

/** Kinyitott sor — itt van minden mező, köztük a kategória-mozgatás. */
function ItemEditor({ item, categories, onPatch }) {
  const savos = item.ar.HUF?.tipus === 'SAVOS';

  function setPrice(cur, patch) {
    onPatch({ ar: { ...item.ar, [cur]: { ...(item.ar[cur] || {}), ...patch } } });
  }

  function toggleType() {
    const next = savos
      ? { tipus: 'FIX', ertek: item.ar.HUF.min }
      : { tipus: 'SAVOS', min: item.ar.HUF?.ertek || 0, max: item.ar.HUF?.ertek || 0 };
    onPatch({ ar: { ...item.ar, HUF: next } });
  }

  return (
    <div style={{ background: t.surfaceAlt, borderTop: `1px solid ${t.line}`, padding: '12px 14px 14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <Field label="Megnevezés (magyar)">
          <input value={item.nev.hu} style={input}
                 onChange={(e) => onPatch({ nev: { ...item.nev, hu: e.target.value } })} />
        </Field>
        <Field label="Bezeichnung (német)">
          <input value={item.nev.de || ''} placeholder="még nincs megadva" style={input}
                 onChange={(e) => onPatch({ nev: { ...item.nev, de: e.target.value || null } })} />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <Field label="Kategória">
          <select value={item.kategoriaId} style={input}
                  onChange={(e) => onPatch({ kategoriaId: e.target.value })}>
            {categories.map((k) => (
              <option key={k.id} value={k.id}>{k.nev.hu}</option>
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
            value={item.ar.EUR?.ertek ?? ''}
            placeholder="—"
            style={input}
            onChange={(e) =>
              onPatch({
                ar: {
                  ...item.ar,
                  EUR: e.target.value === '' ? null : { tipus: 'FIX', ertek: +e.target.value },
                },
              })
            }
          />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
        {savos ? (
          <>
            <Field label="HUF ár — tól">
              <input type="number" value={item.ar.HUF.min} style={input}
                     onChange={(e) => setPrice('HUF', { min: +e.target.value })} />
            </Field>
            <Field label="HUF ár — ig">
              <input type="number" value={item.ar.HUF.max} style={input}
                     onChange={(e) => setPrice('HUF', { max: +e.target.value })} />
            </Field>
          </>
        ) : (
          <Field label="HUF ár">
            <input type="number" value={item.ar.HUF?.ertek ?? 0} style={input}
                   onChange={(e) => setPrice('HUF', { ertek: +e.target.value })} />
          </Field>
        )}
      </div>

      <div style={{ fontSize: 11, color: t.textFaint, marginTop: 10, fontFamily: t.mono }}>
        id: {item.id} — soha nem használjuk újra, a régi tervek erre hivatkoznak
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 3 }}>{label}</div>
      {children}
    </label>
  );
}

const row = {
  display: 'grid',
  gridTemplateColumns: '26px 1fr 120px 110px 34px',
  gap: 10,
  alignItems: 'center',
};

const headStyle = { fontSize: 11, color: t.textFaint, paddingBottom: 3 };

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
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const iconBtn = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  padding: 0,
  lineHeight: 1,
};

function btn(primary) {
  return {
    height: 30,
    fontSize: 12.5,
    padding: '0 12px',
    borderRadius: t.radius,
    cursor: 'pointer',
    fontFamily: 'inherit',
    border: `1px solid ${primary ? t.navy : t.lineStrong}`,
    background: primary ? t.navy : t.surface,
    color: primary ? '#fff' : t.text,
  };
}
