// A telepített app az alkalmazás elé állítja az adatmappa-kaput: amíg nincs a miénknek talált
// adatmappa, sem a pácienslista, sem más képernyő nem látszik -- egy még nem csatolt Drive üres
// listát mutatna (migrációs terv §6.4). A demóban nincs kapu.

import type { ReactNode } from 'react';
import { Box, Card } from '@radix-ui/themes';
import { t } from '../design/tokens';
import { useStorage, type Adattarolas } from '../storage/StorageContext';
import AdatmappaPanel from './AdatmappaPanel';
import { useAdatmappaValasztas } from './useAdatmappaValasztas';

export default function AdatmappaKapu({ children }: { children: ReactNode }) {
  const { adattarolas } = useStorage();
  if (!adattarolas || adattarolas.allapot.allapot === 'rendben') return <>{children}</>;
  return <KapuKepernyo adattarolas={adattarolas} />;
}

function KapuKepernyo({ adattarolas }: { adattarolas: Adattarolas }) {
  const valasztas = useAdatmappaValasztas(adattarolas, { kezdo: adattarolas.allapot });
  return (
    <main style={{ minHeight: '100vh', background: t.page, fontFamily: t.font, color: t.text, padding: 24 }}>
      <Box style={{ maxWidth: 620, margin: '48px auto 0' }}>
        <Card size="3">
          <AdatmappaPanel valasztas={valasztas} />
        </Card>
      </Box>
    </main>
  );
}
