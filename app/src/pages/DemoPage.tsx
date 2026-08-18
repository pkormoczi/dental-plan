// DEMO oldal -- backlog-29 (redesign DP-001/DP-088, C1 feloldás): a
// fejlesztési/demonstrációs felület egy top-level menüpont alá gyűjtve,
// elkülönítve az üzleti workflow-tól -- ide költözött a korábban önálló
// Filerendszer nézet és a Kezdőlapról levett Funkciólista/Változásnapló
// kártya.

import { Box, Heading, Tabs, Text } from '@radix-ui/themes';
import ChangelogCard from '../components/ChangelogCard';
import FeatureOverviewCard from '../components/FeatureOverviewCard';
import { t } from '../design/tokens';
import FileTreeSection from './demo/FileTreeSection';

export default function DemoPage() {
  return (
    <Box style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Heading size="5" mb="1" style={{ color: t.brand }}>
        DEMO
      </Heading>
      <Text as="p" size="2" color="gray" mb="4">
        Fejlesztési/demonstrációs felület, nem az üzleti munkafolyamat része.
      </Text>

      <Tabs.Root defaultValue="funkciok">
        <Tabs.List mb="4">
          <Tabs.Trigger value="funkciok">Funkciók</Tabs.Trigger>
          <Tabs.Trigger value="filerendszer">Filerendszer</Tabs.Trigger>
          <Tabs.Trigger value="valtozasnaplo">Változásnapló</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="funkciok">
          <Box style={{ maxWidth: 760 }}>
            <FeatureOverviewCard />
          </Box>
        </Tabs.Content>

        <Tabs.Content value="filerendszer">
          <FileTreeSection />
        </Tabs.Content>

        <Tabs.Content value="valtozasnaplo">
          <Box style={{ maxWidth: 760 }}>
            <ChangelogCard />
          </Box>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
}
