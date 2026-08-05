import React, { useState } from 'react';
import { t, formatMoney, parseTeeth } from './tokens';

/**
 * A nyomtatvány három oldala. Ez HTML előnézet — a végleges PDF-et
 * @react-pdf/renderer generálja ugyanezzel az elrendezéssel.
 *
 * FONTOS a PDF-nél: regisztrálni kell egy Unicode fontot (Inter, Source
 * Sans, Noto Sans). A @react-pdf/renderer beépített Helveticája nem
 * tartalmazza az 'ő' és 'ű' karaktereket — ez csak a végleges PDF-en
 * látszik, a HTML előnézeten nem.
 *
 * A "csak ajánlat" kapcsoló elhagyja a 3. oldalt: a hazavitt példány így
 * nem egy aláírandó szerződés.
 */

const DEMO = {
  tervId: 'a3f9c1',
  verzio: 1,
  keltezes: '2026-08-05',
  ervenyesIg: '2026-11-05',
  arlistaVerzio: '2026-07-01',
  orvos: 'Dr. Mándoki István',
  penznem: 'HUF',
  paciens: {
    nev: 'Kovács János',
    szuletesiIdo: '1978-03-14',
    lakcim: '1113 Budapest, Bartók Béla út 42. 2/5',
    telefon: '+36 30 123 4567',
    email: 'kovacs.janos@example.hu',
    taj: '123 456 789',
    kiskoru: false,
  },
  fazisok: [
    {
      megnevezes: '1. kezelés — gyökérkezelés és tömések',
      megjegyzes: '',
      sorok: [
        { nevSnapshot: 'Esztétikus tömés 3 felszín', fogak: '16, 17, 26', mennyiseg: 3, tenylegesEgysegar: 45000, savos: false },
        { nevSnapshot: 'Gyökértömés csatornaszámtól függően', fogak: '46', mennyiseg: 4, tenylegesEgysegar: 55000, savos: true },
        { nevSnapshot: 'Fogeltávolítás', fogak: '38', mennyiseg: 1, tenylegesEgysegar: 25000, savos: false },
      ],
    },
    {
      megnevezes: '2. kezelés — implantáció és pótlás',
      megjegyzes: 'Az implantáció beépülési ideje után, kb. 3 hónappal.',
      sorok: [
        { nevSnapshot: 'Neodent implantátum', fogak: '36', mennyiseg: 1, tenylegesEgysegar: 170000, savos: false },
        { nevSnapshot: 'Zirkonkerámia korona fogra', fogak: '35, 36', mennyiseg: 2, tenylegesEgysegar: 115000, savos: false },
      ],
    },
  ],
};

const CLINIC = {
  nev: 'Mándoki Dental Kft.',
  cim: '1114 Budapest, Móricz Zsigmond körtér 15. 3/8',
  telefon: '+36 1 234 5678',
  email: 'rendelo@mandokidental.hu',
  adoszam: '00000000-0-00',
  cegjegyzekszam: '01-09-000000',
};

const HU_DATE = (iso) =>
  new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });

