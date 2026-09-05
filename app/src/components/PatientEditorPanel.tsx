// A páciens-törzsadat (paciens-adatok.json) szerkesztő panelje --
// eredetileg a PaciensekPage.tsx helyi `PatientEditor`-a volt, backlog-30
// (Páciens detail shell) emelte ide, majd a 38. tétel óta a
// PatientDetailPage.tsx "Páciens adatai" tabja az EGYETLEN hívási helye --
// a PaciensekPage.tsx lista azóta tiszta navigációs lista. A
// `PatientPage.tsx` "Személyes adatok" mezőelrendezését követi (közös
// `components/Field`-del), de Card doboz nélkül
// (nincs card doboz adat körül) és explicit
// Mentés/Mégse gombpárral, mert itt -- ellentétben a terv-piszkozattal,
// ami folyamatosan autosave-el -- egy zárt fájl jön létre az első
// mentéskor.
//
// Nincs "Korábbi tervek" kereszt-link a panel alján -- a hívó
// (PatientDetailPage.tsx) tabsora már kínálja ugyanezt a váltást, egy
// második, alul elhelyezett gomb csak megismételné.
//
// Mentéskor duplikáció-ellenőrzés fut -- csak
// save-time, a `UjPaciensDialog.tsx`-szel ellentétben NINCS inline
// javaslat-lista: itt nem "válassz helyette" a kérdés (ez egy MÁR nyitott
// páciens szerkesztése, nem egy új rekord felvitele), csak egy egyszerű
// megerősítő felsorolás, ha az átírt név egy másik pácienssel ütközne. A
// `patients` listát a komponens saját maga tölti be -- a hívó
// (`PatientDetailPage.tsx`) nem tart kéznél egy friss, teljes listát.
//
// Kétállású render: alapból olvasó nézet
// (`ReadOnlyField`-ekkel, a MENTETT `displayed` alapból, nem a draftból),
// egy "Szerkesztés" gombbal a mai input-mezős nézetre váltva -- így a
// puszta megnyitás sosem indít piszkozatot. A `kezdoMod` prop a
// quick-create utáni azonnali szerkesztés-módú nyitáshoz (`PatientDetailPage.tsx`).

import { useEffect, useMemo, useState } from 'react';
import { AlertDialog, Box, Button, Callout, Checkbox, Flex, Grid, Text, TextField } from '@radix-ui/themes';
import { CrossCircledIcon } from '@radix-ui/react-icons';
import { Field, ReadOnlyField } from './Field';
import { useDirtyDraft } from './useDirtyDraft';
import { usePaciensDuplikacio } from './usePaciensDuplikacio';
import { t } from '../design/tokens';
import { formatShortDate, todayIso } from '../domain/date';
import { megjelenitettTorzsadat } from '../domain/paciensAdatok';
import type { DuplikaciosJelolt } from '../domain/paciensDuplikacio';
import { emailHiba, szuletesiIdoHiba } from '../domain/paciensValidacio';
import type { Paciens, PatientFolder, PatientMasterData, Plan } from '../domain/types';
import { useStorage } from '../storage/StorageContext';

type Mod = 'nezet' | 'szerkesztes';

