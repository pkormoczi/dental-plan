// A Kezdőlap emlékeztetője, ha az utolsó biztonsági mentés 30 napnál régebbi vagy nincs
// (migrációs terv §6.5). Az „Elrejtés” csak erre a futásra szól: a következő indításkor, amíg
// nincs friss mentés, újra szól. A demóban nincs.

import { useState } from 'react';
import { Button, Callout, Flex, Text } from '@radix-ui/themes';
import { mentesEsedekes, mentesKoraNap } from '../domain/biztonsagiMentes';
import { useStorage, type BiztonsagiMentes } from '../storage/StorageContext';
import { LetoltesJelzo } from './LetoltesJelzo';
import { useBiztonsagiMentes } from './useBiztonsagiMentes';

const elrejtve = new WeakSet<BiztonsagiMentes>();

export default function MentesEmlekezteto() {
  const { biztonsagiMentes } = useStorage();
  if (!biztonsagiMentes) return null;
  return <Emlekezteto mentes={biztonsagiMentes} />;
}

function Emlekezteto({ mentes }: { mentes: BiztonsagiMentes }) {
  const { allapot, folyamatban, hiba, mentettNev, ment } = useBiztonsagiMentes(mentes);
  const [rejtve, setRejtve] = useState(() => elrejtve.has(mentes));

  if (mentettNev) {
    return (
      <Flex mb="3">
        <LetoltesJelzo fajlnev={mentettNev} felirat="Elmentve" />
      </Flex>
    );
  }
  if (rejtve || !allapot || !mentesEsedekes(allapot.utolso, new Date())) return null;

  const kor = mentesKoraNap(allapot.utolso, new Date());
  return (
    <Callout.Root color="amber" mb="4">
      <Callout.Text>
        {kor == null
          ? 'Még nem készült biztonsági mentés az adatmappáról.'
          : `Az utolsó biztonsági mentés ${kor} napja készült.`}{' '}
        A Google Drive nem biztonsági mentés: havonta készíts egy mentést, és tedd titkosított külső
        lemezre.
      </Callout.Text>
      {hiba && (
        <Text as="p" size="2" color="red" role="alert">
          {hiba}
        </Text>
      )}
      <Flex gap="3" wrap="wrap">
        <Button size="1" disabled={folyamatban} onClick={() => void ment()}>
          Biztonsági mentés most
        </Button>
        <Button
          size="1"
          variant="soft"
          color="gray"
          onClick={() => {
            elrejtve.add(mentes);
            setRejtve(true);
          }}
        >
          Elrejtés
        </Button>
      </Flex>
    </Callout.Root>
  );
}
