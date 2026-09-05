// Filerendszer szekció a DEMO oldalon.
// Demó-only, read-only vizualizáció: megmutatja, mit írna a
// végleges (FileSystemStorage, 2. fázis) alkalmazás a doki gépére, a mockup
// `dp:` localStorage-kulcsaiból fává építve (storage/demoFileTree.ts).
//
// `useMemo`, NEM async-effekt-plusz-loading-skeleton (mint az
// OsszesTervSection): a `listFileTree()` szinkron `localStorage`-bejárás, nem
// egy `PlanStorage`-hívás, egy mesterséges betöltés-villanás kitalált
// adat lenne a felületen. Az `AppStateProvider`
// már ma is megvárja a `ready` promise-t a gyerek-oldalak renderelése
// előtt (state/AppState.tsx), ezért ez a szekció sem várja meg külön.

import { useMemo, useState } from 'react';
import { Box, Callout, Flex, Text } from '@radix-ui/themes';
import { CrossCircledIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import FileContentPanel from './fileTree/FileContentPanel';
import FileTreeNode from './fileTree/FileTreeNode';
import { t } from '../../design/tokens';
import type { DemoFileNode, DemoNode } from '../../storage/demoFileTree';
import { useStorage } from '../../storage/StorageContext';

function loadTree(listFileTree: () => DemoNode[]): { tree: DemoNode[]; error: string | null } {
  try {
    return { tree: listFileTree(), error: null };
  } catch (err) {
    return {
      tree: [],
      error: err instanceof Error ? err.message : 'A fájlfa betöltése váratlanul meghiúsult.',
    };
  }
}

export default function FileTreeSection() {
  const { listFileTree } = useStorage();
  const { tree, error } = useMemo(() => loadTree(listFileTree), [listFileTree]);
  const [selected, setSelected] = useState<DemoFileNode | null>(null);

  return (
    <Box>
      <Text as="p" size="2" color="gray" mb="1">
        Ez a nézet azt mutatja meg, mit írna a végleges asztali alkalmazás a
        doki gépén kijelölt gyökérmappába — hová, milyen néven, milyen
        tartalommal. A mockupban ez ma a böngésző tárolójában él; ez az
        oldal kizárólag olvas, semmit nem lehet innen törölni vagy átírni.
      </Text>
      <Text as="p" size="2" color="gray" mb="1">
        A most még nem mentett (csak a demó-adatból származó) terveknél
        egyelőre nincs <Text style={{ fontFamily: t.mono }}>kezelesi-terv.pdf</Text> —
        az egy ténylegesen véglegesített és elmentett tervnél jelenik meg.
      </Text>
      <Text as="div" size="2" mb="4" style={{ fontFamily: t.mono, color: t.uiTextMuted }}>
        &lt;a kijelölt gyökérmappa&gt;/
      </Text>

      {error && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>A fájlfa betöltése nem sikerült: {error}</Callout.Text>
        </Callout.Root>
      )}

      {!error && tree.length === 0 && (
        <Callout.Root color="gray" mb="4">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>Nincs megjeleníthető fájl — a tároló üres.</Callout.Text>
        </Callout.Root>
      )}

      {!error && tree.length > 0 && (
        <Flex
          style={{
            border: `1px solid ${t.uiLineStrong}`,
            borderRadius: t.radiusLg,
            overflow: 'hidden',
          }}
        >
          <Box
            style={{
              width: 300,
              flexShrink: 0,
              background: t.surfaceAlt,
              borderRight: `2px solid ${t.accent}`,
              maxHeight: '72vh',
              overflowY: 'auto',
              padding: 12,
            }}
          >
            {tree.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                depth={0}
                selectedKey={selected?.storageKey ?? null}
                onSelect={setSelected}
              />
            ))}
          </Box>
          <Box style={{ flex: 1, minWidth: 0, maxHeight: '72vh', overflowY: 'auto', padding: 16 }}>
            <FileContentPanel node={selected} />
          </Box>
        </Flex>
      )}
    </Box>
  );
}
