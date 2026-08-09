import { describe, expect, it } from 'vitest';
import { basePrice } from '../../domain/money';
import { seedPlans } from './plans';
import { seedPriceList } from './priceList';

// A demó tervek tetelId-hivatkozásainak integritása. A hiba, amit ez a teszt
// megfog: egy LÉTEZŐ, de ROSSZ tételre mutató id -- a sor szövege és ára
// ilyenkor is helyes marad (nevSnapshot/listaEgysegar pillanatkép, D7), de a
// fogtérkép (domain/toothVisual.ts) a jelenlegi árlistából olvassa a
// kategóriát az id alapján, tehát csendben rossz színt ad. A puszta
// létezés-ellenőrzés ezt nem fogja meg, az ár-egyezés igen.
//
// Hatókör: kizárólag a demó/seed adat. Éles, véglegesített terveken a
// pillanatkép SZÁNDÉKOSAN eltérhet a mai árlistától (D7, árlista-frissítés
// után) -- ott ugyanez az állítás hamis pozitív lenne.
//
// Névre nincs assertion: a nevSnapshot a demóban is lehet pontosabb az
// árlistainál (t057 "Neodent implantátum" vs. az árlista ékezethibás
// "implantatum"-a; t074 "Zirkonkerámia korona fogra" vs. a rövidebb
// "Zirkonkerámia fogra"), és a backlog 3. tétele óta a doki kézzel is
// szerkesztheti -- a szó szerinti egyezés nem érvényes invariáns.

const tetelById = new Map(seedPriceList.tetelek.map((t) => [t.id, t]));

interface SeedSor {
  cimke: string;
  tetelId: string;
  listaEgysegar: number;
  penznem: (typeof seedPlans)[number]['plan']['penznem'];
}

const sorok: SeedSor[] = seedPlans.flatMap(({ plan }) =>
  plan.fazisok.flatMap((fazis) =>
    fazis.sorok
      .filter((sor) => sor.tetelId !== '')
      .map((sor) => ({
        cimke: `${plan.paciens.nev} v${plan.verzio} / ${fazis.sorszam}. fázis / "${sor.nevSnapshot}"`,
        tetelId: sor.tetelId,
        listaEgysegar: sor.listaEgysegar,
        penznem: plan.penznem,
      })),
  ),
);

describe('seedPlans tetelId-integritás', () => {
  it('minden demó sor hivatkozik legalább egy tételre', () => {
    expect(sorok.length).toBeGreaterThan(0);
  });

  it.each(sorok)('$cimke -> $tetelId létezik az árlistában', ({ tetelId }) => {
    expect(tetelById.get(tetelId)).toBeDefined();
  });

  it.each(sorok)(
    '$cimke -> $tetelId árlistai ára egyezik a listaEgysegar-ral',
    ({ tetelId, listaEgysegar, penznem }) => {
      const tetel = tetelById.get(tetelId);
      expect(tetel).toBeDefined();
      expect(basePrice(tetel!.ar[penznem])).toBe(listaEgysegar);
    },
  );
});
