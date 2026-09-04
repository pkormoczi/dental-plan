// Egy duplikáció-jelölt megjelenítése: név + (opcionális) akció felül,
// alatta behúzva a jelölt nyilvántartott adata -- a `DuplikacioJavaslatok.tsx`
// javaslat-chipje ÉS a `UjPaciensDialog.tsx` "Mégis új páciens létrehozása?"
// megerősítője KÖZÖS formázója, hogy a két felület sose térjen el egymástól.

import type { ReactNode } from 'react';
import { Box, Flex, Text } from '@radix-ui/themes';
import { formatShortDate } from '../../domain/date';
import type { DuplikaciosJelolt } from '../../domain/paciensDuplikacio';
import { t } from '../../design/tokens';

/**
 * Egy mező (DOB vagy telefon) megjelenítése. Ellentmondásnál KIZÁRÓLAG ez az
 * egy érték kap `⚠` prefixet és `t.warn` színt -- a jelölés soha nem csak
 * szín (docs/07-felulet-rendszer.md): a `⚠` a vizuális jel, az `aria-label`
 * a mező nevét is kimondja a képernyőolvasónak, a `⚠` karakter ismétlése
 * nélkül.
 */
function AdatMezo({ ertek, ellentmond, cimke }: { ertek: string; ellentmond: boolean; cimke: string }) {
  if (!ellentmond) {
    return (
      <Text size="1" color="gray">
        {ertek}
      </Text>
    );
  }
  return (
    <Text size="1" style={{ color: t.warn }} aria-label={`${cimke}: ${ertek}`}>
      ⚠ {ertek}
    </Text>
  );
}

function AdatSor({ jelolt }: { jelolt: DuplikaciosJelolt }) {
  const hasonloJelzes = jelolt.egyezes === 'nev-hasonlo' && (
    <Text size="1" color="gray">
      hasonló név
    </Text>
  );

  if (!jelolt.betoltve) {
    return (
      <Flex gap="2" wrap="wrap">
        <Text size="1" color="gray">
          adatok betöltése…
        </Text>
        {hasonloJelzes}
      </Flex>
    );
  }

  const dob = jelolt.adat?.szuletesiIdo ? formatShortDate(jelolt.adat.szuletesiIdo, 'hu') : null;
  const telefon = jelolt.adat?.telefon || null;

  if (!dob && !telefon) {
    return (
      <Flex gap="2" wrap="wrap">
        <Text size="1" color="gray">
          nincs rögzített adat
        </Text>
        {hasonloJelzes}
      </Flex>
    );
  }

  return (
    <Flex gap="2" wrap="wrap">
      {dob && <AdatMezo ertek={dob} ellentmond={jelolt.szuletesiIdo === 'ellentmond'} cimke="eltérő születési dátum" />}
      {telefon && <AdatMezo ertek={telefon} ellentmond={jelolt.telefon === 'ellentmond'} cimke="eltérő telefonszám" />}
      {hasonloJelzes}
    </Flex>
  );
}

export default function JeloltSor({ jelolt, akcio }: { jelolt: DuplikaciosJelolt; akcio?: ReactNode }) {
  return (
    <Flex direction="column">
      <Flex align="center" gap="2" wrap="wrap">
        <Text size="2" weight="medium">
          {jelolt.patient.nev}
        </Text>
        {akcio}
      </Flex>
      <Box pl="4">
        <AdatSor jelolt={jelolt} />
      </Box>
    </Flex>
  );
}
