// Rendelő adatai tab -- a Beállítások tab-szerkezetének (D49) első tabja.
// Korábban a `SettingsPage.tsx` "Rendelő adatai" + "Orvosok" Card-ja volt,
// leütésenkénti autosave-vel (D31); a tabosítás óta pufferelt draft +
// explicit Mentés/Mégse, a `PatientEditorPanel.tsx` mintáján (`useDirtyDraft`,
// azonnali -- megerősítés nélküli -- Mégse, mert csak a LÁTHATÓ mezőket
// veszíti el, nem egy másik nyelvet/fület, D49).

import { useEffect, useState } from 'react';
import { Button, Callout, Flex, Grid, Text, TextArea, TextField } from '@radix-ui/themes';
import { Field } from '../../components/Field';
import Section from '../../components/Section';
import { useDirtyDraft } from '../../components/useDirtyDraft';
import type { Rendelo } from '../../domain/types';
import { useAppState } from '../../state/AppState';

interface RendeloDraft {
  rendelo: Rendelo;
  orvosokText: string;
}

function toDraft(rendelo: Rendelo, orvosok: string[]): RendeloDraft {
  return { rendelo, orvosokText: orvosok.join('\n') };
}

export default function RendeloTab({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const { settings, saveSettings } = useAppState();
  const { draft, setDraft, dirty, reset } = useDirtyDraft<RendeloDraft>(
    toDraft(settings.rendelo, settings.orvosok),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  function patchRendelo(fields: Partial<Rendelo>) {
    setDraft((prev) => ({ ...prev, rendelo: { ...prev.rendelo, ...fields } }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const orvosok = draft.orvosokText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      await saveSettings((prev) => ({ ...prev, rendelo: draft.rendelo, orvosok }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'A mentés váratlanul meghiúsult.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Section title="Rendelő adatai">
        <Grid columns={{ initial: '1', sm: '2' }} gap="3" style={{ maxWidth: 560 }}>
          <Field label="Név">
            <TextField.Root value={draft.rendelo.nev} onChange={(e) => patchRendelo({ nev: e.target.value })} />
          </Field>
          <Field label="Cím">
            <TextField.Root value={draft.rendelo.cim} onChange={(e) => patchRendelo({ cim: e.target.value })} />
          </Field>
          <Field label="Telefon">
            <TextField.Root
              value={draft.rendelo.telefon}
              onChange={(e) => patchRendelo({ telefon: e.target.value })}
            />
          </Field>
          <Field label="E-mail">
            <TextField.Root
              value={draft.rendelo.email}
              onChange={(e) => patchRendelo({ email: e.target.value })}
            />
          </Field>
          <Field label="Adószám">
            <TextField.Root
              value={draft.rendelo.adoszam}
              onChange={(e) => patchRendelo({ adoszam: e.target.value })}
              placeholder="kitöltendő"
            />
          </Field>
          <Field label="Cégjegyzékszám">
            <TextField.Root
              value={draft.rendelo.cegjegyzekszam}
              onChange={(e) => patchRendelo({ cegjegyzekszam: e.target.value })}
              placeholder="kitöltendő"
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Orvosok">
        <Field label="Egy név soronként">
          <TextArea
            value={draft.orvosokText}
            onChange={(e) => setDraft((prev) => ({ ...prev, orvosokText: e.target.value }))}
            rows={3}
            style={{ maxWidth: 560 }}
          />
        </Field>
      </Section>

      {saveError && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>A mentés nem sikerült: {saveError}</Callout.Text>
        </Callout.Root>
      )}

      <Flex justify="end" align="center" gap="3">
        {dirty && !saved && (
          <Text size="1" color="gray">
            Nem mentett módosítás
          </Text>
        )}
        <Button type="button" variant="soft" color="gray" onClick={reset} disabled={saving || !dirty}>
          Mégse
        </Button>
        <Button onClick={() => void handleSave()} disabled={saving || !dirty}>
          {saving ? 'Mentés…' : saved ? 'Mentve ✓' : 'Mentés'}
        </Button>
      </Flex>
    </>
  );
}
