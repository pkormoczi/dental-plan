import { nevEgyezik, norm } from './search';
import type { Tetel } from './types';

export type FilterKey = 'all' | 'noeur' | 'range' | 'off' | 'fav';

// Mindkét nyelven keres, ugyanaz a szabály, mint a szerkesztő
// tétel-keresőjében (backlog-7): egy csak németül elgépelt/elnevezett
// tétel eddig itt egyáltalán nem volt megtalálható. Külön a
// `tetelMegtartando()`-tól (lásd lent) -- a Tömeges árváltoztatás dialógus
// "jelenlegi szűrt lista" köre EZT a predikátumot használja, a nyitott sor
// kivétele NÉLKÜL: az a kivétel a szerkesztés közbeni eltűnés ellen véd,
// egy tömeges művelet körét viszont hamisan tágítaná (backlog-92).
export function tetelIlleszkedik(x: Tetel, q: string, filter: FilterKey): boolean {
  if (q && !nevEgyezik(x.nev, norm(q))) return false;
  if (filter === 'noeur') return !x.ar.EUR;
  if (filter === 'range') return x.ar.HUF?.tipus === 'SAVOS' || x.ar.EUR?.tipus === 'SAVOS';
  if (filter === 'off') return !x.aktiv;
  if (filter === 'fav') return x.gyakori;
  return true;
}

/**
 * P0-7: a nyitott sort MINDIG megtartjuk, akkor is, ha egy időközbeni
 * szerkesztés (pl. az első EUR-számjegy begépelése a "Nincs EUR ár" szűrő
 * alatt) kiejtené a szűrőből -- enélkül a sor (és vele az `ItemEditor`)
 * eltűnt a doki keze alól, mielőtt végigírta volna a számot. A blur-re
 * commitáló `NumberField` már önmagában is sokat segít, de ez a védelem a
 * commit UTÁNI állapotra is vonatkozik.
 */
export function tetelMegtartando(
  x: Tetel,
  q: string,
  filter: FilterKey,
  nyitottId: string | null,
): boolean {
  if (x.id === nyitottId) return true;
  return tetelIlleszkedik(x, q, filter);
}
