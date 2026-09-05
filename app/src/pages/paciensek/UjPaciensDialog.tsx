// Új páciens felvitele terv nélkül (backlog-28, 6. döntés; backlog-36
// -- mindkét belépési pontot ez a közös dialógus szolgálja:
// `PaciensekPage.tsx` "+ Új páciens" ÉS a `NewPlanPage.tsx` "+ Új páciens"/
// no-match ága). `priceListAdmin/UjTetelDialog.tsx` mintája: csak
// a kötelező névre kérdez kötelezően, a többi (elérhetőség, TAJ, kiskorú
// stb.) a mentés UTÁN, a listában kinyíló sorban szerkeszthető -- a
// szuletesiIdo/telefon kivétel, mert azok "látható, de opcionális"
// mezőként a doki már itt kéri. Explicit Mentés/Mégse -- semmi
// nem kerül a törzsadatba a Mentés gomb megnyomása előtt.
//
// A duplikáció-detektálás (`usePaciensDuplikacio`) kétfázisú: a
// javaslat-lista (`DuplikacioJavaslatok`) inline, gépelés közben frissül; a
// Mentés gomb EMELLETT mindig lefuttatja a friss adatokra a save-time
// ellenőrzést (`ellenoriz`) is, mielőtt tényleg menteni. Egyetlen,
// diszkriminált-unió állapotú `AlertDialog` fedi le mindkét megerősítést:
// 'megis-uj' (nincs javaslat kiválasztva, a doki mégis új rekordot akar) és
// 'eltero-adat' (egy pontos névegyezésű találat adatai ELLENTMONDANAK a
// begépeltnek). Szándékosan NEM külön elsődleges gomb a "Mégis új páciens
// létrehozása" -- a megerősítő dialógus piros gombja önmagában teljesíti az
// explicit-akció követelményt, és elkerüli a Mentés gomb feliratának
// villogását gépelés közben.

import { useEffect, useRef, useState } from 'react';
import { AlertDialog, Box, Button, Dialog, Flex, Grid, Text, TextField } from '@radix-ui/themes';
import DiscardChangesDialog, { useDiscardGuard } from '../../components/DiscardChangesDialog';
import DuplikacioJavaslatok from './DuplikacioJavaslatok';
import JeloltSor from './JeloltSor';
import { Field } from '../../components/Field';
import { usePaciensDuplikacio } from '../../components/usePaciensDuplikacio';
import { draftDirty } from '../../components/useDirtyDraft';
import { t } from '../../design/tokens';
import { todayIso } from '../../domain/date';
import type { DuplikaciosJelolt } from '../../domain/paciensDuplikacio';
import { szuletesiIdoHiba } from '../../domain/paciensValidacio';
import type { PatientFolder } from '../../domain/types';
import { useStorage } from '../../storage/StorageContext';

export interface UjPaciensDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A duplikátum-figyelmeztetéshez. */
  patients: PatientFolder[];
  /** A kezdőnév -- a no-match "Új páciens: „…"" pszeudó-opció előtölti (NewPlanPage.tsx). */
  initialNev?: string;
  onSave: (nev: string, kezdoAdatok: { szuletesiIdo: string; telefon: string }) => void;
  /**
   * Névegyezésnél a doki a talált páciensre folytathatja a
   * flow-t ahelyett, hogy újat venne fel -- a begépelt adatok ilyenkor
   * eldobódnak, a hívó dönti el, mi történik (pl. a listasor megnyitása
   * vagy a terv-flow folytatása a meglévő páciensen).
   */
  onUseExisting?: (patient: PatientFolder) => void;
  /**
   * A mentés (storage-írás) hibája -- a dialógus NEM zárja saját magát a
   * Mentés gombra (lásd a `form onSubmit`-et), a hívó dönti el sikeres
   * mentéskor, hogy `open`-t `false`-ra állítja-e. Sikertelen mentésnél a
   * dialógus nyitva marad, a begépelt adatok nem vesznek el.
   */
  submitError?: string | null;
}

type Megerosites =
  | { kind: 'megis-uj'; jeloltek: DuplikaciosJelolt[] }
  | { kind: 'eltero-adat'; jelolt: DuplikaciosJelolt };

function megerositesCim(kind: Megerosites['kind']): string {
  return kind === 'megis-uj' ? 'Mégis új páciens létrehozása?' : 'A megadott adatok eltérnek';
}

function megerositesLeiras(megerosites: Extract<Megerosites, { kind: 'eltero-adat' }>): string {
  const j = megerosites.jelolt;
  const elteresek: string[] = [];
  if (j.szuletesiIdo === 'ellentmond') elteresek.push('a születési dátum');
  if (j.telefon === 'ellentmond') elteresek.push('a telefonszám');
  return `${j.patient.nev} nyilvántartott adatai eltérnek a most begépeltektől (${elteresek.join(' és ')}).\nBiztosan ezt a pácienst választod?`;
}

