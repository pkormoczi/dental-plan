// Megosztott dirty-draft primitív -- D38 (docs/07-felulet-rendszer.md
// § Komponensek): korábban a `PatientEditorPanel` saját, bespoke
// referencia-tartotta `initializedRef`/`JSON.stringify`-mintáját három hívó
// (PatientEditorPanel, SettingsPage sablon-szekció, PatientDetailPage tab-váltás)
// duplikálná külön-külön -- ez az EGYETLEN hely, ahol ez a logika él.

import { useEffect, useRef, useState } from 'react';

/** `JSON.stringify`-alapú mély-egyenlőség -- tetszőleges (nem feltétlenül
 * immutable-update mintájú) mezőkészletre is biztonságosan működik,
 * ellentétben egy referencia-egyenlőség alapú komparátorral. */
export function draftDirty<T>(draft: T, saved: T): boolean {
  return JSON.stringify(draft) !== JSON.stringify(saved);
}

/**
 * `saved` egyszer, amint `opts.ready` igazra vált, inicializálja a
 * `draft`-ot -- egy késve érkező fallback (pl. PatientEditorPanel lusta terv-
 * betöltése) így nem írja felül a doki közben megkezdett gépelését.
 * `opts.ready` alapértéke `true` (azonnali inicializálás).
 */
export function useDirtyDraft<T>(saved: T, opts?: { ready?: boolean }) {
  const ready = opts?.ready ?? true;
  const [draft, setDraft] = useState<T>(saved);

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current || !ready) return;
    setDraft(saved);
    initializedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, ready]);

  const dirty = draftDirty(draft, saved);

  function reset() {
    setDraft(saved);
  }

  return { draft, setDraft, dirty, reset };
}