export default function PatientEditorPanel({
  patient,
  adatok,
  fallbackPlan,
  fallbackLoading,
  fallbackError,
  kezdoMod = 'nezet',
  onDirtyChange,
  onSaved,
}: {
  patient: PatientFolder;
  adatok: PatientMasterData | null;
  /** `undefined` = még nem próbáltuk betölteni (lásd `fallbackLoading`); `null` = nincs olvasható terve. */
  fallbackPlan: Plan | null | undefined;
  fallbackLoading: boolean;
  fallbackError: string | null;
  /** Quick-create után a hívó szerkesztés módban jelzi a nyitást. */
  kezdoMod?: Mod;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: (saved: PatientMasterData) => void;
}) {
  const { storage } = useStorage();
  const isLocked = adatok != null;
  const displayed = useMemo(
    () => megjelenitettTorzsadat(adatok, fallbackPlan ?? null, patient),
    [adatok, fallbackPlan, patient],
  );

  const [mod, setMod] = useState<Mod>(kezdoMod);
  const [saving, setSaving] = useState(false);
  const [ellenorzesFolyamatban, setEllenorzesFolyamatban] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [megprobaltMenteni, setMegprobaltMenteni] = useState(false);
  const [duplikaciMegerosites, setDuplikaciMegerosites] = useState<DuplikaciosJelolt[] | null>(null);

  // Amíg a fallback tölt, a `displayed` még a névre szűkített üres rekord --
  // a piszkozatot csak AKKOR inicializáljuk ebből, ha a doki még nem kezdett
  // gépelni (`ready: !fallbackLoading`, lásd useDirtyDraft.ts).
  const { draft, setDraft, dirty, reset } = useDirtyDraft(displayed, { ready: !fallbackLoading });
  useEffect(() => {
    onDirtyChange(mod === 'szerkesztes' && dirty);
  }, [mod, dirty, onDirtyChange]);

  const emailHibaSzoveg = megprobaltMenteni ? emailHiba(draft.email) : null;
  const szuletesiIdoHibaSzoveg = megprobaltMenteni ? szuletesiIdoHiba(draft.szuletesiIdo, todayIso()) : null;

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
      setMegprobaltMenteni(false);
      setMod('nezet');
    } catch (err) {
      // Mentési hiba: a draft ÉS a szerkesztés mód érintetlen marad --
      // a doki beírt adata nem veszhet el egy sikertelen íráskor.
      setSaveError(err instanceof Error ? err.message : 'A mentés váratlanul meghiúsult.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    setMegprobaltMenteni(true);
    if (emailHiba(draft.email) || szuletesiIdoHiba(draft.szuletesiIdo, todayIso())) return;

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
    setMegprobaltMenteni(false);
    setMod('nezet');
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

  if (mod === 'nezet') {
    return (
      <Box py="2">
        {!isLocked && (
          <Text as="p" size="1" color="gray" mb="3">
            Ez az adat a páciens legutóbbi mentett tervéből látszik — mentéssel önálló, terv-
            mentéstől független törzsadattá válik.
          </Text>
        )}

        <ReadOnlyField label="Név" value={displayed.nev} />

        <Grid columns="2" gap="3" mt="3">
          <ReadOnlyField
            label="Született"
            value={displayed.szuletesiIdo ? formatShortDate(displayed.szuletesiIdo, 'hu') : ''}
          />
          <ReadOnlyField label="TAJ" value={displayed.taj} />
        </Grid>

        <Box mt="3">
          <ReadOnlyField label="Lakcím" value={displayed.lakcim} />
        </Box>

        <Grid columns="2" gap="3" mt="3">
          <ReadOnlyField label="Telefon" value={displayed.telefon} />
          <ReadOnlyField label="E-mail" value={displayed.email} />
        </Grid>

        <Box mt="3">
          <ReadOnlyField label="Kiskorú" value={displayed.kiskoru ? 'Igen' : 'Nem'} />
        </Box>

        {displayed.kiskoru && (
          <Box mt="3">
            <ReadOnlyField
              label="Törvényes képviselő (név, elérhetőség)"
              value={displayed.torvenyesKepviselo ?? ''}
            />
          </Box>
        )}

        <Flex justify="end" mt="4">
          <Button size="1" onClick={() => setMod('szerkesztes')}>
            Szerkesztés
          </Button>
        </Flex>
      </Box>
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
            aria-invalid={szuletesiIdoHibaSzoveg ? true : undefined}
            style={szuletesiIdoHibaSzoveg ? { boxShadow: `inset 0 0 0 1px ${t.danger}` } : undefined}
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
      {szuletesiIdoHibaSzoveg && (
        <Text as="div" size="1" mt="1" style={{ color: t.danger }}>
          {szuletesiIdoHibaSzoveg}
        </Text>
      )}

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
            aria-invalid={emailHibaSzoveg ? true : undefined}
            style={emailHibaSzoveg ? { boxShadow: `inset 0 0 0 1px ${t.danger}` } : undefined}
          />
        </Field>
      </Grid>
      {emailHibaSzoveg && (
        <Text as="div" size="1" mt="1" style={{ color: t.danger }}>
          {emailHibaSzoveg}
        </Text>
      )}

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
        <Button type="button" size="1" variant="soft" color="gray" disabled={saving} onClick={handleCancel}>
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
