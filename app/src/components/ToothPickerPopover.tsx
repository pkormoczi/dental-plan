// Soronkénti fogválasztó -- egy kis ikongomb a "Fog" mező mellett (lásd
// pages/PlanEditorPage.tsx LineRow), ami egy felugró fogtérképet nyit: a
// kattintott/Enterrel aktivált fog be-/kikapcsolódik a sor `fogak`
// mezőjében (domain/teeth.ts `toggleFog`). Élő írás, nincs külön "Mentés" --
// a popover bezárása nem "elvet", a mező már írva van a kattintás
// pillanatában.
//
// Kitöltés = a TELJES terv kezelés-színei (kontextus: honnan jönnek a
// szomszédos fogak), a kijelölés-gyűrű pedig CSAK ennek a sornak a fogait
// mutatja -- két külön vizuális csatorna ugyanazon a DentalChart-on (lásd
// design/toothChartSvg.ts fejléckommentje: `is-active`/`is-picked`).

import { useState } from 'react';
import { Button, Callout, IconButton, Popover, Text } from '@radix-ui/themes';
import { Crosshair2Icon } from '@radix-ui/react-icons';
import DentalChart from './DentalChart';
import { parseTeeth, toggleFog } from '../domain/teeth';
import type { FogterkepAllapot } from '../domain/toothVisual';

export interface ToothPickerPopoverProps {
  fogak: string;
  allapot: FogterkepAllapot;
  onChange: (fogak: string) => void;
}

export default function ToothPickerPopover({ fogak, allapot, onChange }: ToothPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const parsed = parseTeeth(fogak);
  // Szabadszöveg-őr: a `parseTeeth` mindent-vagy-semmit dönt -- ha a mező
  // akár egyetlen nem-FDI tokent (pl. "jobb felső", docs/02-domain-modell.md
  // ":198" szerint érvényes tartalom) tartalmaz, a fogtérkép NEM tudja
  // biztonságosan szerkeszteni azt. Némán felülírás helyett itt kérünk
  // megerősítést -- a doki gépelt szövege sosem tűnhet el észrevétlenül.
  const szabadSzoveg = fogak.trim() !== '' && !parsed.valid;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <IconButton
          type="button"
          aria-label="Fogak kijelölése a fogtérképen"
          variant="ghost"
          color="gray"
          size="1"
        >
          <Crosshair2Icon />
        </IconButton>
      </Popover.Trigger>
      <Popover.Content style={{ maxWidth: 340 }}>
        {szabadSzoveg ? (
          <>
            <Callout.Root color="amber" size="1" mb="3">
              <Callout.Text>
                Ez a mező szabad szöveget tartalmaz ({fogak}), ezért a fogtérképről nem
                szerkeszthető. Töröld a szöveget, ha fogszámokkal szeretnéd megadni.
              </Callout.Text>
            </Callout.Root>
            <Button
              type="button"
              variant="soft"
              color="gray"
              size="1"
              onClick={() => onChange('')}
            >
              Mező kiürítése
            </Button>
          </>
        ) : (
          <>
            <Text as="div" size="1" color="gray" mb="2">
              Kattints a fogakra a kijelöléshez
            </Text>
            <DentalChart
              allapot={allapot}
              selectedTeeth={parsed.teeth}
              onToothClick={(fdi) => onChange(toggleFog(fogak, fdi))}
            />
          </>
        )}
      </Popover.Content>
    </Popover.Root>
  );
}
