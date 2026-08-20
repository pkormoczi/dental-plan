// A `<Card size="2" mb="4">` + márkaszínű, félkövér szekciócím páros korábban
// öt helyen volt másolat-beillesztve (PatientPage.tsx, TorzsadatSyncCard.tsx,
// RendeloTab.tsx kétszer, EgyebTab.tsx) -- ez a közös primitív. Ne írj hozzá
// hatodik másolatot, és ne tegyél `Card`-ot egy `Section` köré.

import { Card, Text } from '@radix-ui/themes';
import { t } from '../design/tokens';

export default function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card size="2" mb="4">
      <Text as="p" size="2" weight="bold" mb="3" style={{ color: t.brand }}>
        {title}
      </Text>
      {children}
    </Card>
  );
}
