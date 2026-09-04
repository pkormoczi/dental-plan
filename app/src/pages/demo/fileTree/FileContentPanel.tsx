// A Filerendszer fájában kiválasztott fájl tartalma (docs/03-funkcionalis-
// spec.md § 8. Filerendszer). JSON/markdown esetén szinkron olvasás
// (readRawFile), PDF esetén a ténylegesen elmentett bájtokból
// (`usePlanPdfObjectUrl`, a blob-URL életciklusát is ő kezeli) blob-URL és
// "Megnyitás új lapon" link.

import { Box, Button, Callout, Skeleton, Text } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { t } from '../../../design/tokens';
import type { DemoFileNode } from '../../../storage/demoFileTree';
import { useStorage } from '../../../storage/StorageContext';
import { usePlanPdfObjectUrl } from '../../../storage/usePlanPdfObjectUrl';

export interface FileContentPanelProps {
  node: DemoFileNode | null;
}

function prettyJson(raw: string): { text: string; invalid: boolean } {
  try {
    return { text: JSON.stringify(JSON.parse(raw), null, 2), invalid: false };
  } catch {
    return { text: raw, invalid: true };
  }
}

// Nincs saját maxHeight/overflow -- a FileTreeSection jobb oszlopa (a "szerkesztő
// panel") már ad egyetlen görgethető keretet; egy második, beágyazott görgetés
// dupla scrollbart adna.
const CONTENT_BOX_STYLE = {
  background: t.surfaceAlt,
  border: `1px solid ${t.uiLineStrong}`,
  borderRadius: t.radius,
} as const;

const CONTENT_TEXT_STYLE = {
  fontFamily: t.mono,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
} as const;

export default function FileContentPanel({ node }: FileContentPanelProps) {
  const { readRawFile } = useStorage();
  const pdfState = usePlanPdfObjectUrl(node?.format === 'pdf' ? node.ref : null);

  if (!node) {
    return (
      <Callout.Root color="gray">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          Válassz egy fájlt a fából, és itt megjelenik a ténylegesen tárolt tartalma.
        </Callout.Text>
      </Callout.Root>
    );
  }

  return (
    <Box>
      <Text as="div" size="2" style={{ fontFamily: t.mono, color: t.text }}>
        {node.path}
      </Text>
      <Text as="div" size="1" color="gray" mb="3" style={{ fontFamily: t.mono }}>
        {node.storageKey}
      </Text>

      {node.format === 'pdf' ? (
        <PdfBlock loading={pdfState.toltes} url={pdfState.url} missing={pdfState.hianyzik} error={pdfState.hiba} />
      ) : (
        <TextBlock node={node} readRawFile={readRawFile} />
      )}
    </Box>
  );
}

function TextBlock({
  node,
  readRawFile,
}: {
  node: Extract<DemoFileNode, { format: 'json' | 'markdown' }>;
  readRawFile: (storageKey: string) => string | null;
}) {
  const raw = readRawFile(node.storageKey);
  if (raw == null) {
    return (
      <Callout.Root color="gray" size="1">
        <Callout.Text>A fájl közben eltűnt a tárolóból.</Callout.Text>
      </Callout.Root>
    );
  }

  const { text, invalid } = node.format === 'json' ? prettyJson(raw) : { text: raw, invalid: false };

  return (
    <>
      {invalid && (
        <Callout.Root color="amber" size="1" mb="2">
          <Callout.Text>A fájl nem érvényes JSON — a nyers tartalom látszik.</Callout.Text>
        </Callout.Root>
      )}
      <Box p="3" style={CONTENT_BOX_STYLE}>
        <Text as="div" size="1" style={CONTENT_TEXT_STYLE}>
          {text}
        </Text>
      </Box>
    </>
  );
}

function PdfBlock({
  loading,
  url,
  missing,
  error,
}: {
  loading: boolean;
  url: string | null;
  missing: boolean;
  error: string | null;
}) {
  return (
    <Box>
      <Text as="p" size="2" color="gray" mt="0" mb="3">
        Ez a véglegesítéskor ténylegesen elmentett PDF.
      </Text>
      {loading && (
        <Skeleton>
          <Box height="32px" width="180px" />
        </Skeleton>
      )}
      {!loading && error && (
        <Callout.Root color="red" size="1">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}
      {!loading && missing && (
        <Callout.Root color="gray" size="1">
          <Callout.Text>Ehhez a verzióhoz nincs mentett PDF.</Callout.Text>
        </Callout.Root>
      )}
      {!loading && url && (
        <Button asChild size="2" variant="soft">
          <a href={url} target="_blank" rel="noopener noreferrer">
            Megnyitás új lapon
          </a>
        </Button>
      )}
    </Box>
  );
}
