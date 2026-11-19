// Súgó: a tájékoztató felület (mit tud az app, mi változott) a munkafolyamat menüpontjaitól
// külön, a fő menü jobb szélén. A telepített appot a doki kézzel frissíti, ezért a
// Változásnapló mondja meg, mi változott.

import { Box, Heading, Tabs } from '@radix-ui/themes';
import { useNavigate, useParams } from 'react-router-dom';
import ChangelogCard from '../components/ChangelogCard';
import FeatureOverviewCard from '../components/FeatureOverviewCard';
import { t } from '../design/tokens';

const FULEK = ['funkciok', 'valtozasnaplo'] as const;
type Ful = (typeof FULEK)[number];

function ervenyesFul(tab: string | undefined): Ful {
  return (FULEK as readonly string[]).includes(tab ?? '') ? (tab as Ful) : 'funkciok';
}

export default function SugoPage() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const aktivFul = ervenyesFul(tab);

  return (
    <Box style={{ maxWidth: 760, margin: '0 auto' }}>
      <Heading size="5" mb="4" style={{ color: t.brand }}>
        Súgó
      </Heading>

      {/* `replace`: a fülváltás ne szemetelje tele a history-t -- a böngésző-"vissza" a Súgó
          előtti oldalra vigyen, ne fülről fülre. */}
      <Tabs.Root value={aktivFul} onValueChange={(v) => navigate(`/sugo/${v}`, { replace: true })}>
        <Tabs.List mb="4">
          <Tabs.Trigger value="funkciok">Funkciók</Tabs.Trigger>
          <Tabs.Trigger value="valtozasnaplo">Változásnapló</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="funkciok">
          <FeatureOverviewCard />
        </Tabs.Content>

        <Tabs.Content value="valtozasnaplo">
          <ChangelogCard />
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
}
