// A DEMO oldal Változásnapló füle: a gyökér CHANGELOG.md nyers tartalma
// épül be build-időben (Vite `?raw` import), hogy ne kelljen kézzel
// duplikálni a szöveget -- a napló mindig azzal szinkronban marad, amit a
// repo gyökerében szerkesztünk.

import { Box, Card, Heading, Text } from '@radix-ui/themes';
import { t } from '../design/tokens';
import { parseSections } from '../domain/markdownSections';
import changelogNyers from '../../../CHANGELOG.md?raw';

export default function ChangelogCard() {
  const szakaszok = parseSections(changelogNyers);
  if (szakaszok.length === 0) return null;

  return (
    <Card size="2" mb="4">
      <Heading size="3" mb="3" style={{ color: t.brand }}>
        Változásnapló
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
