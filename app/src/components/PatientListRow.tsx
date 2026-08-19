// Kompakt páciens-sor (D43, docs/03-funkcionalis-spec.md § 9. Páciensek /
// § 1. Indítás) -- eredetileg a `Home.tsx` "Legutóbbi páciensek" listájának
// helyi `RecentRow`-ja volt, a 38. tétel emelte ide, mert mostantól a
// Pácienslista (`pages/PaciensekPage.tsx`) sora is ugyanezt a formát
// használja. Név + DOB + telefon, KIVÉTELKÉNT csak a törzsadat-betöltési
// hiba kap jelzést -- a "Rögzített törzsadat"/"Élő adat a legutóbbi
// tervből" két NORMÁL állapot nem kap semmilyen jelvényt (D43).

import type { ReactNode } from 'react';
import { Flex, Text } from '@radix-ui/themes';
import { Link } from 'react-router-dom';
import { t } from '../design/tokens';
import { formatShortDate } from '../domain/date';
import type { BetoltottTorzsadat } from '../domain/torzsadatBetoltes';

export default function PatientListRow({
  item,
  children,
}: {
  item: BetoltottTorzsadat;
  /** Sor alatti kiegészítő tartalom (pl. a Kezdőlap aktivitás-szövege). */
  children?: ReactNode;
}) {
  const { patient, torzsadat, hiba } = item;
  const dob = torzsadat.szuletesiIdo ? formatShortDate(torzsadat.szuletesiIdo, 'hu') : null;

  return (
    // Szándékosan location.state nélkül: a PatientDetailPage alapértelmezett
    // tabja 'tervek' (D35) -- ha ez a default valaha megváltozna, ez a
    // navigáció csendben rossz tabra nyitna.
    <Link
      to={`/paciensek/${encodeURIComponent(patient.dirName)}`}
      style={{ display: 'block', padding: '8px 0', textDecoration: 'none', color: 'inherit' }}
    >
      <Flex align="baseline" gap="2" wrap="wrap">
        <Text size="2" weight="medium">
          {torzsadat.nev}
        </Text>
        {hiba ? (
          <Text size="1" style={{ color: t.warn }}>
            ⚠ adat nem olvasható
          </Text>
        ) : (
          <>
            {dob && (
              <Text size="1" color="gray">
                {dob}
              </Text>
            )}
            {torzsadat.telefon && (
              <Text size="1" color="gray">
                {torzsadat.telefon}
              </Text>
            )}
          </>
        )}
      </Flex>
      {children}
    </Link>
  );
}
