import { basePrice } from './money';
import { arlistaiLeiras, resolveNev } from './nev';
import type { Nyelv, Penznem, Sor, Tetel } from './types';

/**
 * Egy árlista-tétel felvételéhez/kitöltéséhez tartozó soradatok -- közös az
 * új sor felvitelénél (`addLine`) és egy a fogtérképről létrehozott, tétel
 * nélküli sor utólagos kitöltésénél (`LineRow` beágyazott `ItemPicker`-je),
 * hogy az árazási logika (SAVOS -> min) egy helyen éljen -- lásd
 * `domain/money.ts` `basePrice()` és app/src/domain/CLAUDE.md, ne írd újra.
 *
 * 62. tétel: egy `currency`-ben nem beárazott tétel (`ar[currency] ==
 * null`) is felvehető -- a keresőben ma már megjelenik (`available` a
 * PlanEditorPage-en nem szűr pénznemre). Ilyenkor a sor `listaEgysegar`/
 * `tenylegesEgysegar` `0`-n indul, "hiányzó ár" állapotban -- lásd
 * `domain/penznemValtas.ts` `nincsListaar()` és a kemény véglegesítés-
 * blokk (`domain/kitoltetlen.ts` `araztalanSorok()`).
 */
export function sorMezokTetelbol(
  item: Tetel,
  currency: Penznem,
  nyelv: Nyelv,
): Pick<
  Sor,
  | 'tetelId'
  | 'nevSnapshot'
  | 'savos'
  | 'listaEgysegar'
  | 'tenylegesEgysegar'
  | 'leirasSnapshot'
  | 'nevNyelv'
  | 'leirasNyelv'
> {
  const ar = item.ar[currency];
  const base = basePrice(ar);
  return {
    tetelId: item.id,
    nevSnapshot: resolveNev(item.nev, nyelv).szoveg,
    savos: ar?.tipus === 'SAVOS',
    listaEgysegar: base,
    tenylegesEgysegar: base,
    // Nincs HU-visszaesés a leírásra, hiányzó fordítás = üres.
    leirasSnapshot: arlistaiLeiras(item, nyelv),
    // Árlistát követő szöveg -- nincs mit nyelvileg ellenőrizni.
    nevNyelv: null,
    leirasNyelv: null,
  };
}

/**
 * Egy egyedi (árlistán kívüli) sor mezői -- backlog-3: a doki a keresőben
 * begépelt szöveget veszi fel névként, ha egyetlen árlistai tétel sem talál
 * rá (`ItemPicker` `onPickEgyedi`). `tetelId: ''` -- nincs árlistai
 * hivatkozás, tehát nincs értelmezhető listaár sem, ezért
 * `listaEgysegar === tenylegesEgysegar` induláskor és minden későbbi
 * árszerkesztéskor is (lásd `LineRow` "Ajánlati ár" mezője) -- így egyedi
 * soron sosem jelenik meg kedvezmény-jelvény. `savos: false` csak kezdőérték --
 * a 4. backlog-tétel becsült ár kapcsolója (`LineRow` ár-cella) ugyanúgy
 * szabadon átbillenthető egyedi soron is, mint bármelyik máson.
 */
export function sorMezokEgyedibol(
  nev: string,
  nyelv: Nyelv,
): Pick<
  Sor,
  | 'tetelId'
  | 'nevSnapshot'
  | 'savos'
  | 'listaEgysegar'
  | 'tenylegesEgysegar'
  | 'leirasSnapshot'
  | 'nevNyelv'
  | 'leirasNyelv'
> {
  return {
    tetelId: '',
    nevSnapshot: nev.trim(),
    savos: false,
    listaEgysegar: 0,
    tenylegesEgysegar: 0,
    leirasSnapshot: '',
    // A begépelt egyedi név a doki saját szövege -- ez tölti be a
    // `sorFallback` 'egyedi' ágának deklarált vakfoltját ("nem
    // ellenőrizhető, milyen nyelven íródott", domain/nev.ts).
    nevNyelv: { authoredInLanguage: nyelv },
    leirasNyelv: null,
  };
}
