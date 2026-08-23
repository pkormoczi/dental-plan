// Az "Érintett fogak" lenyíló, read-only fogtérkép-panel a Terv részletei
// nézeten -- lásd docs/03-funkcionalis-spec.md § 11. A `components/
// ToothChartPanel.tsx` (szerkesztő) mintáját követi (alapból csukva,
// feltételes render, hogy csukva a fogtérkép egyetlen Tab-megállója is
// kiessen a Tab-sorrendből), de KÜLÖN komponens: nincs fázisválasztó és
// nincs "vegyünk fel egy sort" üres-állapot, mert ez a nézet nem ír.
//
// A kijelölés a szülőben (FazisokBlokk) él, NEM itt -- a panel
// összecsukása ezt a komponenst unmountolja, egy itteni useState tehát
// elveszne csukás/nyitás között (a leírás-nyitottság FazisokBlokk.tsx
// fejléckommentjének mintája).

import { useState, type KeyboardEvent } from 'react';
import { Button, Flex, Text } from '@radix-ui/themes';
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import DentalChart from '../../components/DentalChart';
import DentalChartLegend from '../../components/DentalChartLegend';
import type { FogterkepAllapot } from '../../domain/toothVisual';

export interface FogterkepPanelProps {
  allapot: FogterkepAllapot;
  kijelolt: readonly string[];
  onToothClick: (fdi: string) => void;
  onClear: () => void;
}

export default function FogterkepPanel({
  allapot,
  kijelolt,
  onToothClick,
  onClear,
}: FogterkepPanelProps) {
  const [open, setOpen] = useState(false);
  const vanKijeloles = kijelolt.length > 0;

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape' && vanKijeloles) onClear();
  }

  return (
    <Flex direction="column" gap="2" mb="4" onKeyDown={handleKeyDown}>
      <Flex align="center" justify="between" gap="3" wrap="wrap">
        <Button
          type="button"
          variant="soft"
          color="gray"
          aria-expanded={open}
          aria-controls="tr-fogterkep-panel"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
          Érintett fogak
        </Button>
        {/* A számláló + törlés CSUKOTT panelen IS látszik -- különben a
            sorokon maradó kiemelés megmagyarázhatatlan lenne. */}
        {vanKijeloles && (
          <Flex align="center" gap="2">
            <Text as="div" size="1" color="gray">
              {kijelolt.length} fog kijelölve
            </Text>
            <Button type="button" variant="ghost" color="gray" size="1" onClick={onClear}>
              Kijelölés törlése
            </Button>
          </Flex>
        )}
      </Flex>
      {open && (
        <Flex id="tr-fogterkep-panel" direction="column" style={{ maxWidth: 480 }}>
          <DentalChart allapot={allapot} onToothClick={onToothClick} selectedTeeth={kijelolt} />
          <DentalChartLegend kategoriak={allapot.jelmagyarazat} />
          {allapot.tejfogak.length > 0 && (
            <Text as="div" size="1" color="gray" mt="2">
              Tejfogak: {allapot.tejfogak.join(', ')}
            </Text>
          )}
        </Flex>
      )}
    </Flex>
  );
}