export default function PrintPreview({ plan = DEMO }) {
  const [offerOnly, setOfferOnly] = useState(false);
  const pages = offerOnly ? 2 : 3;

  const phaseTotal = (p) => p.sorok.reduce((s, l) => s + l.tenylegesEgysegar * l.mennyiseg, 0);
  const grand = plan.fazisok.reduce((s, p) => s + phaseTotal(p), 0);
  const hasRange = plan.fazisok.some((p) => p.sorok.some((l) => l.savos));
  const teeth = plan.fazisok.flatMap((p) => p.sorok.flatMap((l) => parseTeeth(l.fogak).teeth));

  return (
    <div style={{ background: t.page, minHeight: '100vh', padding: 24, fontFamily: t.font }}>
      <div style={{ maxWidth: 794, margin: '0 auto' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 12, color: t.text }}>
          <input type="checkbox" checked={offerOnly} onChange={(e) => setOfferOnly(e.target.checked)} />
          Csak ajánlat — a nyilatkozat és aláírás oldal nélkül
        </label>

        {/* ---------- 1. oldal ---------- */}
        <Page>
          <MainHeader plan={plan} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 28px', margin: '16px 0 20px', fontSize: 11.5 }}>
            <Kv k="Név" v={plan.paciens.nev} />
            <Kv k="Telefon" v={plan.paciens.telefon} />
            <Kv k="Született" v={plan.paciens.szuletesiIdo} />
            <Kv k="E-mail" v={plan.paciens.email} />
            <Kv k="TAJ" v={plan.paciens.taj} />
            <span />
            <div style={{ gridColumn: '1 / 3' }}><Kv k="Lakcím" v={plan.paciens.lakcim} /></div>
          </div>

          {plan.fazisok.map((p, i) => (
            <PhaseTable key={i} phase={p} total={phaseTotal(p)} currency={plan.penznem} />
          ))}

          {hasRange && (
            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
              * A csillaggal jelölt tételek ára a kezelés során derül ki véglegesen,
              a megadott ár becslés.
            </div>
          )}

          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', borderTop: `1px solid ${t.line}`, paddingTop: 14 }}>
            {teeth.length > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 6 }}>Érintett fogak</div>
                <ToothChart teeth={teeth} />
              </div>
            )}
            <div style={{ width: teeth.length ? 250 : '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
                <span style={{ color: t.textMuted }}>Kezelések összesen</span>
                <span>{formatMoney(grand, plan.penznem)}</span>
              </div>
              {/* Kedvezmény sor szándékosan NINCS (D9). */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                marginTop: 6, paddingTop: 8, borderTop: `1.5px solid ${t.navy}`,
                fontSize: 15, fontWeight: 600, color: t.navy,
              }}>
                <span>Fizetendő</span>
                <span>{formatMoney(grand, plan.penznem)}</span>
              </div>
              <div style={{ fontSize: 10, color: t.textMuted, marginTop: 8, lineHeight: 1.5 }}>
                Az ajánlat <b>{HU_DATE(plan.ervenyesIg)}-ig</b> érvényes.<br />
                Az árak tartalmazzák az anyagköltséget.
              </div>
            </div>
          </div>

          <Footer plan={plan} page={1} pages={pages} />
        </Page>

        {/* ---------- 2. oldal ---------- */}
        <Page>
          <MiniHeader plan={plan} />
          <h2 style={h2}>Fizetési feltételek</h2>
          <ul style={{ fontSize: 11.5, lineHeight: 1.7, paddingLeft: 18, color: t.text }}>
            <li>Fogtechnikai munkát nem tartalmazó kezelésnél az elvégzett munka
                ellenértéke alkalmanként, azonnal fizetendő.</li>
            <li>Fogtechnikai munkát tartalmazó kezelésnél a kezelési összeg 50%-a a
                munka megkezdésekor fizetendő; ez a feltétele a technikus felé való
                továbbításnak. A fennmaradó rész a munka átadásakor fizetendő.</li>
            <li>A munka átadásának feltétele a kiegyenlített számla.</li>
            <li>Fizetési mód: készpénz, egészségpénztári kártya, bankkártya.</li>
          </ul>
          <Footer plan={plan} page={2} pages={pages} />
        </Page>

        {/* ---------- 3. oldal ---------- */}
        {!offerOnly && (
          <Page>
            <MiniHeader plan={plan} />
            <h2 style={h2}>Nyilatkozat</h2>
            <p style={{ fontSize: 10, lineHeight: 1.6, color: t.text }}>
              A nyilatkozat szövege a <code>sablonok/nyilatkozat-hu-v1.md</code> fájlból
              jön. A tervben tárolt <code>sablonVerzio</code> mondja meg, melyik
              szövegváltozat volt érvényes az aláíráskor.
            </p>

            <div style={{ marginTop: 40, fontSize: 11.5 }}>
              <div style={{ marginBottom: 30 }}>Budapest, {HU_DATE(plan.keltezes)}</div>
              <div style={{ display: 'flex', gap: 60 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: t.textMuted, marginBottom: 34 }}>Megbízott:</div>
                  <div style={{ borderTop: `1px solid ${t.text}`, paddingTop: 4 }}>{plan.orvos}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: t.textMuted, marginBottom: 34 }}>Megrendelő:</div>
                  <div style={{ borderTop: `1px solid ${t.text}`, paddingTop: 4 }}>{plan.paciens.nev}</div>
                </div>
              </div>

              {/* Csak kiskorúnál jelenik meg — az eredeti Excel mindenkinek kinyomtatta. */}
              {plan.paciens.kiskoru && (
                <div style={{ marginTop: 34, fontSize: 10, color: t.textMuted }}>
                  Cselekvőképesség hiányában, vagy korlátozott cselekvőképesség esetén a
                  beteg helyett CSAK a törvényes képviselő írhatja alá.
                </div>
              )}
            </div>

            <Footer plan={plan} page={3} pages={pages} />
          </Page>
        )}
      </div>
    </div>
  );
}

