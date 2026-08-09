// A "HU" jelvény -- D21/1.1: jelzi, hogy egy tétel neve/sora a terv nyelvén
// (jellemzően német) nem volt elérhető, ezért magyarra esett vissza. Közös a
// tervszerkesztő keresője (planEditor/ItemPicker.tsx) és a felvett sorok
// (PlanEditorPage.tsx LineRow) között -- ezért saját fájlban, hogy egyik se
// importálja a másikból (körkörös import).

import { Badge } from '@radix-ui/themes';

export default function HuChip() {
  return (
    <Badge color="amber" variant="soft" size="1" ml="2">
      HU
    </Badge>
  );
}
