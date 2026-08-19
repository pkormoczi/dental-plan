// Demó-only adatkezelés (a Kezdőlapról átköltöztetve, D39): a mockup
// localStorage-alapú tárolójának visszaseedelése/kiürítése -- a végleges
// FileSystemStorage-nak (2. fázis) nincs megfelelője egyiknek sem, ezért
// ez a szekció maga is demó-only, mint a Filerendszer/Funkciók/Változásnapló
// fülek.

import { useEffect, useRef, useState } from 'react';
import { AlertDialog, Box, Button, Callout, Card, Flex, Text } from '@radix-ui/themes';
import { t } from '../../design/tokens';
import { useAppState } from '../../state/AppState';
import { useStorage } from '../../storage/StorageContext';

type PendingAction = 'reset' | 'clearAll' | null;

export default function AdatkezelesSection() {
  const { resetDemoData, clearAll } = useStorage();
  const { reloadFromStorage } = useAppState();
  const [justReset, setJustReset] = useState(false);
  const [justCleared, setJustCleared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  // A Home-on (ahol ez a gépezet korábban élt) a Radix Tabs nem játszott
  // szerepet -- itt igen: egy fülváltás 2.5s-en belül unmountolja ezt a
  // szekciót, a `setTimeout` enélkül egy már eltűnt komponensen állítana
  // state-et.
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
      if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
    },
    [],
  );

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
      resetTimeoutRef.current = setTimeout(() => setJustReset(false), 2500);
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
      clearTimeoutRef.current = setTimeout(() => setJustCleared(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A törlés váratlanul meghiúsult.');
    }
  }

  // Két demó-adat-pusztító akció, egy közös AlertDialoggal -- cím/leírás/
  // gombfelirat/onConfirm egy lookup-táblából, hogy a két ág egymás mellett,
  // olvashatóan álljon.
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
    <Box>
      {error && (
        <Callout.Root color="red" mb="4">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      <Card size="2" mb="4">
        <Text as="p" size="2" mt="0">
          Ez a mockup a végleges alkalmazás vázán fut, demó adatokkal. A
          véglegesben ugyanez az alkalmazás egy, a doki gépén kijelölt
          mappába ír majd — itt egyelőre a böngésző tárolja az adatot.
        </Text>
        <Flex gap="3" mt="4" wrap="wrap">
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
