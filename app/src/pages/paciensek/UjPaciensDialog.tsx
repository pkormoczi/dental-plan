// Új páciens felvitele terv nélkül (backlog-28, 6. döntés; backlog-36,
// D14/D15 -- mindkét belépési pontot ez a közös dialógus szolgálja:
// `PaciensekPage.tsx` "+ Új páciens" ÉS a `NewPlanPage.tsx` "Vadonatúj
// páciens"/no-match ága). `priceListAdmin/UjTetelDialog.tsx` mintája: csak
// a kötelező névre kérdez kötelezően, a többi (elérhetőség, TAJ, kiskorú
// stb.) a mentés UTÁN, a listában kinyíló sorban szerkeszthető -- a
// szuletesiIdo/telefon (D15) kivétel, mert azok "látható, de opcionális"
// mezőként a redesign explicit kéri már itt. Explicit Mentés/Mégse -- semmi
// nem kerül a törzsadatba a Mentés gomb megnyomása előtt.
//
// A duplikáció-detektálás (D42, `usePaciensDuplikacio`) kétfázisú: a
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
import DuplikacioJavaslatok from './DuplikacioJavaslatok';
import { Field } from '../../components/Field';
import { usePaciensDuplikacio } from '../../components/usePaciensDuplikacio';
import { t } from '../../design/tokens';
import type { DuplikaciosJelolt } from '../../domain/paciensDuplikacio';
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
   * D203/D204: névegyezésnél a doki a talált páciensre folytathatja a
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

function megerositesLeiras(megerosites: Megerosites): string {
  if (megerosites.kind === 'megis-uj') {
    const nevek = megerosites.jeloltek.map((j) => j.patient.nev).join(', ');
    return `Hasonló nevű páciens már létezik: ${nevek}.\nHa mégis új rekordot hozol létre, két külön páciens fog szerepelni ehhez hasonló néven.`;
  }
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
  // éri meg a plusz kattintást. Az `initialNev` (no-match ág) ettől
  // eltérően előtöltve indul.
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

  const { jeloltek, ellenoriz } = usePaciensDuplikacio({
    storage,
    patients,
    nev: nevTrim,
    szuletesiIdo,
    telefon,
  });

  function nyitMegerosites(next: Megerosites) {
    visszaFokuszRef.current = document.activeElement as HTMLElement | null;
    setMegerosites(next);
  }

  async function handleSubmit() {
    setMegprobaltMenteni(true);
    if (!nevTrim) return;
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="440px" onCloseAutoFocus={(e) => e.preventDefault()}>
        <Dialog.Title>Új páciens</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          A születési dátum és a telefon opcionális -- ezek és a többi adat (lakcím, TAJ, kiskorú
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

          <Grid columns="2" gap="3" mb="3">
            <Field label="Született">
              <TextField.Root
                type="date"
                value={szuletesiIdo}
                onChange={(e) => setSzuletesiIdo(e.target.value)}
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
            <AlertDialog.Description size="2" style={{ whiteSpace: 'pre-line' }}>
              {megerosites && megerositesLeiras(megerosites)}
            </AlertDialog.Description>
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
      </Dialog.Content>
    </Dialog.Root>
  );
}
