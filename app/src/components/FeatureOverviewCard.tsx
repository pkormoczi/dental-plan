// Kezdőlap: rövid, képernyőnkénti áttekintés egy új felhasználónak, mielőtt
// belevágna. A gyökér FEATURES.md nyers tartalma épül be build-időben (Vite
// `?raw` import, a ChangelogCard mintájára) -- a listát a `/update-features`
// skill tartja karban, szakaszcímei a NavBar linkjeivel egyeznek, ugyanabban
// a sorrendben, hogy a felsorolás és a fenti navigáció fedje egymást.

import { Box, Card, Heading, Text } from '@radix-ui/themes';
import { t } from '../design/tokens';
import { parseSections } from '../domain/markdownSections';
import featuresNyers from '../../../FEATURES.md?raw';

export default function FeatureOverviewCard() {
  const szakaszok = parseSections(featuresNyers);
  if (szakaszok.length === 0) return null;

  return (
    <Card size="2" mb="4">
      <Heading size="3" mb="3" style={{ color: t.brand }}>
        Miben segít az alkalmazás?
      </Heading>
      {szakaszok.map((szakasz) => (
        <Box key={szakasz.cim} mb="4">
          <Text as="p" size="2" weight="bold" mb="2">
            {szakasz.cim}
          </Text>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {szakasz.tetelek.map((tetel, i) => (
              <li key={i}>
                <Text as="p" size="2" color="gray" mt="0" mb="1">
                  {tetel}
                </Text>
              </li>
            ))}
          </ul>
        </Box>
      ))}
    </Card>
  );
}
