// Köztes kereső/választó lépés a Home "+ Új kezelési terv" gombja után (D29,
// docs/03-funkcionalis-spec.md § Új terv indítása). A Korábbi tervek oldal
// saját "Új terv"/"Másolás új tervbe" gombjai NEM ide navigálnak -- azoknál
// a célpáciens már adott a forrás tervből, nincs kétértelműség.

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  Box,
  Button,
  Callout,
  Card,
  Flex,
  Heading,
  Separator,
  Text,
  TextField,
} from '@radix-ui/themes';
import { CrossCircledIcon } from '@radix-ui/react-icons';
import { t } from '../design/tokens';
import { aktivitasSzoveg, legutobbAktivPaciensek, UJ_TERV_RECENT_LIMIT } from '../domain/paciensAktivitas';
import { KERESES_MIN_KARAKTER, paciensTalalatok } from '../domain/paciensKereses';
import type { PatientFolder } from '../domain/types';
import { useAppState } from '../state/AppState';
import { ujTervForrasPaciensbol } from '../state/planIndulas';
import { useStorage } from '../storage/StorageContext';
import UjPaciensDialog from './paciensek/UjPaciensDialog';

type PendingAction =
  | { kind: 'existing'; patient: PatientFolder }
  | { kind: 'new'; nev?: string };

