// Beállítások. Három
// tab (Rendelő adatai / Nyomtatványok / Egyéb), mindegyik saját explicit
// Mentés/Mégse + dirty guarddal -- a korábbi leütésenkénti autosave
// ezen a lapon megszűnt (az Árlista admin Kategóriák paneljének
// attribútum-szerkesztése azóta ugyanezt a mintát követi, a tétel-
// szerkesztés és a kategória létrehozás/törlés viszont autosave marad).
//
// A Radix `Tabs.Content` unmountolja az inaktív tabot, ezért egyszerre csak
// egy tab draftja él -- a `dirty` egyetlen state a lap szintjén (a
// `NavGuardContext` egy-boolean invariánsa, ide is érvényes), a mindenkori aktív tab tölti fel az
// `onDirtyChange` callbacken át.

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Heading, Tabs } from '@radix-ui/themes';
import DiscardChangesDialog, { useDiscardGuard } from '../components/DiscardChangesDialog';
import { useNavGuard } from '../components/NavGuardContext';
import { t } from '../design/tokens';
import RendeloTab from './settings/RendeloTab';
import NyomtatvanyokTab, { clearAllTemplateDraftCache } from './settings/NyomtatvanyokTab';
import EgyebTab from './settings/EgyebTab';

type SettingsTab = 'rendelo' | 'nyomtatvanyok' | 'egyeb';

function toSettingsTab(value: string): SettingsTab {
  if (value === 'nyomtatvanyok') return 'nyomtatvanyok';
  if (value === 'egyeb') return 'egyeb';
  return 'rendelo';
}

export default function SettingsPage() {
  // A checklist "Nyomtatvány szövegei" gombja (domain/veglegesitesOr.ts
  // '/beallitasok?tab=nyomtatvanyok') a query paraméterrel jelöli ki az
  // induló fület -- kizárólag a KEZDETI mount pillanatában (lásd a lenti
  // lazy state init), nincs param->state szinkron effekt: egy már mountolt lapon
  // a fülváltás kizárólag a lenti dirty-guardon át történhet.
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<SettingsTab>(() => toSettingsTab(searchParams.get('tab') ?? ''));
  const [dirty, setDirty] = useState(false);
  const guard = useDiscardGuard(dirty);
  // Ugyanez a dirty jelző a NavBar-navigációt is védi.
  useNavGuard(dirty);

  function requestTab(next: SettingsTab) {
    guard.request(() => {
      // A Nyomtatványok tab piszkozat-cache-e (`dp:sablon-piszkozat`) túléli
      // az unmountot -- elvetéskor explicit törölni kell, különben egy F5 a
      // tab-váltás UTÁN visszahozná a már elvetett szöveget.
      if (tab === 'nyomtatvanyok') clearAllTemplateDraftCache();
      setDirty(false);
      setTab(next);
    });
  }

  return (
    <Box style={{ maxWidth: 900, margin: '0 auto' }}>
      <Heading size="5" mb="4" style={{ color: t.brand }}>
        Beállítások
      </Heading>

      <Tabs.Root value={tab} onValueChange={(v) => requestTab(toSettingsTab(v))}>
        <Tabs.List mb="4">
          <Tabs.Trigger value="rendelo">Rendelő adatai</Tabs.Trigger>
          <Tabs.Trigger value="nyomtatvanyok">Nyomtatványok</Tabs.Trigger>
          <Tabs.Trigger value="egyeb">Egyéb</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="rendelo">
          <RendeloTab onDirtyChange={setDirty} />
        </Tabs.Content>

        <Tabs.Content value="nyomtatvanyok">
          <NyomtatvanyokTab onDirtyChange={setDirty} />
        </Tabs.Content>

        <Tabs.Content value="egyeb">
          <EgyebTab onDirtyChange={setDirty} />
        </Tabs.Content>
      </Tabs.Root>

      <DiscardChangesDialog
        open={guard.pending}
        onOpenChange={(open) => !open && guard.cancel()}
        onConfirm={guard.confirm}
        title="Nem mentett módosítás"
        description="Ezen a lapon nem mentett módosításod van. Ha másik fülre váltasz, ez elvész — csak a Mentés gomb rögzíti. Biztosan folytatod?"
        confirmLabel="Váltás, módosítás elvetésével"
      />
    </Box>
  );
}
