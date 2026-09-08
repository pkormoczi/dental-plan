// Az "Érintett fogak" lenyíló panel a tervszerkesztőben (lásd
// pages/PlanEditorPage.tsx) -- a beavatkozás lista FÖLÖTT ül, alapból
// csukva, a doki kattintására nyílik/csukódik. Feltételes render (nem
// CSS-elrejtés): csukva a DentalChart egyetlen Tab-megállója is kiesik a
// Tab-sorrendből, ahogy az app/src/CLAUDE.md billentyűzet-szabálya
// megköveteli egy nem-elérhető vezérlőtől. Nincs nyitás/csukás-animáció --
// animáció visszajelzési funkció nélkül tilos (app/src/CLAUDE.md).

import { useState } from 'react';
import { Button, Flex, Text } from '@radix-ui/themes';
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import DentalChart from './DentalChart';
import DentalChartLegend from './DentalChartLegend';
import type { FogterkepAllapot } from '../domain/toothVisual';

export interface ToothChartPanelProps {
  allapot: FogterkepAllapot;
  onToothClick: (fdi: string) => void;
}

export default function ToothChartPanel({ allapot, onToothClick }: ToothChartPanelProps) {
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
              A felvett kezelések fogszámai látszanak itt — a fogszámot a sor „Fog” mezőjébe írd be,
              vagy a mellette lévő fogválasztóval jelöld ki.
            </Text>
          )}
        </Flex>
      )}
    </Flex>
  );
}
