// A "mentett PDF" slot tartalma a Terv részletei nézeten.
// A `usePlanPdfObjectUrl` MÁR MEGLÉVŐ
// bájtjait ágyazza be, sosem generál újra (szemben a `PreviewPage.tsx`
// `usePDF()`-jével, ami a DRAFT-ot élőben rendereli) -- ez a hívó adja a
// blob-URL-t, a panel tisztán prezentációs, a PreviewPage iframe-stílusát
// követve. Hiányzó/olvashatatlan PDF esetén a panel csak egy üzenetet mutat
// -- a lap többi, JSON-ból származó tartalma emiatt nem válik olvashatatlanná.

import { Box, Callout, Skeleton } from '@radix-ui/themes';
import { CrossCircledIcon, ExclamationTriangleIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import Section from '../../components/Section';
import { t } from '../../design/tokens';

export interface MentettPdfPanelProps {
  url: string | null;
  toltes: boolean;
  hianyzik: boolean;
  hiba: string | null;
  /** Igaz, ha a hiányzó PDF oka a beépített demó-készlet (sosincs neki mentett PDF-je), nem valódi hiba. */
  demoEredetu: boolean;
}

export default function MentettPdfPanel({ url, toltes, hianyzik, hiba, demoEredetu }: MentettPdfPanelProps) {
  return (
    <Section title="A mentett PDF">
      {toltes && (
        <Skeleton>
          <Box style={{ width: '100%', height: '80vh', border: `1px solid ${t.uiLine}`, borderRadius: t.radiusLg }} />
        </Skeleton>
      )}
      {!toltes && hiba && (
        <Callout.Root color="red">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>A PDF betöltése nem sikerült: {hiba}</Callout.Text>
        </Callout.Root>
      )}
      {!toltes && hianyzik && demoEredetu && (
        <Callout.Root color="gray">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            Ez a verzió a beépített demó-adatkészletből származik, ezért nincs hozzá mentett PDF. Éles
            használatban minden véglegesített verzióhoz elmentődik a kiadott dokumentum.
          </Callout.Text>
        </Callout.Root>
      )}
      {!toltes && hianyzik && !demoEredetu && (
        <Callout.Root color="amber">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>A verzióhoz nem található mentett PDF.</Callout.Text>
        </Callout.Root>
      )}
      {!toltes && url && (
        <iframe
          title="A verzió mentett PDF-je"
          src={url}
          style={{
            width: '100%',
            height: '80vh',
            border: `1px solid ${t.uiLine}`,
            borderRadius: t.radiusLg,
          }}
        />
      )}
    </Section>
  );
}
