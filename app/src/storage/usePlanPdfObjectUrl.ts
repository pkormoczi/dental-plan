// A "bájtok -> Blob -> object URL, cleanupban revoke" effekt megosztott
// otthona -- korábban a `pages/demo/fileTree/FileContentPanel.tsx`-ben élt
// egyedül, a Terv részletei lap (75. tétel) beágyazott PDF-viewere a
// második hívó. A dep-lista a REF HÁROM mezőjére megy, nem az objektum-
// identitására, hogy a hívónak ne kelljen `useMemo`-znia egy inline
// `{...}`-ot.

import { useEffect, useState } from 'react';
import type { PlanRef } from '../domain/types';
import { useStorage } from './StorageContext';

export interface PlanPdfObjectUrlState {
  url: string | null;
  toltes: boolean;
  hianyzik: boolean;
  hiba: string | null;
}

export function usePlanPdfObjectUrl(ref: PlanRef | null): PlanPdfObjectUrlState {
  const { loadPlanPdf } = useStorage();
  const [url, setUrl] = useState<string | null>(null);
  const [toltes, setToltes] = useState(false);
  const [hianyzik, setHianyzik] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);

  const patientDir = ref?.patientDir ?? null;
  const planDir = ref?.planDir ?? null;
  const versionDir = ref?.versionDir ?? null;

  useEffect(() => {
    setUrl(null);
    setHianyzik(false);
    setHiba(null);
    if (patientDir == null || planDir == null || versionDir == null) {
      setToltes(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setToltes(true);

    (async () => {
      try {
        const bytes = await loadPlanPdf({ patientDir, planDir, versionDir });
        if (cancelled) return;
        if (!bytes) {
          setHianyzik(true);
          return;
        }
        objectUrl = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
        setUrl(objectUrl);
      } catch (err) {
        if (!cancelled) {
          setHiba(err instanceof Error ? err.message : 'A PDF betöltése váratlanul meghiúsult.');
        }
      } finally {
        if (!cancelled) setToltes(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [loadPlanPdf, patientDir, planDir, versionDir]);

  return { url, toltes, hianyzik, hiba };
}
