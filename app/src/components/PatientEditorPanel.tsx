// A páciens-törzsadat (paciens-adatok.json, D33) szerkesztő panelje --
// eredetileg a PaciensekPage.tsx helyi `PatientEditor`-a volt, backlog-30
// (Páciens detail shell) emelte ide, mert mostantól KÉT hívó használja:
// a PaciensekPage.tsx lista soronkénti accordionja ÉS a PatientDetailPage.tsx
// "Páciens adatai" tabja. A `PatientPage.tsx` "Személyes adatok"
// mezőelrendezését követi (közös `components/Field`-del), de Card doboz
// nélkül (docs/07-felulet-rendszer.md: "Nincs card doboz adat körül") és
// explicit Mentés/Mégse gombpárral, mert itt -- ellentétben a
// terv-piszkozattal, ami folyamatosan autosave-el -- egy zárt fájl jön
// létre az első mentéskor (D33).
//
// Az `onNavigateToHistory` jelentése a hívótól függ: a PaciensekPage.tsx-ben
// route-navigáció az egyesített páciens-részletoldalra, a
// PatientDetailPage.tsx "Páciens adatai" tabjában egyszerű tab-váltás --
// ez a komponens csak a callbacket hívja, a különbséget nem ismeri.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Callout, Checkbox, Flex, Grid, Text, TextField } from '@radix-ui/themes';
import { CrossCircledIcon } from '@radix-ui/react-icons';
import { Field } from './Field';
import { t } from '../design/tokens';
import { megjelenitettTorzsadat } from '../domain/paciensAdatok';
import type { Paciens, PatientFolder, PatientMasterData, Plan } from '../domain/types';
import { useStorage } from '../storage/StorageContext';

export default function PatientEditorPanel({
  patient,
  adatok,
  fallbackPlan,
  fallbackLoading,
  fallbackError,
  onDirtyChange,
  onSaved,
  onNavigateToHistory,
}: {
  patient: PatientFolder;
  adatok: PatientMasterData | null;
  /** `undefined` = még nem próbáltuk betölteni (lásd `fallbackLoading`); `null` = nincs olvasható terve. */
  fallbackPlan: Plan | null | undefined;
  fallbackLoading: boolean;
  fallbackError: string | null;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: (saved: PatientMasterData) => void;
  onNavigateToHistory: () => void;
}) {
  const { storage } = useStorage();
  const isLocked = adatok != null;
  const displayed = useMemo(
    () => megjelenitettTorzsadat(adatok, fallbackPlan ?? null, patient),
    [adatok, fallbackPlan, patient],
  );

  const [draft, setDraft] = useState<PatientMasterData>(displayed);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Amíg a fallback tölt, a `displayed` még a névre szűkített üres
  // rekord -- a piszkozatot csak AKKOR inicializáljuk ebből, ha a doki még
  // nem kezdett gépelni, és csak egyszer (ne írja felül menet közben).
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current || fallbackLoading) return;
    setDraft(displayed);
    initializedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayed, fallbackLoading]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(displayed);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  function patch(fields: Partial<Paciens>) {
    setDraft((prev) => ({ ...prev, ...fields }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const toSave: PatientMasterData = { ...draft, schemaVersion: 1, paciensId: patient.paciensId };
      await storage.savePatientData(patient.dirName, toSave);
      onSaved(toSave);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'A mentés váratlanul meghiúsult.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(displayed);
  }

  if (fallbackLoading) {
    return (
      <Text size="2" color="gray">
        Betöltés…
      </Text>
    );
  }

  if (fallbackError) {
    return (
      <Callout.Root color="red" size="1">
        <Callout.Icon>
          <CrossCircledIcon />
        </Callout.Icon>
        <Callout.Text>A legutóbbi terv betöltése nem sikerült: {fallbackError}</Callout.Text>
      </Callout.Root>
    );
  }

  return (
    <Box py="2">
      {!isLocked && (
        <Text as="p" size="1" color="gray" mb="3">
          Ez az adat a páciens legutóbbi mentett tervéből látszik — mentéssel önálló, terv-
          mentéstől független törzsadattá válik.
        </Text>
      )}

      <Field label="Név *">
        <TextField.Root value={draft.nev} onChange={(e) => patch({ nev: e.target.value })} />
      </Field>
      {!draft.nev.trim() && (
        <Text as="div" size="1" mt="1" mb="1" style={{ color: t.warn }}>
          A név nélkül a mappanév sem képezhető, de menthető.
        </Text>
      )}

      <Grid columns="2" gap="3" mt="3">
        <Field label="Született">
          <TextField.Root
            type="date"
            value={draft.szuletesiIdo}
            onChange={(e) => patch({ szuletesiIdo: e.target.value })}
          />
        </Field>
        <Field label="TAJ">
          <TextField.Root
            value={draft.taj}
            onChange={(e) => patch({ taj: e.target.value })}
            placeholder="123 456 789"
          />
        </Field>
      </Grid>

      <Box mt="3">
        <Field label="Lakcím">
          <TextField.Root
            value={draft.lakcim}
            onChange={(e) => patch({ lakcim: e.target.value })}
            placeholder="1113 Budapest, Bartók Béla út 42. 2/5"
          />
        </Field>
      </Box>

      <Grid columns="2" gap="3" mt="3">
        <Field label="Telefon">
          <TextField.Root
            value={draft.telefon}
            onChange={(e) => patch({ telefon: e.target.value })}
            placeholder="+36 30 123 4567"
          />
        </Field>
        <Field label="E-mail">
          <TextField.Root
            type="email"
            value={draft.email}
            onChange={(e) => patch({ email: e.target.value })}
            placeholder="kovacs.janos@example.hu"
          />
        </Field>
      </Grid>

      <Text as="label" size="2" mt="3" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Checkbox
          checked={draft.kiskoru}
          onCheckedChange={(checked) => patch({ kiskoru: checked === true })}
        />
        Kiskorú
      </Text>

      {draft.kiskoru && (
        <Box mt="3">
          <Field label="Törvényes képviselő (név, elérhetőség)">
            <TextField.Root
              value={draft.torvenyesKepviselo ?? ''}
              onChange={(e) => patch({ torvenyesKepviselo: e.target.value || null })}
              placeholder="Kovács Ildikó (édesanya) — +36 30 111 2222"
            />
          </Field>
        </Box>
      )}

      {saveError && (
        <Callout.Root color="red" size="1" mt="3">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>{saveError}</Callout.Text>
        </Callout.Root>
      )}

      <Flex justify="between" align="center" mt="4">
        <Button size="1" variant="ghost" color="gray" onClick={onNavigateToHistory}>
          Korábbi tervek
        </Button>
        <Flex gap="2">
          <Button
            type="button"
            size="1"
            variant="soft"
            color="gray"
            disabled={!dirty || saving}
            onClick={handleCancel}
          >
            Mégse
          </Button>
          <Button size="1" disabled={!dirty || saving} onClick={() => void handleSave()}>
            Mentés
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
}
