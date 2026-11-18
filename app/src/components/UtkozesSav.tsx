// A Kezdőlap amber sávja: amit a Drive-szinkron vagy egy félbemaradt mentés a gyökérmappában
// hagyott (migrációs terv §4.7). Az app semmit nem old fel; a doki tételenként a Fájlkezelőben
// rendez. A vizsgálat futásonként egyszer, a háttérben fut, és az „Elrejtés” is csak az app
// bezárásáig tart: újraindításkor a sáv visszajön, ha a tételek még megvannak.

import { useEffect, useState } from 'react';
import { Button, Callout, Flex, Text } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import type { PlanStorage, UtkozesFajta, UtkozesTetel } from '../storage/PlanStorage';
import { useStorage } from '../storage/StorageContext';
import { t } from '../design/tokens';

const FAJTA_SZOVEG: Record<UtkozesFajta, string> = {
  'drive-utkozes': 'A Drive két változatot tartott meg',
  'azonos-sorszam': 'Azonos sorszámú verzió',
  'utkozes-mentes': 'Ütközéskor félretett változat',
  'felbemaradt-mentes': 'Félbemaradt mentés maradványa',
};

// A tároló-példány egy app-futás: a vizsgálat és az elrejtés ehhez kötődik, nem a lap
// élettartamához.
const futasok = new WeakMap<PlanStorage, { lista: Promise<UtkozesTetel[]>; elrejtve: boolean }>();

function futas(storage: PlanStorage) {
  let f = futasok.get(storage);
  if (!f) {
    // A vizsgálat hibája nem lehet a Kezdőlap hibája: ilyenkor egyszerűen nincs sáv.
    f = { lista: storage.listUtkozesek().catch(() => []), elrejtve: false };
    futasok.set(storage, f);
  }
  return f;
}

export default function UtkozesSav() {
  const { storage, megmutat } = useStorage();
  const [tetelek, setTetelek] = useState<UtkozesTetel[]>([]);
  const [elrejtve, setElrejtve] = useState(() => futasok.get(storage)?.elrejtve ?? false);
  const [megnyitasHiba, setMegnyitasHiba] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void futas(storage).lista.then((lista) => {
      if (!cancelled) setTetelek(lista);
    });
    return () => {
      cancelled = true;
    };
  }, [storage]);

  if (elrejtve || tetelek.length === 0) return null;

  function elrejt() {
    futas(storage).elrejtve = true;
    setElrejtve(true);
  }

  async function mappaMegnyitasa(utvonal: string) {
    if (!megmutat) return;
    setMegnyitasHiba(null);
    try {
      await megmutat(utvonal);
    } catch (err) {
      setMegnyitasHiba(err instanceof Error ? err.message : 'A mappa nem nyitható meg.');
    }
  }

  return (
    <Callout.Root color="amber" mb="4">
      <Callout.Icon>
        <ExclamationTriangleIcon />
      </Callout.Icon>
      <Flex direction="column" gap="2" style={{ minWidth: 0 }}>
        <Flex justify="between" align="start" gap="3">
          <Callout.Text>
            Az adatmappában rendezetlen tételek vannak. Az alkalmazás egyiket sem módosítja: a
            Fájlkezelőben dönthetsz róluk.
          </Callout.Text>
          <Button size="1" variant="soft" color="gray" onClick={elrejt}>
            Elrejtés
          </Button>
        </Flex>
        {tetelek.map((tetel) => (
          <Flex key={tetel.utvonal} justify="between" align="center" gap="3" wrap="wrap">
            <Text size="2" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              {FAJTA_SZOVEG[tetel.fajta]}:{' '}
              <Text style={{ fontFamily: t.mono }}>{tetel.utvonal}</Text>
            </Text>
            {megmutat && (
              <Button size="1" variant="soft" color="gray" onClick={() => void mappaMegnyitasa(tetel.utvonal)}>
                Mappa megnyitása
              </Button>
            )}
          </Flex>
        ))}
        {megnyitasHiba && (
          <Text size="1" style={{ color: t.danger }}>
            A mappa nem nyitható meg: {megnyitasHiba}
          </Text>
        )}
      </Flex>
    </Callout.Root>
  );
}
