// Páciens adatlap -- docs/03-funkcionalis-spec.md "2. Páciens adatlap".
//
// Csak a név kötelező (ebből képződik a mappanév). A többi hiánya
// véglegesítéskor figyelmeztetést ad, de nem blokkol -- itt sincs
// kényszerített kitöltés, csak a "Tovább" gomb jelzi, ha a név üres.
//
// D21: itt dől el a terv nyelve és pénzneme -- itt derül ki a német páciens
// ténye. Mindkettő az első mentés után fagy (D4), lásd a `locked` ágat.

import { useNavigate } from 'react-router-dom';
import ChipGroup from '../components/ChipGroup';
import { sablonVerzioFor } from '../domain/blankPlan';
import { lefedettseg } from '../domain/coverage';
import { resolveNev } from '../domain/nev';
import type { Nyelv, Penznem } from '../domain/types';
import { t } from '../design/tokens';
import { btn, card, input } from '../design/ui';
import { useAppState } from '../state/AppState';

export default function PatientPage() {
  const { plan, setPlan, settings, priceList } = useAppState();
  const navigate = useNavigate();
  const paciens = plan.paciens;

  function patch(fields: Partial<typeof paciens>) {
    setPlan((prev) => ({ ...prev, paciens: { ...prev.paciens, ...fields } }));
  }

  const nameMissing = !paciens.nev.trim();

  // A kártya csak akkor látszik, ha a német engedélyezve van -- vagy ha a
  // piszkozat már németül indult, hogy egy időközben kikapcsolt kapcsoló
  // ne tegye szerkeszthetetlenül némává egy folyamatban lévő német tervet.
  const showLangCard = settings.nemetEngedelyezve || plan.nyelv === 'de';
  // A mentett terv nyelve/pénzneme nem módosítható (D4) -- a `tervId` a jó
  // diszkriminátor, nem a `statusz`: egy VEGLEGES tervet újra meg lehet
  // nyitni (Korábbi tervek), hogy egy újabb verzió készüljön belőle, a
  // tervId ilyenkor is kitöltött marad.
  const locked = plan.tervId !== '';
  const cov = lefedettseg(priceList, plan.penznem);
  const sorokSzama = plan.fazisok.reduce((n, f) => n + f.sorok.length, 0);

  function changeNyelv(nyelv: Nyelv) {
    if (nyelv === plan.nyelv) return;
    if (
      sorokSzama > 0 &&
      !confirm(
        `A tervben már ${sorokSzama} tétel szerepel. A nyelv váltásakor a tételnevek ` +
          `újra rögzülnek az új nyelven. Folytatod?`,
      )
    ) {
      return;
    }
    setPlan((prev) => {
      const next = structuredClone(prev);
      next.nyelv = nyelv;
      next.sablonVerzio = sablonVerzioFor(nyelv);
      for (const f of next.fazisok) {
        for (const s of f.sorok) {
          const tetel = priceList.tetelek.find((x) => x.id === s.tetelId);
          if (tetel) s.nevSnapshot = resolveNev(tetel.nev, nyelv).szoveg;
        }
      }
      return next;
    });
  }

  function changePenznem(penznem: Penznem) {
    if (penznem === plan.penznem) return;
    // A meglévő sorok ára a JELENLEGI pénznem alapegységében van rögzítve
    // (HUF forint, EUR cent, lásd domain/money.ts) -- pénznemváltás nem
    // átváltás, hanem a számok újraértelmezése lenne rossz mértékegységben.
    // Ezért a sorok törlődnek, nem "áthidalódnak".
    if (
      sorokSzama > 0 &&
      !confirm(
        `A tervben már ${sorokSzama} tétel szerepel, a jelenlegi pénznemben (${plan.penznem}) ` +
          `rögzített árral. Pénznemváltáskor ezek a sorok törlődnek, hogy ne maradjon rossz ` +
          `pénznemben rögzített ár a tervben. Folytatod?`,
      )
    ) {
      return;
    }
    setPlan((prev) => {
      const next = structuredClone(prev);
      next.penznem = penznem;
      if (sorokSzama > 0) {
        for (const f of next.fazisok) f.sorok = [];
      }
      return next;
    });
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18, color: t.navy, marginBottom: 16 }}>Páciens adatlap</h1>

      {showLangCard && (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.navy, marginBottom: 10 }}>
            Az ajánlat nyelve és pénzneme
          </div>

          {locked ? (
            <div style={{ fontSize: 13 }}>
              {plan.nyelv === 'de' ? 'Deutsch' : 'Magyar'} · {plan.penznem}
              <div style={{ fontSize: 11, color: t.textFaint, marginTop: 4 }}>
                A mentett terv nyelve és pénzneme nem módosítható (D4) — új tervet kell
                indítani.
              </div>
            </div>
          ) : (
            <>
              <FieldGroup label="Nyelv (a nyomtatvány nyelve)">
                <ChipGroup
                  value={plan.nyelv}
                  options={[
                    ['hu', 'Magyar'],
                    ['de', 'Deutsch'],
                  ]}
                  onChange={changeNyelv}
                />
              </FieldGroup>
              <FieldGroup label="Pénznem (ez dönti el, mely tételek ajánlhatók)">
                <ChipGroup
                  value={plan.penznem}
                  options={[
                    ['HUF', 'HUF — forint'],
                    ['EUR', 'EUR — euró'],
                  ]}
                  onChange={changePenznem}
                />
              </FieldGroup>

              {plan.nyelv === 'de' && cov.deNevvel < cov.aktivOsszes && (
                <Warn>
                  {cov.aktivOsszes - cov.deNevvel} / {cov.aktivOsszes} aktív tételnek nincs
                  német neve — ezek <b>magyarul</b> kerülnek a nyomtatványra. Az Árlistán
                  pótolhatók.
                </Warn>
              )}
              {cov.arazott === 0 && (
                <Warn>
                  Ebben a pénznemben ({plan.penznem}) egyetlen tétel sincs beárazva — a
                  szerkesztő keresője nem fog találatot adni. Válts pénznemet, vagy töltsd ki
                  az árakat az Árlistán.
                </Warn>
              )}
            </>
          )}
        </div>
      )}

      <div style={card}>
        <Field label="Név *">
          <input
            autoFocus
            value={paciens.nev}
            onChange={(e) => patch({ nev: e.target.value })}
            placeholder="Kovács János"
            style={input}
          />
        </Field>

        <Row>
          <Field label="Született">
            <input
              type="date"
              value={paciens.szuletesiIdo}
              onChange={(e) => patch({ szuletesiIdo: e.target.value })}
              style={input}
            />
          </Field>
          <Field label="TAJ">
            <input
              value={paciens.taj}
              onChange={(e) => patch({ taj: e.target.value })}
              placeholder="123 456 789"
              style={input}
            />
          </Field>
        </Row>

        <Field label="Lakcím">
          <input
            value={paciens.lakcim}
            onChange={(e) => patch({ lakcim: e.target.value })}
            placeholder="1113 Budapest, Bartók Béla út 42. 2/5"
            style={input}
          />
        </Field>

        <Row>
          <Field label="Telefon">
            <input
              value={paciens.telefon}
              onChange={(e) => patch({ telefon: e.target.value })}
              placeholder="+36 30 123 4567"
              style={input}
            />
          </Field>
          <Field label="E-mail">
            <input
              type="email"
              value={paciens.email}
              onChange={(e) => patch({ email: e.target.value })}
              placeholder="kovacs.janos@example.hu"
              style={input}
            />
          </Field>
        </Row>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginTop: 10 }}>
          <input
            type="checkbox"
            checked={paciens.kiskoru}
            onChange={(e) => patch({ kiskoru: e.target.checked })}
          />
          Kiskorú
        </label>

        {paciens.kiskoru && (
          <div style={{ marginTop: 10 }}>
            <Field label="Törvényes képviselő (név, elérhetőség)">
              <input
                value={paciens.torvenyesKepviselo ?? ''}
                onChange={(e) => patch({ torvenyesKepviselo: e.target.value || null })}
                placeholder="Kovács Ildikó (édesanya) — +36 30 111 2222"
                style={input}
              />
            </Field>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        <span style={{ fontSize: 12, color: nameMissing ? t.warn : t.textFaint }}>
          {nameMissing ? 'A név nélkül a mappanév sem képezhető, de tovább léphetsz.' : ' '}
        </span>
        <button style={btn(true)} onClick={() => navigate('/terv')}>
          Tovább a terv szerkesztőhöz
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 3 }}>{label}</div>
      {children}
    </label>
  );
}

/**
 * Ugyanaz a vizuális minta, mint a `Field`, de `<div>`-del `<label>` helyett --
 * egy `<label>` a HTML szerint egyetlen "labelable" elemet (pl. `<input>`,
 * `<button>`) jelölhet implicit módon; egy ChipGroup KÉT gombja egy közös
 * `<label>`-ben kétértelmű accessible name-et adott mindkét gombnak.
 */
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 3 }}>{label}</div>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>;
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: t.warnBg,
        color: t.warn,
        fontSize: 11.5,
        padding: '7px 10px',
        borderRadius: t.radius,
        marginTop: 8,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}