export default function NewPlanPage() {
  const { storage } = useStorage();
  const { settings, priceList, copyPlanIntoDraft, vanMentetlenPiszkozat } = useAppState();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<PatientFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const [selectingDir, setSelectingDir] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // A "Vadonatúj páciens"/no-match ág mostantól a quick-create dialóguson át
  // hoz létre valódi Patient-rekordot MÉG A TERV ELŐTT (D14, backlog-36) --
  // korábban `resetPlanDraft()` egyenesen egy üres draftra navigált, rekord
  // nélkül. Az `ujNev` a no-match opció begépelt szövege, a dialógus ezzel
  // előtöltve nyílik.
  const [ujOpen, setUjOpen] = useState(false);
  const [ujNev, setUjNev] = useState<string | undefined>(undefined);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setListError(null);
      try {
        const list = await storage.listPatients();
        if (!cancelled) setPatients(list);
      } catch (err) {
        if (!cancelled) {
          setListError(
            err instanceof Error ? err.message : 'A páciensek listázása váratlanul meghiúsult.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storage]);

  const most = useMemo(() => new Date(), []);
  const trimmed = q.trim();
  // 0-1 karakternél a legutóbbi aktivitású páciensek (a Kezdőlappal közös
  // helper, D39/D40), 2+ karaktertől relevancia szerinti keresés
  // (`paciensKereses.ts`) -- lásd docs/03-funkcionalis-spec.md „Új terv
  // indítása".
  const isSearching = trimmed.length >= KERESES_MIN_KARAKTER;
  const recents = useMemo(
    () => legutobbAktivPaciensek(patients, UJ_TERV_RECENT_LIMIT),
    [patients],
  );
  const talalatok = useMemo(
    () => (isSearching ? paciensTalalatok(patients, q) : []),
    [isSearching, patients, q],
  );
  const listaTetelek = isSearching ? talalatok : recents;
  // Nulla találatnál egy közvetlen "Új páciens" pszeudó-opció a begépelt
  // névvel -- az ItemPicker "egyedi tétel felvétele" mintája (D40). A
  // mindig látható, kereső fölötti "+ Új páciens" gomb emellett is megmarad.
  const ujPaciensOpcio = isSearching && talalatok.length === 0;
  const opcioSzam = listaTetelek.length + (ujPaciensOpcio ? 1 : 0);

  useEffect(() => setHi(0), [q]);
  useEffect(() => {
    itemRefs.current[hi]?.scrollIntoView({ block: 'nearest' });
  }, [hi]);

  // A páciens ELÉRHETŐ legjobb adataiból tölti elő a Páciens adatlapot: a
  // lezárt törzsadatból (paciens-adatok.json, D33), ha van, egyébként a
  // LEGUTÓBB MÓDOSÍTOTT terv-lánc legfrissebb verziójából -- ugyanaz a
  // közös kiválasztás, mint az OsszesTervSection páciensszintű "Új terv"
  // gombjáé (state/planIndulas.ts).
  async function selectExistingPatient(patient: PatientFolder) {
    setSelectError(null);
    setSelectingDir(patient.dirName);
    try {
      const next = await ujTervForrasPaciensbol(storage, settings, priceList, patient.dirName);
      copyPlanIntoDraft(next, patient.dirName);
      navigate('/paciens');
    } catch (err) {
      setSelectError(
        err instanceof Error
          ? `A páciens adatainak átvétele nem sikerült: ${err.message}`
          : 'A páciens adatainak átvétele váratlanul meghiúsult.',
      );
    } finally {
      setSelectingDir(null);
    }
  }

  // A `nev` a no-match ág begépelt szövege (docs/03-funkcionalis-spec.md
  // „Új terv indítása") -- a mindig látható "+ Új páciens" gomb `nev`
  // nélkül hívja. Csak MEGNYITJA a quick-create dialógust -- a tényleges
  // rekordlétrehozás és navigáció a `createAndStart` sikerágában történik.
  function openQuickCreate(nev?: string) {
    setCreateError(null);
    setUjNev(nev);
    setUjOpen(true);
  }

  function runOrConfirm(action: PendingAction) {
    if (vanMentetlenPiszkozat) {
      setPending(action);
      return;
    }
    dispatchPending(action);
  }

  function dispatchPending(action: PendingAction) {
    if (action.kind === 'existing') {
      void selectExistingPatient(action.patient);
    } else {
      openQuickCreate(action.nev);
    }
  }

  // Sikeres `storage.createPatient` után UGYANAZT a `selectExistingPatient`-et
  // futtatjuk a frissen létrehozott mappára: a `paciens-adatok.json` (amit a
  // `createPatient` már megírt) miatt `ujTervForrasPaciensbol` a törzsadat-ágon
  // tölt elő, a `copyPlanIntoDraft(next, folder.dirName)` pedig kitölti a
  // draft `patientDir`-jét (D37) -- külön kód nélkül teljesíti a terv-doc 5.
  // döntését, és a későbbi `savePlan` a MÁR LÉTEZŐ páciensmappába ment.
  async function createAndStart(nev: string, kezdoAdatok: { szuletesiIdo: string; telefon: string }) {
    setCreateError(null);
    try {
      const folder = await storage.createPatient(nev, kezdoAdatok);
      setPatients((prev) => [...prev, folder]);
      setUjOpen(false);
      await selectExistingPatient(folder);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Az új páciens felvitele váratlanul meghiúsult.',
      );
    }
  }

  // Escape/Mégse/kattintás a felugró ablakon kívül -- sikeres létrehozás
  // nélküli zárás. Az `UjPaciensDialog.tsx` `Dialog.Content`-je (trigger
  // nélküli, kontrollált `Dialog.Root`) mindig megelőzi a beépített
  // `onCloseAutoFocus`-t -- a `triggerRef` null, a fókusz különben a
  // body-ra esne (ugyanaz a Radix-mintájú bug, mint amit az
  // `UjPaciensDialog.tsx` `AlertDialog.Content` kommentje igazol),
  // megszakítva a gépel -> nyíl -> Enter ciklust -- ezért itt kézzel
  // visszaadjuk a keresőmezőnek. A `q` state-hez NEM nyúlunk (D205): a
  // keresőszöveg megmarad.
  function handleUjOpenChange(open: boolean) {
    setUjOpen(open);
    if (!open) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }

  // A tételkereső (ItemPicker.tsx:129-159) gépel -> nyíl -> Enter/Esc
  // ciklusának adaptálása (D40) -- a listaTetelek + a no-match "Új
  // páciens" pszeudó-opció közös indextartományán ([0, opcioSzam)) mozog.
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setQ('');
      return;
    }
    if (!opcioSzam) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHi((h) => (h + 1) % opcioSzam);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((h) => (h - 1 + opcioSzam) % opcioSzam);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (hi < listaTetelek.length) runOrConfirm({ kind: 'existing', patient: listaTetelek[hi] });
      else if (ujPaciensOpcio) runOrConfirm({ kind: 'new', nev: trimmed });
    }
  }

  const pendingSpecs: Record<PendingAction['kind'], { description: string; actionLabel: string }> = {
    existing: {
      description:
        'Van mentetlen piszkozatod. Ha ennek a páciensnek az adataival új tervet indítasz, a ' +
        'jelenlegi piszkozat elvész -- nem került fájlba, csak ebben a böngészőben volt meg. ' +
        'Biztosan folytatod?',
      actionLabel: 'Folytatás, piszkozat elvetésével',
    },
    new: {
      description:
        'Van mentetlen piszkozatod. Ha új tervet indítasz, ez elvész -- nem került fájlba, ' +
        'csak ebben a böngészőben volt meg. Biztosan új tervvel kezded?',
      actionLabel: 'Elvetés és új terv',
    },
  };

  return (
    <Box style={{ maxWidth: 640, margin: '0 auto' }}>
      <Heading size="5" mb="1" style={{ color: t.brand }}>
        Új terv indítása
      </Heading>
      <Text as="p" size="2" color="gray" mb="4">
        Vegyél fel egy új pácienst, vagy keress rá egy visszatérőre — az ő mentett
        adatait a terv átveszi, nem kell újragépelni.
      </Text>

      {selectError && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>{selectError}</Callout.Text>
        </Callout.Root>
      )}

      <Button type="button" onClick={() => runOrConfirm({ kind: 'new' })}>
        + Új páciens
      </Button>

      <Flex align="center" gap="3" my="4">
        <Separator size="4" style={{ flexGrow: 1, width: 'auto' }} />
        <Text size="1" color="gray">
          vagy
        </Text>
        <Separator size="4" style={{ flexGrow: 1, width: 'auto' }} />
      </Flex>

      <Card size="2">
        <Text as="p" size="2" weight="bold" mb="2">
          Meglévő páciens keresése…
        </Text>
        <TextField.Root
          ref={searchInputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Páciens neve…"
          aria-label="Meglévő páciens keresése"
          autoFocus
          mb="3"
        />
        {listError && (
          <Callout.Root color="red" mb="3">
            <Callout.Icon>
              <CrossCircledIcon />
            </Callout.Icon>
            <Callout.Text>A lista betöltése nem sikerült: {listError}</Callout.Text>
          </Callout.Root>
        )}
        {loading && (
          <Text as="p" size="2" color="gray">
            Betöltés…
          </Text>
        )}
        {!loading && !listError && patients.length === 0 && (
          <Text as="p" size="2" color="gray">
            Még nincs mentett terv, akihez visszatérhetnél.
          </Text>
        )}
        {!loading && !listError && patients.length > 0 && !isSearching && (
          <>
            <Text as="p" size="1" color="gray" mb="2">
              Legutóbbi páciensek
            </Text>
            {recents.length === 0 && (
              <Text as="p" size="2" color="gray">
                Kezdj el gépelni a kereséshez.
              </Text>
            )}
            {trimmed.length === 1 && (
              <Text as="p" size="1" color="gray" mb="2">
                Legalább {KERESES_MIN_KARAKTER} karakter a kereséshez.
              </Text>
            )}
          </>
        )}
        {!loading && !listError && isSearching && talalatok.length === 0 && (
          <Text as="p" size="2" color="gray" mb="1">
            Nincs találat erre: „{q}”.
          </Text>
        )}
        {!loading && !listError && listaTetelek.length > 0 && (
          <Flex direction="column" gap="1">
            {listaTetelek.map((p, i) => (
              <Button
                key={p.dirName}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                variant="soft"
                color="gray"
                disabled={selectingDir === p.dirName}
                onClick={() => runOrConfirm({ kind: 'existing', patient: p })}
                onMouseEnter={() => setHi(i)}
                style={{
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  height: 'auto',
                  padding: '8px 12px',
                  background: i === hi ? t.accentWash : undefined,
                  boxShadow: i === hi ? `inset 3px 0 0 ${t.accent}` : undefined,
                }}
              >
                <Text size="2">{p.nev}</Text>
                {!isSearching && p.utolsoAktivitas && (
                  <Text size="1" color="gray">
                    {aktivitasSzoveg(p.utolsoAktivitas, most)}
                  </Text>
                )}
              </Button>
            ))}
          </Flex>
        )}
        {!loading && !listError && ujPaciensOpcio && (
          <Button
            ref={(el) => {
              itemRefs.current[listaTetelek.length] = el;
            }}
            type="button"
            variant="soft"
            color="gray"
            onClick={() => runOrConfirm({ kind: 'new', nev: trimmed })}
            onMouseEnter={() => setHi(listaTetelek.length)}
            style={{
              justifyContent: 'flex-start',
              width: '100%',
              background: hi === listaTetelek.length ? t.accentWash : undefined,
              boxShadow: hi === listaTetelek.length ? `inset 3px 0 0 ${t.accent}` : undefined,
            }}
          >
            Új páciens: „{trimmed}”
          </Button>
        )}
      </Card>

      <UjPaciensDialog
        open={ujOpen}
        onOpenChange={handleUjOpenChange}
        patients={patients}
        initialNev={ujNev}
        onSave={(nev, kezdoAdatok) => void createAndStart(nev, kezdoAdatok)}
        onUseExisting={(p) => {
          setUjOpen(false);
          void selectExistingPatient(p);
        }}
        submitError={createError}
      />

      <AlertDialog.Root open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialog.Content maxWidth="440px">
          <AlertDialog.Title>Piszkozat felülírása</AlertDialog.Title>
          <AlertDialog.Description size="2">
            {pending && pendingSpecs[pending.kind].description}
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
                  if (pending) dispatchPending(pending);
                  setPending(null);
                }}
              >
                {pending && pendingSpecs[pending.kind].actionLabel}
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}
