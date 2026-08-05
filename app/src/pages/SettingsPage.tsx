// Beállítások -- docs/03-funkcionalis-spec.md "7. Beállítások", minimál
// szinten (a gyökérmappa-kijelölés és a sablonszöveg-szerkesztő a
// FileSystemStorage-hoz kötött 2. fázis feladata, lásd CLAUDE.md).

import { useState } from 'react';
import { t } from '../design/tokens';
import { btn, card, input } from '../design/ui';
import { useAppState } from '../state/AppState';

export default function SettingsPage() {
  const { settings, saveSettings } = useAppState();
  const [orvosokText, setOrvosokText] = useState(settings.orvosok.join('\n'));
  const [saved, setSaved] = useState(false);

  function patch(fields: Partial<typeof settings>) {
    void saveSettings({ ...settings, ...fields });
  }

  function commitOrvosok() {
    const list = orvosokText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    patch({ orvosok: list });
  }

  function handleSave() {
    commitOrvosok();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18, color: t.navy, marginBottom: 16 }}>Beállítások</h1>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.navy, marginBottom: 10 }}>
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
        <div style={{ fontSize: 13, fontWeight: 600, color: t.navy, marginBottom: 10 }}>
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
        <div style={{ fontSize: 13, fontWeight: 600, color: t.navy, marginBottom: 10 }}>
          Ajánlat és nyelv
        </div>
        <Row>
          <Field label="Ajánlat érvényessége (nap)">
            <input
              type="number"
              min={1}
              value={settings.ervenyessegNap}
              onChange={(e) => patch({ ervenyessegNap: Math.max(1, Number(e.target.value) || 1) })}
              style={input}
            />
          </Field>
          <Field label="Alapértelmezett nyelv">
            <input value="magyar (hu)" disabled style={{ ...input, color: t.textFaint }} />
          </Field>
        </Row>
        <div style={{ fontSize: 11, color: t.textFaint, marginTop: 4 }}>
          A német nyelv kapcsolója (D10) egyelőre rejtve marad, amíg a fordítások el nem
          készülnek -- lásd docs/01-attekintes-es-dontesek.md.
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.navy, marginBottom: 10 }}>Logó</div>
        <div style={{ fontSize: 12, color: t.textMuted }}>
          Fájlnév: <span style={{ fontFamily: t.mono }}>{settings.logoFajl}</span>
        </div>
        <div style={{ fontSize: 11, color: t.textFaint, marginTop: 4 }}>
          A logócserét a végleges alkalmazásban a gyökérmappába helyezett fájl adja -- a
          mockupban ez fix.
        </div>
      </div>

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
