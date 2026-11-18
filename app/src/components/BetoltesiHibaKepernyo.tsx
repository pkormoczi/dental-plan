// Az alkalmazás betöltési hibája (sérült vagy újabb sémájú árlista, beállítások, olvasási hiba).
// A telepített appban innen is el kell tudni jutni egy másik adatmappához, és meg kell tudni
// nézni a mappát: a Beállítások ilyenkor nem érhetők el. A demóban csak az újrapróba van.

import { useMemo, useState, type ReactNode } from 'react';
import { Box, Button, Callout, Flex, Text } from '@radix-ui/themes';
import { t } from '../design/tokens';
import { piszkozatTartalmas } from '../domain/piszkozat';
import { useStorage, type Adattarolas } from '../storage/StorageContext';
import { useMappaValtas } from './useMappaValtas';

export default function BetoltesiHibaKepernyo({ hiba, onUjra }: { hiba: Error; onUjra: () => void }) {
  const { adattarolas } = useStorage();
  const ujra = <Button onClick={onUjra}>Újrapróbálás</Button>;
  return (
    <Box style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center', padding: 24 }}>
      <Text as="p" size="3" weight="bold" mb="2" style={{ color: t.danger }}>
        Nem sikerült betölteni az adatokat
      </Text>
      <Text as="p" size="2" color="gray" mb="4">
        {hiba.message}
      </Text>
      {adattarolas ? (
        <TelepitettGombok adattarolas={adattarolas}>{ujra}</TelepitettGombok>
      ) : (
        <Flex justify="center">{ujra}</Flex>
      )}
    </Box>
  );
}

function TelepitettGombok({ adattarolas, children }: { adattarolas: Adattarolas; children: ReactNode }) {
  const { drafts } = useStorage();
  const [hiba, setHiba] = useState<string | null>(null);
  // Az AppState nem töltődött be, a piszkozatot a tárolóból kell megnézni. Ha nem olvasható,
  // akkor is kérdez: csendben semmi nem veszhet el.
  const felkesz = useMemo(
    () => ({
      van: async () => {
        try {
          const rec = await drafts.load();
          return rec != null && piszkozatTartalmas(rec.plan);
        } catch {
          return true;
        }
      },
      elvet: () => drafts.clear(),
    }),
    [drafts],
  );
  const { valasztas, dialogusok } = useMappaValtas(adattarolas, felkesz);

  async function megnyit() {
    setHiba(null);
    try {
      await adattarolas.megnyit();
    } catch (err) {
      setHiba(err instanceof Error ? err.message : String(err));
    }
  }

  const gombHiba = hiba ?? (valasztas.mutatott ? null : valasztas.hiba);
  return (
    <>
      <Flex justify="center" gap="3" wrap="wrap">
        {children}
        <Button variant="soft" onClick={() => void megnyit()}>
          Mappa megnyitása
        </Button>
        <Button variant="soft" disabled={valasztas.folyamatban} onClick={() => void valasztas.valassz()}>
          Másik mappa kiválasztása
        </Button>
      </Flex>
      {gombHiba && (
        <Callout.Root color="red" mt="4" role="alert" style={{ textAlign: 'left' }}>
          <Callout.Text>{gombHiba}</Callout.Text>
        </Callout.Root>
      )}
      {dialogusok}
    </>
  );
}
