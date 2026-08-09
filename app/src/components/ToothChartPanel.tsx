// Az "Érintett fogak" lenyíló panel a tervszerkesztőben (lásd
// pages/PlanEditorPage.tsx) -- a beavatkozás lista FÖLÖTT ül, alapból
// csukva, a doki kattintására nyílik/csukódik. Feltételes render (nem
// CSS-elrejtés): csukva a DentalChart egyetlen Tab-megállója is kiesik a
// Tab-sorrendből, ahogy docs/07-felulet-rendszer.md "Billentyűzet" szakasza
// megköveteli egy nem-elérhető vezérlőtől. Nincs nyitás/csukás-animáció --
// docs/07: "Ne tegyél animációt oda, ahol nincs visszajelzési funkciója."

import { useState } from 'react';
import { Button, Flex, Select, Text } from '@radix-ui/themes';
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import DentalChart from './DentalChart';
import DentalChartLegend from './DentalChartLegend';
import type { FogterkepAllapot } from '../domain/toothVisual';

export interface ToothChartPanelProps {
  allapot: FogterkepAllapot;
  onToothClick: (fdi: string) => void;
  fazisok: { megnevezes: string }[];
  celFazisIndex: number;
  onCelFazisChange: (i: number) => void;
}

export default function ToothChartPanel({
  allapot,
  onToothClick,
  fazisok,
  celFazisIndex,
  onCelFazisChange,
}: ToothChartPanelProps) {
  const [open, setOpen] = useState(false);
  const erintettSzam = allapot.fogak.size + allapot.tejfogak.length;
  const hasFogterkep = erintettSzam > 0;

  return (
    <Flex direction="column" gap="2">
      <Flex align="center" justify="between" gap="3" wrap="wrap">
        <Button
          type="button"
          variant="soft"
          color="gray"
          aria-expanded={open}
          aria-controls="fogterkep-panel"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
          Érintett fogak
        </Button>
        {open && fazisok.length > 1 && (
          <Flex align="center" gap="2">
            <Text as="div" size="1" color="gray">
              Új sor ide:
            </Text>
            <Select.Root value={String(celFazisIndex)} onValueChange={(v) => onCelFazisChange(Number(v))}>
              <Select.Trigger aria-label="Új sor ide melyik fázisba kerüljön" />
              <Select.Content>
                {fazisok.map((f, i) => (
                  <Select.Item key={i} value={String(i)}>
                    {f.megnevezes}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
        )}
      </Flex>
      {open && (
        <Flex id="fogterkep-panel" direction="column" style={{ maxWidth: 480 }}>
          <DentalChart allapot={allapot} onToothClick={onToothClick} />
          <DentalChartLegend kategoriak={allapot.jelmagyarazat} />
          {allapot.tejfogak.length > 0 && (
            <Text as="div" size="1" color="gray" mt="2">
              Tejfogak: {allapot.tejfogak.join(', ')}
            </Text>
          )}
          {!hasFogterkep && (
            <Text as="div" size="1" color="gray" mt="2">
              Kattints egy fogra, és felveszünk rá egy sort — vagy írd be a fogszámokat a sor
              „Fog” mezőjébe.
            </Text>
          )}
        </Flex>
      )}
    </Flex>
  );
}
