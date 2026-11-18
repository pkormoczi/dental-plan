// Kilépéskor, ha a munkamenetben írás történt, a main a bezárás előtt ezt kéri: rövid, magától
// eltűnő emlékeztető a gépváltási szabályra, ott, ahol a doki épp gépet vált (migrációs terv
// §6.4). Nem detektál semmit a Drive-ról; a „Bezárás most” azonnal kilép.

import { useEffect, useState } from 'react';
import { Button, Dialog, Flex } from '@radix-ui/themes';
import { useStorage } from '../storage/StorageContext';
import { DRIVE_EMLEKEZTETO } from './adatmappaSzovegek';

export const ZARO_KEPERNYO_MS = 4000;

export default function ZaroKepernyo() {
  const { zaras } = useStorage();
  const [nyitva, setNyitva] = useState(false);

  useEffect(() => zaras?.figyel(() => setNyitva(true)), [zaras]);

  useEffect(() => {
    if (!nyitva || !zaras) return;
    const idozito = setTimeout(() => void zaras.kilep().catch(() => {}), ZARO_KEPERNYO_MS);
    return () => clearTimeout(idozito);
  }, [nyitva, zaras]);

  if (!zaras) return null;
  // A main a határidő után a válasz nélkül is bezár: a kilépés hibája itt nem jelzendő.
  const kilep = () => void zaras.kilep().catch(() => {});
  return (
    <Dialog.Root open={nyitva} onOpenChange={(open) => !open && kilep()}>
      <Dialog.Content maxWidth="440px">
        <Dialog.Title>Bezárás</Dialog.Title>
        <Dialog.Description size="2">{DRIVE_EMLEKEZTETO}</Dialog.Description>
        <Flex justify="end" mt="4">
          <Button onClick={kilep}>Bezárás most</Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
