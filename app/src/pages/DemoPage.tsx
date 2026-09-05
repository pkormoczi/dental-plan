// DEMO oldal -- backlog-29 (C1 feloldás): a
// fejlesztési/demonstrációs felület egy top-level menüpont alá gyűjtve,
// elkülönítve az üzleti workflow-tól -- ide költözött a korábban önálló
// Filerendszer nézet és a Kezdőlapról levett Funkciólista/Változásnapló
// kártya. A globális, több-pácienses terv-lista is itt él ("Összes
// terv" fül) -- ez az EGYETLEN fül, ami valódi terv-adatot mutat és élő
// írási akciókat kínál (Új terv, Új verzió, Másolás, Letöltés), a többi
// négy tisztán olvasó/demonstrációs.

import { Box, Heading, Tabs, Text } from '@radix-ui/themes';
import { useNavigate, useParams } from 'react-router-dom';
import ChangelogCard from '../components/ChangelogCard';
import FeatureOverviewCard from '../components/FeatureOverviewCard';
import { t } from '../design/tokens';
import AdatkezelesSection from './demo/AdatkezelesSection';
import FileTreeSection from './demo/FileTreeSection';
import OsszesTervSection from './demo/OsszesTervSection';

const FULEK = ['funkciok', 'tervek', 'filerendszer', 'valtozasnaplo', 'adatkezeles'] as const;
type Ful = (typeof FULEK)[number];

function ervenyesFul(tab: string | undefined): Ful {
  return (FULEK as readonly string[]).includes(tab ?? '') ? (tab as Ful) : 'funkciok';
}

export default function DemoPage() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const aktivFul = ervenyesFul(tab);

  return (
    <Box style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Heading size="5" mb="1" style={{ color: t.brand }}>
        DEMO
      </Heading>
      <Text as="p" size="2" color="gray" mb="4">
        Fejlesztési/demonstrációs felület, nem az üzleti munkafolyamat része.
      </Text>

      {/* `replace`: a fülváltás ne szemetelje tele a history-t, ÉS az URL
          már a helyes fülön álljon MIELŐTT a doki egy sorra kattint --
          enélkül a böngésző-"vissza" a `useListStateMemory`
          POP-alapú megőrzését fülbe zárva, elérhetetlenül hagyná. */}
      <Tabs.Root value={aktivFul} onValueChange={(v) => navigate(`/demo/${v}`, { replace: true })}>
        <Tabs.List mb="4">
          <Tabs.Trigger value="funkciok">Funkciók</Tabs.Trigger>
          <Tabs.Trigger value="tervek">Összes terv</Tabs.Trigger>
          <Tabs.Trigger value="filerendszer">Filerendszer</Tabs.Trigger>
          <Tabs.Trigger value="valtozasnaplo">Változásnapló</Tabs.Trigger>
          <Tabs.Trigger value="adatkezeles">Adatkezelés</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="funkciok">
          <Box style={{ maxWidth: 760 }}>
            <FeatureOverviewCard />
          </Box>
        </Tabs.Content>

        <Tabs.Content value="tervek">
          <OsszesTervSection />
        </Tabs.Content>

        <Tabs.Content value="filerendszer">
          <FileTreeSection />
        </Tabs.Content>

        <Tabs.Content value="valtozasnaplo">
          <Box style={{ maxWidth: 760 }}>
            <ChangelogCard />
          </Box>
        </Tabs.Content>

        <Tabs.Content value="adatkezeles">
          <Box style={{ maxWidth: 760 }}>
            <AdatkezelesSection />
          </Box>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
}
