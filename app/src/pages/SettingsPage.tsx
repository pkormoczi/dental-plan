// Beállítások -- docs/03-funkcionalis-spec.md "7. Beállítások", minimál
// szinten (a gyökérmappa-kijelölés és a sablonszöveg-szerkesztő a
// FileSystemStorage-hoz kötött 2. fázis feladata, lásd CLAUDE.md).

import { useState } from 'react';
import { Link } from 'react-router-dom';
import ChipGroup from '../components/ChipGroup';
import { lefedettseg } from '../domain/coverage';
import { t } from '../design/tokens';
import { btn, card, input } from '../design/ui';
import { useAppState } from '../state/AppState';

export default function SettingsPage() {
  const { settings, saveSettings, priceList } = useAppState();
  // aktivOsszes/deNevvel függetlenek a pénznemtől -- csak az `arazott`
  // mezőhöz kell külön az EUR nézet (lásd domain/coverage.ts).
  const cov = lefedettseg(priceList, 'HUF');
  const eurArazott = lefedettseg(priceList, 'EUR').arazott;
  const [orvosokText, setOrvosokText] = useState(settings.orvosok.join('\n'));
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // P0-8: korábban `void saveSettings(...)` volt -- a hívó nem várta meg és
  // nem ellenőrizte az eredményét, tehát egy sikertelen mentés (pl. kvóta)
  // némán elveszett, a "Mentve ✓" pedig a tényleges eredménytől függetlenül
  // jelent meg. `patch` most a siker/hiba tényét adja vissza, hogy a hívó
  // (pl. `handleSave`) el tudja dönteni, mutassa-e a visszajelzést.
  async function patch(fields: Partial<typeof settings>): Promise<boolean> {
    try {
      await saveSettings({ ...settings, ...fields });
      setSaveError(null);
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'A mentés váratlanul meghiúsult.');
      return false;
    }
  }

  async function commitOrvosok(): Promise<boolean> {
    const list = orvosokText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return patch({ orvosok: list });
  }

  async function handleSave() {
    const ok = await commitOrvosok();
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18, color: t.brand, marginBottom: 16 }}>Beállítások</h1>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.brand, marginBottom: 10 }}>
          Rendelő adatai
        </div>
        <Field label="Név">
          <input
            value={settings.rendelo.nev}
            onChange={(e) => patch({ rendelo: { ...settings.rendelo, nev: e.target.value } })}
            style={input}
          />
        </Field>
        <Field label="Cím">
          <input
            value={settings.rendelo.cim}
            onChange={(e) => patch({ rendelo: { ...settings.rendelo, cim: e.target.value } })}
            style={input}
          />
        </Field>
        <Row>
          <Field label="Telefon">
            <input
              value={settings.rendelo.telefon}
              onChange={(e) => patch({ rendelo: { ...settings.rendelo, telefon: e.target.value } })}
              style={input}
            />
          </Field>
          <Field label="E-mail">
            <input
              value={settings.rendelo.email}
              onChange={(e) => patch({ rendelo: { ...settings.rendelo, email: e.target.value } })}
              style={input}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Adószám">
            <input
              value={settings.rendelo.adoszam}
              onChange={(e) => patch({ rendelo: { ...settings.rendelo, adoszam: e.target.value } })}
              placeholder="kitöltendő"
              style={input}
            />
          </Field>
          <Field label="Cégjegyzékszám">
            <input
              value={settings.rendelo.cegjegyzekszam}
              onChange={(e) =>
                patch({ rendelo: { ...settings.rendelo, cegjegyzekszam: e.target.value } })
              }
              placeholder="kitöltendő"
              style={input}
            />
          </Field>
        </Row>
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.brand, marginBottom: 10 }}>
          Orvosok
        </div>
        <Field label="Egy név soronként">
          <textarea
            value={orvosokText}
            onChange={(e) => setOrvosokText(e.target.value)}
            onBlur={commitOrvosok}
            rows={3}
            style={{ ...input, height: 'auto', padding: '6px 7px', resize: 'vertical' as const }}
          />
        </Field>
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.brand, marginBottom: 10 }}>
          Ajánlat és nyelv
        </div>
        <Field label="Ajánlat érvényessége (nap)">
          <input
            type="number"
            min={1}
            value={settings.ervenyessegNap}
            onChange={(e) => patch({ ervenyessegNap: Math.max(1, Number(e.target.value) || 1) })}
            style={{ ...input, maxWidth: 160 }}
          />
        </Field>

        <label
          style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginTop: 12 }}
        >
          <input
            type="checkbox"
            checked={settings.nemetEngedelyezve}
            onChange={(e) => patch({ nemetEngedelyezve: e.target.checked })}
          />
          Német nyelvű ajánlat engedélyezése
        </label>

        {settings.nemetEngedelyezve && (
          <>
            <div style={{ marginTop: 10 }}>
              {/* div, nem Field/<label> -- egy <label> csak egyetlen "labelable"
                  elemet jelölhetne implicit módon, a ChipGroup viszont két
                  gombot renderel, ami kétértelmű accessible name-et adna. */}
              <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 3 }}>
                Alapértelmezett nyelv új tervnél
              </div>
              <ChipGroup
                value={settings.alapertelmezettNyelv}
                options={[
                  ['hu', 'Magyar'],
                  ['de', 'Deutsch'],
                ]}
                onChange={(nyelv) => patch({ alapertelmezettNyelv: nyelv })}
              />
            </div>

            <div style={{ fontSize: 11, color: t.textMuted, marginTop: 8, lineHeight: 1.7 }}>
              <b>A német tartalom készültsége</b>
              <br />
              Tételnevek: {cov.deNevvel} / {cov.aktivOsszes} lefordítva
              <br />
              EUR árak: {eurArazott} / {cov.aktivOsszes} kitöltve
              <br />
              Nyilatkozat: <span style={{ fontFamily: t.mono }}>nyilatkozat-de-v1.md</span> —
              placeholder, jogi lektorálás szükséges
              <br />
              <Link to="/arlista" style={{ color: t.brand }}>
                Árlista megnyitása
              </Link>{' '}
              — a „Nincs EUR ár” szűrő a munkalista.
            </div>
          </>
        )}
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.brand, marginBottom: 10 }}>Logó</div>
        <div style={{ fontSize: 12, color: t.textMuted }}>
          Fájlnév: <span style={{ fontFamily: t.mono }}>{settings.logoFajl}</span>
        </div>
        <div style={{ fontSize: 11, color: t.textFaint, marginTop: 4 }}>
          A logócserét a végleges alkalmazásban a gyökérmappába helyezett fájl adja -- a
          mockupban ez fix.
        </div>
      </div>

      {saveError && (
        <div
          style={{
            background: t.dangerBg,
            color: t.danger,
            fontSize: 12.5,
            padding: '8px 14px',
            borderRadius: t.radiusLg,
            marginBottom: 10,
          }}
        >
          A mentés nem sikerült: {saveError}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={btn(true)} onClick={handleSave}>
          {saved ? 'Mentve ✓' : 'Mentés'}
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

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>;
}
