// A páciens-törzsadat (paciens-adatok.json, D33) szerkesztő panelje --
// eredetileg a PaciensekPage.tsx helyi `PatientEditor`-a volt, backlog-30
// (Páciens detail shell) emelte ide, majd a 38. tétel (D43) óta a
// PatientDetailPage.tsx "Páciens adatai" tabja az EGYETLEN hívási helye --
// a PaciensekPage.tsx lista azóta tiszta navigációs lista. A
// `PatientPage.tsx` "Személyes adatok" mezőelrendezését követi (közös
// `components/Field`-del), de Card doboz nélkül
// (docs/07-felulet-rendszer.md: "Nincs card doboz adat körül") és explicit
// Mentés/Mégse gombpárral, mert itt -- ellentétben a terv-piszkozattal,
// ami folyamatosan autosave-el -- egy zárt fájl jön létre az első
// mentéskor (D33).
//
// Nincs "Korábbi tervek" kereszt-link a panel alján -- a hívó
// (PatientDetailPage.tsx) tabsora már kínálja ugyanezt a váltást, egy
// második, alul elhelyezett gomb csak megismételné (D44).
//
// Mentéskor duplikáció-ellenőrzés fut (D42, redesign D208) -- csak
// save-time, a `UjPaciensDialog.tsx`-szel ellentétben NINCS inline
// javaslat-lista: itt nem "válassz helyette" a kérdés (ez egy MÁR nyitott
// páciens szerkesztése, nem egy új rekord felvitele), csak egy egyszerű
// megerősítő felsorolás, ha az átírt név egy másik pácienssel ütközne. A
// `patients` listát a komponens saját maga tölti be -- a hívó
// (`PatientDetailPage.tsx`) nem tart kéznél egy friss, teljes listát.

import { useEffect, useMemo, useState } from 'react';
import { AlertDialog, Box, Button, Callout, Checkbox, Flex, Grid, Text, TextField } from '@radix-ui/themes';
import { CrossCircledIcon } from '@radix-ui/react-icons';
import { Field } from './Field';
import { useDirtyDraft } from './useDirtyDraft';
import { usePaciensDuplikacio } from './usePaciensDuplikacio';
import { t } from '../design/tokens';
import { megjelenitettTorzsadat } from '../domain/paciensAdatok';
import type { DuplikaciosJelolt } from '../domain/paciensDuplikacio';
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
}: {
  patient: PatientFolder;
  adatok: PatientMasterData | null;
  /** `undefined` = még nem próbáltuk betölteni (lásd `fallbackLoading`); `null` = nincs olvasható terve. */
  fallbackPlan: Plan | null | undefined;
  fallbackLoading: boolean;
  fallbackError: string | null;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: (saved: PatientMasterData) => void;
}) {
  const { storage } = useStorage();
  const isLocked = adatok != null;
  const displayed = useMemo(
    () => megjelenitettTorzsadat(adatok, fallbackPlan ?? null, patient),
    [adatok, fallbackPlan, patient],
  );

  const [saving, setSaving] = useState(false);
  const [ellenorzesFolyamatban, setEllenorzesFolyamatban] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [duplikaciMegerosites, setDuplikaciMegerosites] = useState<DuplikaciosJelolt[] | null>(null);

  // Amíg a fallback tölt, a `displayed` még a névre szűkített üres rekord --
  // a piszkozatot csak AKKOR inicializáljuk ebből, ha a doki még nem kezdett
  // gépelni (`ready: !fallbackLoading`, lásd useDirtyDraft.ts).
  const { draft, setDraft, dirty, reset } = useDirtyDraft(displayed, { ready: !fallbackLoading });
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  function patch(fields: Partial<Paciens>) {
    setDraft((prev) => ({ ...prev, ...fields }));
  }

  const [patients, setPatients] = useState<PatientFolder[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await storage.listPatients();
        if (!cancelled) setPatients(list);
      } catch {
        // A duplikáció-ellenőrzés best-effort -- egy sikertelen listázás
        // nem akadályozza a mentést, csak a védelmet lazítja.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storage]);

  const { ellenoriz } = usePaciensDuplikacio({
    storage,
    patients,
    nev: draft.nev,
    szuletesiIdo: draft.szuletesiIdo,
    telefon: draft.telefon,
    kihagyottPaciensId: patient.paciensId,
  });

  async function vegrehajtMentest() {
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

  async function handleSave() {
    setEllenorzesFolyamatban(true);
    try {
      const talalatok = await ellenoriz({
        nev: draft.nev,
        szuletesiIdo: draft.szuletesiIdo,
        telefon: draft.telefon,
      });
      if (talalatok.length > 0) {
        setDuplikaciMegerosites(talalatok);
        return;
      }
    } finally {
      setEllenorzesFolyamatban(false);
    }
    await vegrehajtMentest();
  }

  function handleCancel() {
    reset();
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

      <Flex justify="end" gap="2" mt="4">
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
        <Button
          size="1"
          disabled={!dirty || saving || ellenorzesFolyamatban}
          onClick={() => void handleSave()}
        >
          Mentés
        </Button>
      </Flex>

      <AlertDialog.Root
        open={duplikaciMegerosites !== null}
        onOpenChange={(o) => !o && setDuplikaciMegerosites(null)}
      >
        <AlertDialog.Content maxWidth="440px">
          <AlertDialog.Title>Hasonló nevű páciens már létezik</AlertDialog.Title>
          <AlertDialog.Description size="2" style={{ whiteSpace: 'pre-line' }}>
            {duplikaciMegerosites?.map((j) => j.patient.nev).join(', ')} néven már van más páciens
            nyilvántartva.
            {'\n'}Biztosan ezzel a névvel/adatokkal mented?
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Mégse
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                color="red"
                onClick={() => {
                  setDuplikaciMegerosites(null);
                  void vegrehajtMentest();
                }}
              >
                Mentés mégis
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}
