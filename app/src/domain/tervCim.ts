// Terv-címke auto-javaslata -- a Korábbi tervek fán megjelenő terv-lánc
// címe, amíg a doki kézzel át nem írja (lásd app/src/storage/CLAUDE.md).
// A domináns kategória a legnagyobb ÖSSZEGŰ (nem a
// legtöbb sorból álló) kategória, mert egy nagy értékű beavatkozás jobban
// jellemzi a tervet, mint egy olcsó, de gyakori tétel; holtversenynél a
// kisebb `sorrend`-ű kategória nyer -- ugyanaz a precedencia-elv, mint a
// fogtérkép ütközésfeloldásában (`resolveToothVisual`,
// domain/toothVisual.ts).

import { sorOsszeg } from './totals';
import type { Kategoria, Plan, PriceList } from './types';

export const ALAPERTELMEZETT_TERV_CIM = 'Terv';

/**
 * A legnagyobb ÖSSZEGŰ kategória a tervben (a tie-break szabályt lásd a
 * fájl fejlécében), vagy `null`, ha nincs kategóriába sorolható sor. Ezt a
 * `javasoltTervCim()` ÉS a `pdf/pdfCimLokalizacio.ts` PDF-cím-feloldója is
 * hívja -- utóbbinak a teljes `Kategoria` objektumra van szüksége
 * (`nev.de`-re is), nem csak a `javasoltTervCim()` HU-visszaesésű
 * sztringjére.
 */
export function dominansKategoria(plan: Plan, priceList: PriceList): Kategoria | null {
  const tetelById = new Map(priceList.tetelek.map((t) => [t.id, t]));
  const kategoriaById = new Map(priceList.kategoriak.map((k) => [k.id, k]));
  const osszegByKategoria = new Map<string, number>();

  for (const fazis of plan.fazisok) {
    for (const sor of fazis.sorok) {
      // Üres tetelId = egyedi sor, vagy a tétel már nincs a mai árlistában --
      // egyik sem sorolható be kategóriába, kimarad az összegzésből.
      const tetel = sor.tetelId ? tetelById.get(sor.tetelId) : undefined;
      if (!tetel) continue;
      osszegByKategoria.set(
        tetel.kategoriaId,
        (osszegByKategoria.get(tetel.kategoriaId) ?? 0) + sorOsszeg(sor),
      );
    }
  }

  let best: Kategoria | null = null;
  let bestOsszeg = -Infinity;
  for (const [kategoriaId, osszeg] of osszegByKategoria) {
    const kategoria = kategoriaById.get(kategoriaId);
    if (!kategoria) continue; // hivatkozott, de azóta törölt kategória -- nem választható
    if (
      osszeg > bestOsszeg ||
      (osszeg === bestOsszeg &&
        (kategoria.sorrend < best!.sorrend ||
          (kategoria.sorrend === best!.sorrend && kategoria.id < best!.id)))
    ) {
      best = kategoria;
      bestOsszeg = osszeg;
    }
  }

  return best;
}

/** Mindig magyar -- a kezelőfelület (a fájlnév-javaslat is) végig magyar marad. */
export function javasoltTervCim(plan: Plan, priceList: PriceList): string {
  return dominansKategoria(plan, priceList)?.nev.hu ?? ALAPERTELMEZETT_TERV_CIM;
}

/**
 * Melyik címke látszik ténylegesen: a kézzel átírt (`terv-cimke.json`-beli)
 * vagy az élő auto-javaslat. Ez az EGYETLEN hely, ahol ez eldől -- a
 * Korábbi tervek fa és a terv-mappa nevének kiinduló javaslata
 * (`storage.savePlan`) is ezt hívja.
 */
export function megjelenitettTervCim(
  tervCim: string | null,
  plan: Plan,
  priceList: PriceList,
): string {
  return tervCim ?? javasoltTervCim(plan, priceList);
}
