// A „Mappa váltása” egy helyen: a Beállítások Adattárolás füle és a betöltési hibaképernyő
// ugyanezt futtatja. A félkész terv a régi mappa páciensére mutathat, ezért a váltás csak a doki
// igenje után, a terv elvetésével mehet.

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Dialog, VisuallyHidden } from '@radix-ui/themes';
import type { Adattarolas } from '../storage/StorageContext';
import AdatmappaPanel from './AdatmappaPanel';
import DiscardChangesDialog from './DiscardChangesDialog';
import { useAdatmappaValasztas, type AdatmappaValasztas } from './useAdatmappaValasztas';

export interface FelkeszTerv {
  van: () => Promise<boolean>;
  elvet: () => Promise<void>;
}

export function useMappaValtas(
  adattarolas: Adattarolas,
  felkesz: FelkeszTerv,
): { valasztas: AdatmappaValasztas; dialogusok: ReactNode } {
  const piszkozatValasz = useRef<((ok: boolean) => void) | null>(null);
  const [piszkozatKerdes, setPiszkozatKerdes] = useState(false);

  const valtasElott = useCallback(async () => {
    if (!(await felkesz.van())) return true;
    const ok = await new Promise<boolean>((resolve) => {
      piszkozatValasz.current = resolve;
      setPiszkozatKerdes(true);
    });
    piszkozatValasz.current = null;
    setPiszkozatKerdes(false);
    if (ok) await felkesz.elvet();
    return ok;
  }, [felkesz]);

  const valasztas = useAdatmappaValasztas(adattarolas, { kezdo: null, valtasElott });

  const dialogusok = (
    <>
      <Dialog.Root open={valasztas.mutatott != null} onOpenChange={(open) => !open && valasztas.alaphelyzet()}>
        <Dialog.Content maxWidth="560px" aria-describedby={undefined} style={{ textAlign: 'left' }}>
          <VisuallyHidden>
            <Dialog.Title>Mappa váltása</Dialog.Title>
          </VisuallyHidden>
          <AdatmappaPanel valasztas={valasztas} onMegse={valasztas.alaphelyzet} />
        </Dialog.Content>
      </Dialog.Root>

      <DiscardChangesDialog
        open={piszkozatKerdes}
        onOpenChange={(open) => !open && piszkozatValasz.current?.(false)}
        onConfirm={() => piszkozatValasz.current?.(true)}
        title="Félkész terv"
        description="Van egy félkész terved. Mappaváltáskor elvész, mert a jelenlegi mappa egy páciensére mutathat. Biztosan váltasz?"
        confirmLabel="Váltás, a félkész terv elvetésével"
      />
    </>
  );

  return { valasztas, dialogusok };
}
