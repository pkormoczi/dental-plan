// A telepített app PDF-gombjai (migrációs terv §5.3): a mentett verzió PDF-je már a lemezen van,
// ezért „Megnyitás” a rendszer PDF-olvasójával és „Másolás máshová” natív mentés-dialógussal --
// a böngésző-letöltés a Letöltések mappába tenné, ami OneDrive-ra szinkronizálhat. A piszkozat
// PDF-je még nincs a lemezen: annál csak a másolás van, a bájtokat a hívó adja.

import { useState } from 'react';
import { Button } from '@radix-ui/themes';
import type { PlanRef } from '../domain/types';
import { useStorage } from '../storage/StorageContext';

export type TelepitettPdfForras = { ref: PlanRef } | { bajtok: () => Promise<Uint8Array> };

export default function TelepitettPdfGombok({
  forras,
  javasoltNev,
  size,
  disabled = false,
  onHiba,
  onMasolva,
}: {
  forras: TelepitettPdfForras;
  javasoltNev: string;
  size?: '1' | '2';
  disabled?: boolean;
  onHiba: (uzenet: string | null) => void;
  onMasolva: (fajlnev: string) => void;
}) {
  const { pdfMuveletek } = useStorage();
  const [fut, setFut] = useState(false);
  if (!pdfMuveletek) return null;
  const muveletek = pdfMuveletek;

  async function vegrehajt(muvelet: () => Promise<void>, hibaElotag: string) {
    onHiba(null);
    setFut(true);
    try {
      await muvelet();
    } catch (err) {
      onHiba(`${hibaElotag}: ${err instanceof Error ? err.message : 'váratlan hiba.'}`);
    } finally {
      setFut(false);
    }
  }

  return (
    <>
      {'ref' in forras && (
        <Button
          size={size}
          variant="soft"
          color="gray"
          disabled={disabled || fut}
          onClick={() => void vegrehajt(() => muveletek.megnyit(forras.ref), 'A megnyitás nem sikerült')}
        >
          Megnyitás
        </Button>
      )}
      <Button
        size={size}
        variant="soft"
        color="gray"
        disabled={disabled || fut}
        onClick={() =>
          void vegrehajt(async () => {
            const nev = await muveletek.masol(
              'ref' in forras ? { ref: forras.ref } : { bajtok: await forras.bajtok() },
              javasoltNev,
            );
            if (nev) onMasolva(nev);
          }, 'A másolás nem sikerült')
        }
      >
        Másolás máshová
      </Button>
    </>
  );
}
