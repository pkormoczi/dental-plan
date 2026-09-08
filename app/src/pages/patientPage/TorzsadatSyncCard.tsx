// "Páciens törzsadata" eltérés-jelzés -- backlog-40, a
// Terv adatai lap "Páciens adatai" szekciójába ágyazva, a személyes adatok
// mezői ALATT (backlog-51
// óta kártyakeret nélkül, lásd lent). A törzsadat invariánsa (nincs automatikus
// szinkron, lásd app/src/storage/CLAUDE.md) változatlan: ez a rész KÉT külön, explicit irányú műveletet ad
// -- "Frissítés az adatlapról" (master -> draft) és "Az adatlap frissítése
// a tervből" (draft -> master), soha nem egy közös "Szinkronizálás" gomb
// -- plusz a lépés-elhagyáskor (a "Tovább" gomb, `PatientPage.tsx`)
// egyszer felkínált ajánlatot (`components/LepesGuardContext.tsx`).
//
// Ha a `patientDir` nem oldható fel (`domain/torzsadatBetoltes.ts`
// `feloldPatientDir`), ez a rész EGYÁLTALÁN NEM renderelődik -- nincs mihez
// hasonlítani a draftot.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertDialog, Box, Button, Callout, Flex, Separator, Text } from '@radix-ui/themes';
import { CrossCircledIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import TorzsadatDiffDialog from '../../components/TorzsadatDiffDialog';
import { useLepesElhagyas, useLepesGuard } from '../../components/LepesGuardContext';
import { usePaciensKotes } from '../../components/PaciensKotesContext';
import { t } from '../../design/tokens';
import {
  alkalmazMezoket,
  diffAzonosito,
  masterSnapshotDiff,
  mezoErtekSzoveg,
  potolhatoMezok,
  valodiUtkozesek,
} from '../../domain/masterSnapshotDiff';
import { paciensTorzsadatbol, torzsadatTervbol } from '../../domain/paciensAdatok';
import { feloldPatientDir } from '../../domain/torzsadatBetoltes';
import type { Paciens, PatientMasterData } from '../../domain/types';
import { useAppState } from '../../state/AppState';
import { useStorage } from '../../storage/StorageContext';

type ManualDialog = 'master-to-draft' | 'draft-to-master' | null;

export default function TorzsadatSyncCard() {
  const { plan, setPlan, piszkozatPatientDir } = useAppState();
  const { storage } = useStorage();
  const {
    elutasitottDiffId,
    setElutasitottDiffId,
    letrehozasPromptEldontve,
    setLetrehozasPromptEldontve,
  } = useLepesGuard();
  // 94. tétel: amíg a Név mező egy MÁSIK, létező páciensre illik pontosan,
  // egyik draft->master írási út sem tilthat el a doki elől -- az "Az adatlap
  // frissítése a tervből" gomb, az "Adatlap létrehozása a terv adataiból"
  // gomb ÉS a lépés-elhagyási prompt draft->master ajánlata is. A master->
  // draft irány ("Frissítés az adatlapról") érintetlen.
  const { utkozok } = usePaciensKotes();
  const nevUtkozes = utkozok.length > 0;

  const [patientDir, setPatientDir] = useState<string | null>(null);
  const [paciensId, setPaciensId] = useState<string | null>(null);
  // `undefined` = még nem próbáltuk betölteni; `null` = betöltve, nincs lezárt törzsadat (fallback).
  const [torzsadat, setTorzsadat] = useState<PatientMasterData | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [manualDialog, setManualDialog] = useState<ManualDialog>(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [potlasFolyamatban, setPotlasFolyamatban] = useState(false);
  const [potlasHiba, setPotlasHiba] = useState<string | null>(null);

  const [lepesPromptOpen, setLepesPromptOpen] = useState(false);
  const [letrehozasPromptOpen, setLetrehozasPromptOpen] = useState(false);
  const [letrehozasFolyamatban, setLetrehozasFolyamatban] = useState(false);
  const [letrehozasHiba, setLetrehozasHiba] = useState<string | null>(null);
  const proceedRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const dir = await feloldPatientDir(storage, piszkozatPatientDir, plan.paciensId);
      if (cancelled) return;
      setPatientDir(dir);
      if (!dir) return;
      try {
        const [data, patients] = await Promise.all([storage.loadPatientData(dir), storage.listPatients()]);
        if (cancelled) return;
        setTorzsadat(data);
        setPaciensId(plan.paciensId ?? patients.find((p) => p.dirName === dir)?.paciensId ?? null);
        setLoadError(null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'A páciens adatlapjának betöltése váratlanul meghiúsult.',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // A `plan.paciens`-t (szerkesztés közben minden leütésre változó
    // mezőket) SZÁNDÉKOSAN nem tesszük dependency-vé -- csak az AZONOSÍTÓ
    // (patientDir/paciensId) változása indokol újratöltést.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storage, piszkozatPatientDir, plan.paciensId]);

  const master = torzsadat ? paciensTorzsadatbol(torzsadat) : null;
  const elteresek = master ? masterSnapshotDiff(master, plan.paciens) : [];
  const diffId = master ? diffAzonosito(elteresek, master, plan.paciens) : null;
  // A diff két, KÜLÖN jelzett fele -- lásd `valodiUtkozesek` doc-kommentjét:
  // az ütközés mérlegelést kíván (két-gombos dialógus), a pótlás nem.
  const utkozesek = master ? valodiUtkozesek(elteresek, master, plan.paciens) : [];
  const potlasok = master ? potolhatoMezok(elteresek, master, plan.paciens) : [];

  function applyToDraft(next: Paciens) {
    setPlan((prev) => ({ ...prev, paciens: next }));
  }

  const writeMaster = useCallback(
    async (next: Paciens) => {
      if (!patientDir) throw new Error('Ismeretlen páciensmappa.');
      const toSave: PatientMasterData = {
        schemaVersion: 1,
        paciensId: torzsadat?.paciensId ?? paciensId ?? '',
        ...next,
      };
      await storage.savePatientData(patientDir, toSave);
      setTorzsadat(toSave);
    },
    [storage, patientDir, torzsadat, paciensId],
  );

  const createMasterFromDraft = useCallback(async () => {
    if (!patientDir) throw new Error('Ismeretlen páciensmappa.');
    if (!paciensId) throw new Error('Ismeretlen páciensazonosító.');
    const toSave = torzsadatTervbol(plan.paciens, paciensId);
    await storage.savePatientData(patientDir, toSave);
    setTorzsadat(toSave);
  }, [storage, patientDir, paciensId, plan.paciens]);

  // Egy lépésben, dialógus nélkül: amelyik oldal üres, a másikról veszi az
  // értéket. Az írás megy előre -- ha az adatlap írása hibázik, a piszkozat
  // érintetlen marad, és a gomb változatlan állapotból újrapróbálható.
  async function handlePotlas() {
    if (!master) return;
    setPotlasFolyamatban(true);
    setPotlasHiba(null);
    try {
      const masterbe = potlasok
        .filter(({ kulcs }) => mezoErtekSzoveg(master, kulcs) === '')
        .map(({ kulcs }) => kulcs);
      const draftba = potlasok
        .filter(({ kulcs }) => mezoErtekSzoveg(plan.paciens, kulcs) === '')
        .map(({ kulcs }) => kulcs);
      if (masterbe.length > 0) await writeMaster(alkalmazMezoket(master, plan.paciens, masterbe));
      if (draftba.length > 0) applyToDraft(alkalmazMezoket(plan.paciens, master, draftba));
    } catch (err) {
      setPotlasHiba(err instanceof Error ? err.message : 'A hiányzó mezők pótlása váratlanul meghiúsult.');
    } finally {
      setPotlasFolyamatban(false);
    }
  }

  async function handleManualCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      await createMasterFromDraft();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Az adatlap létrehozása váratlanul meghiúsult.');
    } finally {
      setCreating(false);
    }
  }

  function runProceed() {
    const proceed = proceedRef.current;
    proceedRef.current = null;
    proceed?.();
  }

  function skipLepesPrompt() {
    setLepesPromptOpen(false);
    if (diffId !== null) setElutasitottDiffId(diffId);
    runProceed();
  }

  function skipLetrehozasPrompt() {
    setLetrehozasPromptOpen(false);
    setLetrehozasHiba(null);
    setLetrehozasPromptEldontve(true);
    runProceed();
  }

  // Az elsődleges gomb MINDIG ír, egy kattintással -- korábban egy
  // bepipálatlan jelölőnégyzet mellett némán a kihagyás-útra esett.
  async function confirmLetrehozasPrompt() {
    setLetrehozasFolyamatban(true);
    setLetrehozasHiba(null);
    try {
      await createMasterFromDraft();
      skipLetrehozasPrompt();
    } catch (err) {
      setLetrehozasHiba(err instanceof Error ? err.message : 'Az adatlap létrehozása váratlanul meghiúsult.');
    } finally {
      setLetrehozasFolyamatban(false);
    }
  }

  // backlog-40 (3. döntés): a "Terv adatai" lépés ELŐRE elhagyásakor
  // (csak amíg ez a kártya mountolva van, lásd LepesGuardContext.tsx fejlécét)
  // vagy a fallback-létrehozás ajánlatát, vagy a diff-promptot nyitja meg --
  // sosem mindkettőt egyszerre, a törzsadat léte dönti el, melyiket.
  const handleLepesElhagyas = useCallback(
    (proceed: () => void): boolean => {
      // 94. tétel: névütközés esetén egyik draft->master ajánlat sem
      // kínálható fel -- a lépésváltás akadálytalanul megy tovább, a
      // blokk a véglegesítésnél áll (domain/veglegesitesOr.ts).
      if (nevUtkozes) return false;
      if (torzsadat === null && !loadError && !letrehozasPromptEldontve) {
        proceedRef.current = proceed;
        setLetrehozasHiba(null);
        setLetrehozasPromptOpen(true);
        return true;
      }
      if (utkozesek.length === 0) return false;
      if (diffId === elutasitottDiffId) return false;
      proceedRef.current = proceed;
      setLepesPromptOpen(true);
      return true;
    },
    [nevUtkozes, torzsadat, loadError, letrehozasPromptEldontve, utkozesek.length, diffId, elutasitottDiffId],
  );

  useLepesElhagyas(patientDir ? handleLepesElhagyas : null);

  if (!patientDir) return null;

  return (
    <Box>
      <Separator size="4" my="3" />
      <Text as="p" size="1" weight="bold" mb="3" color="gray">
        Páciens adatlapja
      </Text>

      {loadError && (
        <Callout.Root color="gray" size="1">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>A páciens adatlapjának betöltése nem sikerült: {loadError}</Callout.Text>
        </Callout.Root>
      )}

      {!loadError && torzsadat === undefined && (
        <Text size="2" color="gray">
          Betöltés…
        </Text>
      )}

      {!loadError && torzsadat === null && (
        <Box>
          <Callout.Root color="gray" size="1" mb="3">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              Ennek a páciensnek még nincs önálló adatlapja — a mentés a legutóbb mentett terv
              adataiból hoz létre egyet, a most a lapon látott mezőkkel.
            </Callout.Text>
          </Callout.Root>
          {createError && (
            <Text as="div" size="1" mb="2" style={{ color: t.danger }}>
              {createError}
            </Text>
          )}
          <Button
            size="1"
            variant="soft"
            disabled={creating || nevUtkozes}
            onClick={() => void handleManualCreate()}
          >
            {creating ? 'Létrehozás…' : 'Adatlap létrehozása a terv adataiból'}
          </Button>
          {nevUtkozes && (
            <Text as="div" size="1" mt="2" style={{ color: t.danger }}>
              A Név mező egy másik, létező páciensre illik pontosan — javítsd a nevet, mielőtt a
              adatlapot a terv adataiból hoznád létre.
            </Text>
          )}
        </Box>
      )}

      {!loadError && master && (
        <Box>
          {utkozesek.length === 0 && potlasok.length === 0 && (
            <Text size="2" color="gray">
              A páciens adatlapja és a terv adatai megegyeznek.
            </Text>
          )}

          {/* Pótlás: csak az egyik oldalon van érték -- nincs mit mérlegelni,
              ezért egyetlen gomb, checkbox-tábla nélkül. Ára, hogy egy mező
              nem hagyható ki a pótlásból. */}
          {potlasok.length > 0 && (
            <Box mb={utkozesek.length > 0 ? '4' : '0'}>
              <Text as="p" size="2" color="gray" mb="3">
                {potlasok.length} mező csak az egyik helyen van kitöltve — a pótlás mindkét
                irányban a kitöltött értéket veszi át.
              </Text>
              {potlasHiba && (
                <Text as="div" size="1" mb="2" style={{ color: t.danger }}>
                  {potlasHiba}
                </Text>
              )}
              <Button
                size="1"
                disabled={potlasFolyamatban || nevUtkozes}
                onClick={() => void handlePotlas()}
              >
                {potlasFolyamatban
                  ? 'Pótlás…'
                  : potlasHiba
                    ? 'Újra'
                    : 'Hiányzó mezők pótlása mindkét helyen'}
              </Button>
            </Box>
          )}

          {utkozesek.length > 0 && (
            <Box>
              <Text as="p" size="2" color="gray" mb="3">
                {utkozesek.length} mező eltér a páciens adatlapjától.
              </Text>
              <Flex gap="2" wrap="wrap">
                <Button size="1" variant="soft" onClick={() => setManualDialog('master-to-draft')}>
                  Frissítés az adatlapról
                </Button>
                <Button
                  size="1"
                  variant="soft"
                  disabled={nevUtkozes}
                  onClick={() => setManualDialog('draft-to-master')}
                >
                  Az adatlap frissítése a tervből
                </Button>
              </Flex>
            </Box>
          )}

          {nevUtkozes && (utkozesek.length > 0 || potlasok.length > 0) && (
            <Text as="div" size="1" mt="2" style={{ color: t.danger }}>
              A Név mező egy másik, létező páciensre illik pontosan — javítsd a nevet, mielőtt az
              adatlapot a terv adataiból frissítenéd.
            </Text>
          )}

          <TorzsadatDiffDialog
            open={manualDialog !== null}
            onOpenChange={(o) => !o && setManualDialog(null)}
            irany={manualDialog ?? 'draft-to-master'}
            elteresek={utkozesek}
            master={master}
            draft={plan.paciens}
            onApplyToDraft={applyToDraft}
            onApplyToMaster={writeMaster}
          />

          <TorzsadatDiffDialog
            open={lepesPromptOpen}
            onOpenChange={(o) => !o && skipLepesPrompt()}
            irany="draft-to-master"
            elteresek={utkozesek}
            master={master}
            draft={plan.paciens}
            onApplyToMaster={writeMaster}
            onSkip={skipLepesPrompt}
          />
        </Box>
      )}

      <AlertDialog.Root
        open={letrehozasPromptOpen}
        onOpenChange={(o) => !o && skipLetrehozasPrompt()}
      >
        <AlertDialog.Content maxWidth="440px">
          <AlertDialog.Title>Mentsem a páciens adatlapjára is?</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Ennek a páciensnek még nincs önálló adatlapja — a most beírt adatok egyelőre csak ehhez
            a tervhez tartoznak. Ha mented, a következő terve már ezekkel indul; ha kihagyod,
            később a páciens lapján is pótolhatod.
          </AlertDialog.Description>
          {letrehozasHiba && (
            <Callout.Root color="red" size="1" mt="3">
              <Callout.Icon>
                <CrossCircledIcon />
              </Callout.Icon>
              <Callout.Text>{letrehozasHiba}</Callout.Text>
            </Callout.Root>
          )}
          <Flex gap="3" mt="4" justify="end">
            <Button
              type="button"
              variant="soft"
              color="gray"
              disabled={letrehozasFolyamatban}
              onClick={skipLetrehozasPrompt}
            >
              Kihagyás, tovább lépek
            </Button>
            <Button disabled={letrehozasFolyamatban} onClick={() => void confirmLetrehozasPrompt()}>
              {letrehozasFolyamatban ? 'Mentés…' : letrehozasHiba ? 'Újra' : 'Mentés az adatlapra'}
            </Button>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}