export default function UjPaciensDialog({
  open,
  onOpenChange,
  patients,
  initialNev,
  onSave,
  onUseExisting,
  submitError,
}: UjPaciensDialogProps) {
  const { storage } = useStorage();
  const [nev, setNev] = useState('');
  const [szuletesiIdo, setSzuletesiIdo] = useState('');
  const [telefon, setTelefon] = useState('');
  const [megprobaltMenteni, setMegprobaltMenteni] = useState(false);
  const [ellenorzesFolyamatban, setEllenorzesFolyamatban] = useState(false);
  const [megerosites, setMegerosites] = useState<Megerosites | null>(null);

  // A megerősítő dialógus bezárásakor a fókusznak IDE kell visszaesnie, nem
  // a <body>-ra -- lásd a `AlertDialog.Content onCloseAutoFocus` kommentjét
  // lent (Radix-forráskódban igazolt bug: kontrollált AlertDialog-nál a
  // `triggerRef` null, a beépített visszafókuszálás emiatt nem fut le).
  const visszaFokuszRef = useRef<HTMLElement | null>(null);
  // `ellenoriz` egy még folyamatban lévő betöltés közben zárt dialógusra ne
  // nyisson utólag megerősítést -- a `open` prop az adott hívás
  // pillanatában rögzült closure-értékét egy éllel frissebbre cseréli.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Minden megnyitáskor tiszta lappal indul -- ugyanaz a döntés, mint az
  // UjTetelDialog-nál: egy pár mezős űrlapnál a piszkozat-visszaírás nem
  // éri meg a plusz kattintást, csak egy zárás előtti megerősítés (lásd
  // `zarasDirty` lent). Az `initialNev` (no-match ág) ettől eltérően
  // előtöltve indul.
  useEffect(() => {
    if (open) {
      setNev(initialNev ?? '');
      setSzuletesiIdo('');
      setTelefon('');
      setMegprobaltMenteni(false);
      setMegerosites(null);
    }
  }, [open, initialNev]);

  const nevHiba = megprobaltMenteni && !nev.trim() ? 'A név nem lehet üres.' : null;
  const nevTrim = nev.trim();
  const szuletesiIdoHibaSzoveg = megprobaltMenteni ? szuletesiIdoHiba(szuletesiIdo, todayIso()) : null;

  const { jeloltek, ellenoriz } = usePaciensDuplikacio({
    storage,
    patients,
    nev: nevTrim,
    szuletesiIdo,
    telefon,
  });

  // Az induló állapothoz mérve dirty, nem az üres űrlaphoz -- a
  // `NewPlanPage` no-match ágán előtöltött, azóta érintetlenül hagyott
  // `initialNev` mellett a Mégse/Esc/kívülre kattintás nem kérdez semmit
  // (a név úgyis megmarad a keresőmezőben).
  const zarasDirty = draftDirty(
    { nev: nevTrim, szuletesiIdo, telefon },
    { nev: (initialNev ?? '').trim(), szuletesiIdo: '', telefon: '' },
  );
  const zarasGuard = useDiscardGuard(zarasDirty);

  function nyitMegerosites(next: Megerosites) {
    visszaFokuszRef.current = document.activeElement as HTMLElement | null;
    setMegerosites(next);
  }

  // A Mégse gomb, az Esc és a kívülre kattintás mind ide fut be (a
  // `Dialog.Root` teljesen kontrollált, nincs `Dialog.Trigger`) -- egyetlen
  // elfogási pont elég, nem kell `onEscapeKeyDown`/`onPointerDownOutside`
  // felülírás. A szülő általi zárás (sikeres mentés, `onUseExisting`) NEM
  // ezen megy át -- azok a hívó saját `open` state-jét állítják közvetlenül.
  function handleOpenChange(next: boolean) {
    if (next) {
      onOpenChange(next);
      return;
    }
    visszaFokuszRef.current = document.activeElement as HTMLElement | null;
    zarasGuard.request(() => onOpenChange(false));
  }

  async function handleSubmit() {
    setMegprobaltMenteni(true);
    if (!nevTrim || szuletesiIdoHiba(szuletesiIdo, todayIso())) return;
    setEllenorzesFolyamatban(true);
    try {
      const talalatok = await ellenoriz({ nev: nevTrim, szuletesiIdo, telefon });
      if (!openRef.current) return;
      if (talalatok.length > 0) {
        nyitMegerosites({ kind: 'megis-uj', jeloltek: talalatok });
        return;
      }
      onSave(nevTrim, { szuletesiIdo, telefon });
    } finally {
      setEllenorzesFolyamatban(false);
    }
  }

  function valasztottJelolt(jelolt: DuplikaciosJelolt) {
    if (jelolt.ellentmondas) {
      nyitMegerosites({ kind: 'eltero-adat', jelolt });
      return;
    }
    onUseExisting?.(jelolt.patient);
  }

  function megerositesAkcio() {
    if (!megerosites) return;
    if (megerosites.kind === 'megis-uj') {
      onSave(nevTrim, { szuletesiIdo, telefon });
    } else {
      onUseExisting?.(megerosites.jelolt.patient);
    }
    setMegerosites(null);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content maxWidth="440px" onCloseAutoFocus={(e) => e.preventDefault()}>
        <Dialog.Title>Új páciens</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          A születési dátum és a telefon opcionális — ezek és a többi adat (lakcím, TAJ, kiskorú
          stb.) a mentés után is szerkeszthetők maradnak.
        </Dialog.Description>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <Box mt="4" mb="3">
            <Field label="Név *">
              <TextField.Root
                autoFocus
                value={nev}
                onChange={(e) => setNev(e.target.value)}
                placeholder="Kovács János"
                aria-invalid={nevHiba ? true : undefined}
                style={nevHiba ? { boxShadow: `inset 0 0 0 1px ${t.danger}` } : undefined}
              />
            </Field>
            {nevHiba && (
              <Text as="div" size="1" mt="1" style={{ color: t.danger }}>
                {nevHiba}
              </Text>
            )}
            {!nevHiba && <DuplikacioJavaslatok jeloltek={jeloltek} onValaszt={valasztottJelolt} />}
          </Box>

          <Grid columns="2" gap="3" mb="1">
            <Field label="Született">
              <TextField.Root
                type="date"
                value={szuletesiIdo}
                onChange={(e) => setSzuletesiIdo(e.target.value)}
                aria-invalid={szuletesiIdoHibaSzoveg ? true : undefined}
                style={szuletesiIdoHibaSzoveg ? { boxShadow: `inset 0 0 0 1px ${t.danger}` } : undefined}
              />
            </Field>
            <Field label="Telefon">
              <TextField.Root
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                placeholder="+36 30 123 4567"
              />
            </Field>
          </Grid>
          {szuletesiIdoHibaSzoveg && (
            <Text as="div" size="1" mb="2" style={{ color: t.danger }}>
              {szuletesiIdoHibaSzoveg}
            </Text>
          )}

          {submitError && (
            <Text as="div" size="1" mb="2" style={{ color: t.danger }}>
              A mentés nem sikerült: {submitError}
            </Text>
          )}

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button type="button" variant="soft" color="gray">
                Mégse
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={ellenorzesFolyamatban}>
              Mentés
            </Button>
          </Flex>
        </form>

        <AlertDialog.Root open={megerosites !== null} onOpenChange={(o) => !o && setMegerosites(null)}>
          <AlertDialog.Content
            maxWidth="440px"
            // Radix-forráskódban igazolt bug (@radix-ui/react-dialog
            // onCloseAutoFocus): kontrollált (trigger nélküli) AlertDialog
            // bezárásakor a beépített visszafókuszálás `triggerRef.current`
            // null-ra fut, a fókusz a <body>-ra esne -- MÉG NYITOTT, fókusz-
            // csapdázott Dialog alatt. Kézi visszaadás kell.
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              requestAnimationFrame(() => visszaFokuszRef.current?.focus());
            }}
          >
            <AlertDialog.Title>{megerosites && megerositesCim(megerosites.kind)}</AlertDialog.Title>
            {megerosites?.kind === 'eltero-adat' ? (
              <AlertDialog.Description size="2" style={{ whiteSpace: 'pre-line' }}>
                {megerositesLeiras(megerosites)}
              </AlertDialog.Description>
            ) : (
              megerosites && (
                <>
                  <AlertDialog.Description size="2">Hasonló nevű páciens már létezik:</AlertDialog.Description>
                  <Flex direction="column" gap="2" mt="2">
                    {megerosites.jeloltek.map((jelolt) => (
                      <JeloltSor key={jelolt.patient.dirName} jelolt={jelolt} />
                    ))}
                  </Flex>
                  <Text as="div" size="2" mt="2">
                    Ha mégis új rekordot hozol létre, két külön páciens fog szerepelni ehhez hasonló néven.
                  </Text>
                </>
              )
            )}
            <Flex gap="3" mt="4" justify="end">
              <AlertDialog.Cancel>
                <Button variant="soft" color="gray">
                  Mégse
                </Button>
              </AlertDialog.Cancel>
              {/* NEM `AlertDialog.Action` -- a `PreviewPage.tsx` mintája: az
                  onSave/onUseExisting sikere/hibája után a HÍVÓ dönt az
                  `open`-ről, az `AlertDialog.Action` beépített auto-close-a
                  versenybe kerülne ezzel. */}
              <Button color="red" onClick={megerositesAkcio}>
                {megerosites?.kind === 'megis-uj'
                  ? 'Mégis új páciens létrehozása'
                  : 'Mégis ezt a pácienst választom'}
              </Button>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>

        <DiscardChangesDialog
          open={zarasGuard.pending}
          onOpenChange={(o) => !o && zarasGuard.cancel()}
          onConfirm={zarasGuard.confirm}
          title="Nem mentett adat"
          description="A begépelt név, születési dátum és telefon nem került mentésre — bezárással ez elvész. Biztosan bezárod?"
          confirmLabel="Bezárás, a begépelt adat elvetésével"
          visszaFokuszRef={visszaFokuszRef}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
