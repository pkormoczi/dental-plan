// A DEMO oldal Funkciók füle: rövid, képernyőnkénti áttekintés egy új
// felhasználónak, mielőtt belevágna. A docs/FEATURES.md nyers tartalma
// épül be build-időben (Vite `?raw` import, a ChangelogCard mintájára) -- a
// listát a `/update-features` skill tartja karban, szakaszonként a mögöttük
// álló képernyő funkcióit csoportosítva.

import { Box, Card, Heading, Text } from '@radix-ui/themes';
import { t } from '../design/tokens';
import { parseSections } from '../domain/markdownSections';
import featuresNyers from '../../../docs/FEATURES.md?raw';

export default function FeatureOverviewCard() {
  const szakaszok = parseSections(featuresNyers, { alcimek: true });
  if (szakaszok.length === 0) return null;

  return (
    <Card size="2" mb="4">
      <Heading size="3" mb="3" style={{ color: t.brand }}>
        Miben segít az alkalmazás?
      </Heading>
      {szakaszok.map((szakasz) => {
        // Alcím nélküli szakaszoknál (nincs "### " a FEATURES.md-ben) egy
        // névtelen csoportra esik vissza -- így a renderelés ugyanaz az út,
        // csoportosított és lapos szakaszokra egyaránt.
        const csoportok = szakasz.csoportok ?? [{ cim: null, tetelek: szakasz.tetelek }];
        return (
          <Box key={szakasz.cim} mb="4">
            <Text as="p" size="2" weight="bold" mb="2">
              {szakasz.cim}
            </Text>
            {csoportok.map((csoport, ci) => (
              <Box key={csoport.cim ?? `_${ci}`} mb="3">
                {csoport.cim && (
                  <Text as="p" size="1" weight="bold" color="gray" mb="1">
                    {csoport.cim}
                  </Text>
                )}
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {csoport.tetelek.map((tetel, i) => (
                    <li key={i}>
                      <Text as="p" size="2" color="gray" mt="0" mb="1">
                        {tetel}
                      </Text>
                    </li>
                  ))}
                </ul>
              </Box>
            ))}
          </Box>
        );
      })}
    </Card>
  );
}
