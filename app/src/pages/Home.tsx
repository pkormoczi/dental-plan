import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, Box, Button, Callout, Card, Flex, Heading, Text } from '@radix-ui/themes';
import { t } from '../design/tokens';
import { useAppState } from '../state/AppState';
import { useStorage } from '../storage/StorageContext';

type PendingAction = 'reset' | 'clearAll' | null;

export default function Home() {
  const { resetDemoData, clearAll } = useStorage();
  const { resetPlanDraft, reloadFromStorage } = useAppState();
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

  function startNewPlan() {
    resetPlanDraft();
    navigate('/paciens');
  }

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

      <Card size="2" mb="4">
        <Text as="p" size="2" mt="0">
          Ez a mockup a végleges alkalmazás vázán fut, demó adatokkal. A
          véglegesben ugyanez az alkalmazás egy, a doki gépén kijelölt
          mappába ír majd — itt egyelőre a böngésző tárolja az adatot.
        </Text>
        <Flex gap="3" mt="4" wrap="wrap">
          <Button onClick={startNewPlan}>Új terv indítása</Button>
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
          <AlertDialog.Title>
            {pendingAction === 'reset' ? 'Demó adat visszaállítása' : 'Minden adat törlése'}
          </AlertDialog.Title>
          <AlertDialog.Description size="2">
            {pendingAction === 'reset'
              ? 'Biztosan visszaállítod a demó adatot? Minden saját szerkesztésed elvész.'
              : 'Biztosan törlöd ÖSSZES adatot (árlista, beállítások, minden mentett terv)? Ez ' +
                'nem demó-visszaállítás, hanem teljes törlés -- utána a Demó adat visszaállítása ' +
                'gombbal tudsz újra a seedből kiindulni.'}
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
                onClick={pendingAction === 'reset' ? performReset : performClearAll}
              >
                {pendingAction === 'reset' ? 'Visszaállítás' : 'Törlés'}
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}
