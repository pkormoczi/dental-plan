// A duplikáció-gyanús találatok listája a quick-create dialógusban (D42) --
// csak a `UjPaciensDialog.tsx` hívja, lapmappa-szintű komponens (nem
// `components/`, a "második hívóra emel" projektszabály szerint --
// `PatientEditorPanel`/`PatientPlanChains` is csak a 2. hívóra lett
// közössé). A `PatientEditorPanel` save-time ellenőrzése (D208) NEM ezt
// használja -- ott nincs "válassz helyette" akció, csak egy egyszerű
// megerősítő felsorolás.

import { useState } from 'react';
import { Box, Button, Flex, Text } from '@radix-ui/themes';
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import JeloltSor from './JeloltSor';
import { JAVASLAT_LATHATO, type DuplikaciosJelolt } from '../../domain/paciensDuplikacio';
import { t } from '../../design/tokens';

export default function DuplikacioJavaslatok({
  jeloltek,
  onValaszt,
}: {
  jeloltek: DuplikaciosJelolt[];
  onValaszt: (jelolt: DuplikaciosJelolt) => void;
}) {
  const [kibontva, setKibontva] = useState(false);

  if (jeloltek.length === 0) return null;

  const lathatok = kibontva ? jeloltek : jeloltek.slice(0, JAVASLAT_LATHATO);
  const tobbi = jeloltek.length - lathatok.length;

  return (
    <Box mt="1">
      <Text as="div" size="1" style={{ color: t.warn }}>
        Már van hasonló nevű páciens — lehet, hogy inkább őt kellene megkeresni, nem újra
        felvinni.
      </Text>
      <Flex direction="column" gap="2" mt="1">
        {lathatok.map((jelolt) => (
          <JeloltSor
            key={jelolt.patient.dirName}
            jelolt={jelolt}
            akcio={
              <Button
                type="button"
                variant="soft"
                size="1"
                aria-label={`Ezt a pácienst választom: ${jelolt.patient.nev}`}
                onClick={() => onValaszt(jelolt)}
              >
                Ezt a pácienst választom
              </Button>
            }
          />
        ))}
      </Flex>
      {!kibontva && tobbi > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="1"
          mt="1"
          aria-expanded={kibontva}
          onClick={() => setKibontva(true)}
        >
          <ChevronRightIcon />+{tobbi} további
        </Button>
      )}
      {kibontva && jeloltek.length > JAVASLAT_LATHATO && (
        <Button type="button" variant="ghost" size="1" mt="1" aria-expanded={kibontva} onClick={() => setKibontva(false)}>
          <ChevronDownIcon />
          Kevesebb
        </Button>
      )}
    </Box>
  );
}
