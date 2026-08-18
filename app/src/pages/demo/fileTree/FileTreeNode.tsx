// Egyetlen csomópont a Filerendszer fájában -- rekurzív, a ToothChartPanel
// diszklózúra-mintáját követi (lokális useState, feltételes render, nincs
// CSS-elrejtés, nincs animáció -- lásd docs/07-felulet-rendszer.md
// "Billentyűzet": egy csukott mappa gyermekeinek teljesen ki kell esniük a
// Tab-sorrendből). A gyökér és az első szint alapból nyitva van
// (`depth === 0`), minden mélyebb szint csukva -- ez a mappák/tervek
// számának növekedésével tartja áttekinthetőnek a fát.
//
// A mappa-/fájlnevek `t.mono`-val jelennek meg -- ez a docs/07 "technikai
// azonosítókra" fenntartott monospace-kivétele, egy fájlfában a fájlnév
// pontosan ilyen azonosító. A kiválasztott sor háttere `t.accentWash`
// (a tokens.ts szerint kifejezetten erre a szerepre szánt token, eddig
// sehol nem volt bevetve) -- nincs új szín bevezetve.

import { useId, useState } from 'react';
import { Box, Button } from '@radix-ui/themes';
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { t } from '../../../design/tokens';
import type { DemoFileNode, DemoNode } from '../../../storage/demoFileTree';

export interface FileTreeNodeProps {
  node: DemoNode;
  depth: number;
  selectedKey: string | null;
  onSelect: (node: DemoFileNode) => void;
}

const ROW_STYLE = {
  width: '100%',
  justifyContent: 'flex-start',
  fontFamily: t.mono,
} as const;

export default function FileTreeNode({ node, depth, selectedKey, onSelect }: FileTreeNodeProps) {
  const [open, setOpen] = useState(depth === 0);
  const panelId = useId();

  if (node.type === 'dir') {
    return (
      <Box data-path={node.path} ml={depth > 0 ? '4' : '0'}>
        <Button
          type="button"
          size="1"
          variant="ghost"
          color="gray"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={node.path}
          onClick={() => setOpen((v) => !v)}
          style={ROW_STYLE}
        >
          {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
          {node.name}/
        </Button>
        {open && (
          <Box id={panelId}>
            {node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedKey={selectedKey}
                onSelect={onSelect}
              />
            ))}
          </Box>
        )}
      </Box>
    );
  }

  const selected = node.storageKey === selectedKey;
  return (
    <Box data-path={node.path} ml={depth > 0 ? '4' : '0'}>
      <Button
        type="button"
        size="1"
        variant="ghost"
        color={selected ? undefined : 'gray'}
        aria-current={selected ? 'true' : undefined}
        aria-label={node.path}
        onClick={() => onSelect(node)}
        style={{
          ...ROW_STYLE,
          background: selected ? t.accentWash : undefined,
          color: selected ? t.brand : undefined,
          fontWeight: selected ? 600 : 400,
        }}
      >
        {node.name}
      </Button>
    </Box>
  );
}
