// A Filerendszer fájában kiválasztott fájl tartalma (docs/03-funkcionalis-
// spec.md § 8. Filerendszer). JSON/markdown esetén szinkron olvasás
// (readRawFile), PDF esetén a ténylegesen elmentett bájtokból (loadPlanPdf)
// blob-URL és "Megnyitás új lapon" link.
//
// A blob-URL-t NEM azonnal revoke-oljuk (szemben a PlanHistoryPage
// letöltés-gombjával, ahol a szinkron a.click() miatt biztonságos) --
// egy target="_blank" fülnek ideje kell betöltenie a blobot, ezért a
// revoke az effekt CLEANUP-jában történik, a következő kiválasztáskor
// vagy unmountkor.

import { useEffect, useState } from 'react';
import { Box, Button, Callout, Skeleton, Text } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { t } from '../../../design/tokens';
import type { DemoFileNode } from '../../../storage/demoFileTree';
import { useStorage } from '../../../storage/StorageContext';

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
  const { readRawFile, loadPlanPdf } = useStorage();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfMissing, setPdfMissing] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    setPdfUrl(null);
    setPdfMissing(false);
    setPdfError(null);
    if (!node || node.format !== 'pdf') {
      setPdfLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setPdfLoading(true);

    (async () => {
      try {
        const bytes = await loadPlanPdf(node.ref);
        if (cancelled) return;
        if (!bytes) {
          setPdfMissing(true);
          return;
        }
        objectUrl = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
        setPdfUrl(objectUrl);
      } catch (err) {
        if (!cancelled) {
          setPdfError(err instanceof Error ? err.message : 'A PDF betöltése váratlanul meghiúsult.');
        }
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [node, loadPlanPdf]);

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
        <PdfBlock loading={pdfLoading} url={pdfUrl} missing={pdfMissing} error={pdfError} />
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
          <Callout.Text>A fájl nem érvényes JSON -- a nyers tartalom látszik.</Callout.Text>
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