function Page({ children }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${t.lineStrong}`,
      width: 794, minHeight: 1123, boxSizing: 'border-box',
      padding: '48px 56px 40px', marginBottom: 18,
      position: 'relative', color: t.text,
    }}>
      {children}
    </div>
  );
}

function MainHeader({ plan }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  paddingBottom: 14, borderBottom: `1.5px solid ${t.navy}` }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <LogoSlot w={92} h={30} />
        <div style={{ borderLeft: `2px solid ${t.sky}`, paddingLeft: 12, fontSize: 10.5,
                      color: t.textMuted, lineHeight: 1.5 }}>
          {CLINIC.cim}<br />{CLINIC.telefon} · {CLINIC.email}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.navy }}>Kezelési terv és árajánlat</div>
        <div style={{ fontSize: 10, color: t.textMuted, fontFamily: t.mono, marginTop: 2 }}>
          {plan.tervId} · v{plan.verzio} · {plan.keltezes}
        </div>
      </div>
    </div>
  );
}

function MiniHeader({ plan }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: 8, borderBottom: `1px solid ${t.lineStrong}`, marginBottom: 20 }}>
      <LogoSlot w={62} h={20} />
      <div style={{ fontSize: 10, color: t.textMuted }}>
        Kezelési terv · {plan.paciens.nev}
      </div>
    </div>
  );
}

/** Fekvő lockup, átlátszó PNG, 600 dpi-n raszterizálva. */
function LogoSlot({ w, h }) {
  return (
    <div style={{
      width: w, height: h, border: `1px dashed ${t.lineStrong}`, borderRadius: 3,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, color: t.textFaint, background: t.surfaceAlt,
    }}>
      logó
    </div>
  );
}

function PhaseTable({ phase, total, currency }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: t.navy, marginBottom: 5 }}>
        {phase.megnevezes}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 11.5 }}>
        <thead>
          <tr style={{ fontSize: 10, color: t.textMuted, borderBottom: `1px solid ${t.lineStrong}` }}>
            <th style={{ ...th, textAlign: 'left' }}>Beavatkozás</th>
            <th style={{ ...th, textAlign: 'left', width: 88 }}>Fog</th>
            <th style={{ ...th, textAlign: 'center', width: 34 }}>Db</th>
            <th style={{ ...th, textAlign: 'right', width: 82 }}>Egységár</th>
            <th style={{ ...th, textAlign: 'right', width: 90 }}>Összeg</th>
          </tr>
        </thead>
        <tbody>
          {phase.sorok.map((l, i) => (
            <tr key={i}>
              <td style={td}>{l.nevSnapshot}{l.savos && ' *'}</td>
              <td style={td}>{l.fogak}</td>
              <td style={{ ...td, textAlign: 'center' }}>{l.mennyiseg}</td>
              <td style={{ ...td, textAlign: 'right' }}>{formatMoney(l.tenylegesEgysegar, currency)}</td>
              <td style={{ ...td, textAlign: 'right' }}>{formatMoney(l.tenylegesEgysegar * l.mennyiseg, currency)}</td>
            </tr>
          ))}
          <tr style={{ borderTop: `1px solid ${t.line}` }}>
            <td colSpan={4} style={{ ...td, textAlign: 'right', color: t.textMuted, paddingRight: 8 }}>
              Fázis összesen
            </td>
            <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{formatMoney(total, currency)}</td>
          </tr>
        </tbody>
      </table>
      {phase.megjegyzes && (
        <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4 }}>
          Megjegyzés: {phase.megjegyzes}
        </div>
      )}
    </div>
  );
}

/** 32 maradó fog, kvadránsonként elválasztva, SZÁMOZÁS NÉLKÜL. */
function ToothChart({ teeth }) {
  const set = new Set(teeth);
  const rows = [
    ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'],
    ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'],
  ];
  return (
    <svg viewBox="0 0 286 66" style={{ width: '100%', maxWidth: 286 }} role="img" aria-label="Érintett fogak">
      {rows.map((r, ri) =>
        r.map((code, ci) => (
          <rect
            key={code}
            x={ci * 16 + (ci >= 8 ? 14 : 0)}
            y={ri * 34 + 4}
            width={14} height={20} rx={3}
            fill={set.has(code) ? t.sky : '#EDEFF3'}
            stroke={set.has(code) ? t.navy : 'none'}
            strokeWidth={0.6}
          />
        ))
      )}
    </svg>
  );
}

function Footer({ plan, page, pages }) {
  return (
    <div style={{
      position: 'absolute', left: 56, right: 56, bottom: 32,
      borderTop: `1px solid ${t.line}`, paddingTop: 8,
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
      fontSize: 9, color: t.textFaint, lineHeight: 1.5,
    }}>
      <div>
        {CLINIC.nev} · {CLINIC.cim}<br />
        Adószám: {CLINIC.adoszam} · Cégjegyzékszám: {CLINIC.cegjegyzekszam}
      </div>
      <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
        {plan.paciens.nev} · {plan.tervId}<br />
        árlista {plan.arlistaVerzio} · {page} / {pages}
      </div>
    </div>
  );
}

function Kv({ k, v }) {
  return (
    <div>
      <span style={{ color: t.textMuted, display: 'inline-block', width: 78 }}>{k}</span>
      {v}
    </div>
  );
}

const th = { fontWeight: 400, padding: '3px 0' };
const td = { padding: '4px 0' };
const h2 = { fontSize: 14, fontWeight: 600, color: t.navy, margin: '0 0 10px' };
