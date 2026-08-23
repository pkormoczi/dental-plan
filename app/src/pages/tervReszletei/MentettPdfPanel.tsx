// A "mentett PDF" slot tartalma a Terv részletei nézeten -- lásd
// docs/03-funkcionalis-spec.md § 11. A `usePlanPdfObjectUrl` MÁR MEGLÉVŐ
// bájtjait ágyazza be, sosem generál újra (szemben a `PreviewPage.tsx`
// `usePDF()`-jével, ami a DRAFT-ot élőben rendereli) -- ez a hívó adja a
// blob-URL-t, a panel tisztán prezentációs, a PreviewPage iframe-stílusát
// követve. Hiányzó/olvashatatlan PDF esetén a panel csak egy üzenetet mutat
// -- a lap többi, JSON-ból származó tartalma emiatt nem válik olvashatatlanná.

import { Box, Callout, Skeleton } from '@radix-ui/themes';
import { CrossCircledIcon } from '@radix-ui/react-icons';
import Section from '../../components/Section';
import { t } from '../../design/tokens';

export interface MentettPdfPanelProps {
  url: string | null;
  toltes: boolean;
  hianyzik: boolean;
  hiba: string | null;
}

export default function MentettPdfPanel({ url, toltes, hianyzik, hiba }: MentettPdfPanelProps) {
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
      {!toltes && hianyzik && (
        <Callout.Root color="gray">
          <Callout.Text>Ehhez a verzióhoz nincs mentett PDF.</Callout.Text>
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
