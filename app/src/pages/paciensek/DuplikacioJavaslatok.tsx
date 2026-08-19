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
import { JAVASLAT_LATHATO, type DuplikaciosJelolt } from '../../domain/paciensDuplikacio';
import { t } from '../../design/tokens';

function indoklas(jelolt: DuplikaciosJelolt): string {
  const reszek = [jelolt.egyezes === 'nev-pontos' ? 'azonos név' : 'hasonló név'];
  if (jelolt.szuletesiIdo === 'egyezik') reszek.push('egyező születési dátum');
  if (jelolt.szuletesiIdo === 'ellentmond') reszek.push('eltérő születési dátum');
  if (jelolt.telefon === 'egyezik') reszek.push('egyező telefon');
  if (jelolt.telefon === 'ellentmond') reszek.push('eltérő telefon');
  return reszek.join(', ');
}

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
      <Flex direction="column" gap="1" mt="1">
        {lathatok.map((jelolt) => (
          <Flex key={jelolt.patient.dirName} align="center" gap="2" wrap="wrap">
            <Text size="1" color="gray">
              {jelolt.patient.nev} ({indoklas(jelolt)})
            </Text>
            <Button
              type="button"
              variant="soft"
              size="1"
              aria-label={`Ezt a pácienst választom: ${jelolt.patient.nev}`}
              onClick={() => onValaszt(jelolt)}
            >
              Ezt a pácienst választom
            </Button>
          </Flex>
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
