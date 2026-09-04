// A páciens-duplikáció detektálás (D42, domain/paciensDuplikacio.ts)
// React-rétege -- `components/` a `useDirtyDraft.ts`/`DiscardChangesDialog.tsx`
// precedense szerint (a `domain/` alatt nincs React, a hooknak két hívója
// van: `UjPaciensDialog.tsx` és `PatientEditorPanel.tsx`).
//
// A verseny-kezelés kulcsa: a 2. fázis (DOB/telefon) állapota egy
// `dirName`-mel kulcsolt, KIZÁRÓLAG merge-elt cache, nem lista-csere -- egy
// elavult válasz csak a SAJÁT kulcsára írhat helyes értéket, más kulcsot
// nem tud felülcsapni. Emiatt nincs szükség sorszámozásra/
// `AbortController`-re, a `cancelled` flag csak az unmount-utáni `setState`
// ellen kell (a projekt szokásos idiómája, `Home.tsx`/`PaciensekPage.tsx`).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  duplikaciosJeloltek,
  JELOLT_MAX,
  nevJeloltek,
  type DuplikaciosJelolt,
  type JeloltAdat,
} from '../domain/paciensDuplikacio';
import { paciensTorzsadatbol } from '../domain/paciensAdatok';
import { loadTorzsadatok } from '../domain/torzsadatBetoltes';
import type { PatientFolder } from '../domain/types';
import type { PlanStorage } from '../storage/PlanStorage';

export interface DuplikacioBemenet {
  nev: string;
  szuletesiIdo: string;
  telefon: string;
}

type TorzsadatCache = Record<string, JeloltAdat | null>;

/**
 * Nincs `setTimeout`-debounce -- a projekt sehol nem használ ilyet
 * (`SettingsPage.tsx` szándékosan nem). Ez az egyetlen késleltetés csak a
 * 2. fázis I/O-ját indítja el, a szinkron 1. fázist (`nevJeloltek`) nem --
 * a leütésenkénti túl-triggerelés ellen kell, nem a helyesség ellen (azt a
 * kulcsolt merge önmagában garantálja).
 */
export const DUPLIKACIO_DEBOUNCE_MS = 250;

export function usePaciensDuplikacio(opts: {
  storage: PlanStorage;
  patients: PatientFolder[];
  nev: string;
  szuletesiIdo: string;
  telefon: string;
  kihagyottPaciensId?: string;
}): {
  jeloltek: DuplikaciosJelolt[];
  betolt: boolean;
  ellenoriz: (bemenet: DuplikacioBemenet) => Promise<DuplikaciosJelolt[]>;
} {
  const { storage, patients, nev, szuletesiIdo, telefon, kihagyottPaciensId } = opts;
  const [torzsadat, setTorzsadat] = useState<TorzsadatCache>({});

  const nevlista = useMemo(
    () => nevJeloltek(patients, nev, { kihagyottPaciensId }).slice(0, JELOLT_MAX),
    [patients, nev, kihagyottPaciensId],
  );

  useEffect(() => {
    const hianyzok = nevlista.filter((j) => !(j.patient.dirName in torzsadat));
    if (hianyzok.length === 0) return;

    let cancelled = false;
    const id = setTimeout(() => {
      void (async () => {
        const betoltott = await loadTorzsadatok(storage, hianyzok.map((j) => j.patient));
        if (cancelled) return;
        setTorzsadat((prev) => {
          const next = { ...prev };
          for (const dirName of Object.keys(betoltott)) {
            const b = betoltott[dirName];
            next[dirName] = b.hiba ? null : paciensTorzsadatbol(b.torzsadat);
          }
          return next;
        });
      })();
    }, DUPLIKACIO_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [storage, nevlista, torzsadat]);

  const betolt = nevlista.some((j) => !(j.patient.dirName in torzsadat));

  const jeloltek = useMemo(
    () => duplikaciosJeloltek(nevlista, { nev, szuletesiIdo, telefon }, torzsadat),
    [nevlista, nev, szuletesiIdo, telefon, torzsadat],
  );

  // A `torzsadat` state-et a `ellenoriz` deps-jei mindig a hívás
  // pillanatában legfrissebb értékre viszik -- nincs stale closure, mert a
  // callback a saját maga újraszámolt eredményét adja vissza, nem az
  // állapot-frissítés utáni renderre vár.
  const torzsadatRef = useRef(torzsadat);
  torzsadatRef.current = torzsadat;

  const ellenoriz = useCallback(
    async (bemenet: DuplikacioBemenet): Promise<DuplikaciosJelolt[]> => {
      const lista = nevJeloltek(patients, bemenet.nev, { kihagyottPaciensId }).slice(0, JELOLT_MAX);
      const cache = torzsadatRef.current;
      const hianyzok = lista.filter((j) => !(j.patient.dirName in cache));

      let uj: TorzsadatCache = {};
      if (hianyzok.length > 0) {
        const betoltott = await loadTorzsadatok(storage, hianyzok.map((j) => j.patient));
        for (const dirName of Object.keys(betoltott)) {
          const b = betoltott[dirName];
          uj[dirName] = b.hiba ? null : paciensTorzsadatbol(b.torzsadat);
        }
        setTorzsadat((prev) => ({ ...prev, ...uj }));
      }

      return duplikaciosJeloltek(lista, bemenet, { ...cache, ...uj });
    },
    [storage, patients, kihagyottPaciensId],
  );

  return { jeloltek, betolt, ellenoriz };
}
