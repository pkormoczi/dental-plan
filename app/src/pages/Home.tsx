import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, Box, Button, Callout, Card, Flex, Heading, Text } from '@radix-ui/themes';
import { t } from '../design/tokens';
import { useAppState } from '../state/AppState';
import { useStorage } from '../storage/StorageContext';

type PendingAction = 'reset' | 'clearAll' | null;

/**
 * Csak a Home "Piszkozat folytatása" kártyájának időbélyege -- nem a
 * nyomtatvány (docs/04-nyomtatvany-spec.md) formátuma, ezért nem
 * `domain/date.ts` `formatLongDate`/`formatShortDate`-je: azok tisztán
 * naptári dátumot (nap felbontás, UTC-re rögzítve) formáznak, ide viszont
 * egy tényleges időpillanat (dátum + óra:perc, a böngésző időzónájában)
 * kell.
 */
function formatPiszkozatIdo(iso: string): string {
  const d = new Date(iso);
  const datum = d.toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const ido = d.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
  return `${datum} ${ido}`;
}

export default function Home() {
  const { resetDemoData, clearAll } = useStorage();
  const {
    plan,
    reloadFromStorage,
    vanMentetlenPiszkozat,
    piszkozatMentve,
    piszkozatHiba,
    discardPersistedDraft,
  } = useAppState();
  const navigate = useNavigate();
  const [justReset, setJustReset] = useState(false);
  const [justCleared, setJustCleared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  async function performReset() {
    setPendingAction(null);
    setError(null);
    try {
      resetDemoData();
      // P0-6: korábban itt állt meg a reset -- a localStorage frissült, de
      // az AppState memóriabeli settings/priceList/plan state-je nem, így a
      // következő mentés csendben visszaírta a régi állapotot a friss seed
      // fölé. A "Visszaállítva ✓" csak akkor jelenik meg, ha ez is lefutott.
      await reloadFromStorage();
      setJustReset(true);
      setTimeout(() => setJustReset(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A visszaállítás váratlanul meghiúsult.');
    }
  }

  async function performClearAll() {
    setPendingAction(null);
    setError(null);
    try {
      clearAll();
      resetDemoData();
      await reloadFromStorage();
      setJustCleared(true);
      setTimeout(() => setJustCleared(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A törlés váratlanul meghiúsult.');
    }
  }

  async function handleDiscardDraft() {
    setError(null);
    try {
      await discardPersistedDraft();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A piszkozat elvetése váratlanul meghiúsult.');
    }
  }

  // docs/03-funkcionalis-spec.md § Autosave: ugyanaz a felülírás-kockázat,
  // mint a "Demó adat visszaállítása"/"Minden adat törlése" gomboknál -- a
  // doki figyelmetlenül eldobná a folyamatban lévő munkáját. Egyetlen
  // AlertDialog, cím/leírás/gombfelirat/onConfirm egy lookup-táblából -- 3
  // ágnál az egymásba ágyazott ternáriusok már olvashatatlanok lennének.
  const confirmSpecs: Record<
    Exclude<PendingAction, null>,
    { title: string; description: string; actionLabel: string; onConfirm: () => void }
  > = {
    reset: {
      title: 'Demó adat visszaállítása',
      description: 'Biztosan visszaállítod a demó adatot? Minden saját szerkesztésed elvész.',
      actionLabel: 'Visszaállítás',
      onConfirm: () => void performReset(),
    },
    clearAll: {
      title: 'Minden adat törlése',
      description:
        'Biztosan törlöd ÖSSZES adatot (árlista, beállítások, minden mentett terv)? Ez ' +
        'nem demó-visszaállítás, hanem teljes törlés -- utána a Demó adat visszaállítása ' +
        'gombbal tudsz újra a seedből kiindulni.',
      actionLabel: 'Törlés',
      onConfirm: () => void performClearAll(),
    },
  };
  const activeSpec = pendingAction ? confirmSpecs[pendingAction] : null;

  return (
    <Box style={{ maxWidth: 640, margin: '0 auto' }}>
      <Heading size="6" mb="1" style={{ color: t.brand }}>
        Kezelési terv és árajánlat
      </Heading>
      <Text as="p" size="2" color="gray" mb="5">
        Mándoki Dental — demó verzió a UX validálásához.
      </Text>

      {error && (
        <Callout.Root color="red" mb="4">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      {piszkozatHiba && (
        <Card size="2" mb="4">
          <Callout.Root color="red" mb="3">
            <Callout.Text>
              A mentett piszkozatot nem sikerült visszaállítani: {piszkozatHiba}
            </Callout.Text>
          </Callout.Root>
          <Text as="p" size="2" color="gray" mt="0" mb="3">
            A piszkozat nem tűnt el, csak nem olvasható -- ha nem tudod/akarod
            helyreállítani, itt elvetheted. Ha inkább új munkát kezdesz, az automatikusan
            felülírja.
          </Text>
          <Button variant="soft" color="gray" onClick={handleDiscardDraft}>
            Piszkozat elvetése
          </Button>
        </Card>
      )}

      {vanMentetlenPiszkozat && (
        <Card size="2" mb="4">
          <Text as="p" size="2" weight="bold" mb="1" style={{ color: t.brand }}>
            Piszkozat folytatása
          </Text>
          <Text as="p" size="2" mt="0" mb="1">
            {plan.paciens.nev.trim() || 'Névtelen piszkozat'}
          </Text>
          {piszkozatMentve && (
            <Text as="p" size="1" color="gray" mt="0" mb="3">
              Utolsó módosítás: {formatPiszkozatIdo(piszkozatMentve)}
            </Text>
          )}
          <Button onClick={() => navigate(plan.paciens.nev.trim() ? '/terv' : '/paciens')}>
            Megnyitás
          </Button>
        </Card>
      )}

      <Card size="2" mb="4">
        <Text as="p" size="2" mt="0">
          Ez a mockup a végleges alkalmazás vázán fut, demó adatokkal. A
          véglegesben ugyanez az alkalmazás egy, a doki gépén kijelölt
          mappába ír majd — itt egyelőre a böngésző tárolja az adatot.
        </Text>
        <Flex gap="3" mt="4" wrap="wrap">
          {/* A piszkozat-felülírás-őr innentől az /uj-terv köztes
              páciens-választón fut le (csak ott dől el ténylegesen, hogy a
              doki egy meglévő pácienshez vagy egy vadonatújhoz indul-e) --
              ez a gomb feltétel nélkül odanavigál. */}
          <Button onClick={() => navigate('/uj-terv')}>Új terv indítása</Button>
          <Button variant="soft" color="gray" onClick={() => navigate('/tervek')}>
            Korábbi tervek
          </Button>
          <Button variant="soft" color="gray" onClick={() => setPendingAction('reset')}>
            {justReset ? 'Visszaállítva ✓' : 'Demó adat visszaállítása'}
          </Button>
        </Flex>
      </Card>

      <Card size="2" mb="4">
        <Text as="p" size="2" weight="bold" mb="2" style={{ color: t.danger }}>
          Adatvédelem
        </Text>
        <Text as="p" size="2" color="gray" mt="0">
          Ez a demó a böngésző <Text style={{ fontFamily: t.mono }}>localStorage</Text>-ában,
          titkosítatlanul tárol mindent, amit beírsz -- ide valódi páciensadat nem való (lásd a
          fenti DEMÓ sávot). Ha véletlenül mégis valódit vittél be, ez a gomb ténylegesen kiüríti a
          tárolót (nem csak visszaseedeli a demó adatot).
        </Text>
        <Button color="red" variant="soft" onClick={() => setPendingAction('clearAll')}>
          {justCleared ? 'Törölve ✓' : 'Minden adat törlése'}
        </Button>
      </Card>

      <AlertDialog.Root
        open={pendingAction !== null}
        onOpenChange={(open) => !open && setPendingAction(null)}
      >
        <AlertDialog.Content maxWidth="440px">
          <AlertDialog.Title>{activeSpec?.title}</AlertDialog.Title>
          <AlertDialog.Description size="2">{activeSpec?.description}</AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Mégse
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color="red" onClick={activeSpec?.onConfirm}>
                {activeSpec?.actionLabel}
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}
