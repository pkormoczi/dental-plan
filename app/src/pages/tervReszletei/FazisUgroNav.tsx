// Fázis-ugró navigáció a Terv részletei nézeten, 4+ fázisnál -- lásd
// docs/03-funkcionalis-spec.md § 11. Radix `Select`, a
// `components/ToothChartPanel.tsx` fázis-választójának mintáján. Szándékosan
// NEM `⋯` DropdownMenu: a TervReszleteiPage.test.tsx szerződéstesztje
// tiltja a "további műveletek"-re végződő accessible name-et ezen a lapon,
// és egy vezérelt Select `value`-ja egyben a scrollspy vizuális
// visszajelzése is -- nem kell külön kiemelés-réteg.

import { Select } from '@radix-ui/themes';
import type { Fazis } from '../../domain/types';

export default function FazisUgroNav({
  fazisok,
  aktivFazis,
  onUgras,
}: {
  fazisok: Fazis[];
  aktivFazis: number;
  onUgras: (fazisIndex: number) => void;
}) {
  return (
    <Select.Root value={String(aktivFazis)} onValueChange={(v) => onUgras(Number(v))}>
      <Select.Trigger aria-label="Ugrás fázisra" />
      {/* onCloseAutoFocus megelőzve -- a Radix Select záráskor alapból
          visszaadja a fókuszt a triggerre, ez itt visszalökné az `onUgras`
          rAF-jában beállított fókuszt a fázis chevron gombjáról (a
          components/PatientPlanChains.tsx DropdownMenu.Content mintája). */}
      <Select.Content onCloseAutoFocus={(e) => e.preventDefault()}>
        {fazisok.map((f, i) => (
          <Select.Item key={i} value={String(i)}>
            {i + 1}. {f.megnevezes}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
