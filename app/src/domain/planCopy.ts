// Terv másolása új tervként. Két tiszta transzformáció egy
// korábbi tervből -- a `tervId` üresen indul, tehát a storage.savePlan()
// automatikusan új páciensmappát nyit, sosem csúszik be verzióként
// egy meglévő láncba.

import { frissArlistaval } from './arKoveti';
import { createBlankPlan } from './blankPlan';
import type { OroklottNyelvPenznem } from './blankPlan';
import { orokoltJelzesekkel } from './orokoltJelzesek';
import { alapertelmezettOrvosNeve } from './orvosok';
import { paciensTorzsadatbol } from './paciensAdatok';
import { computeOsszesitok } from './totals';
import { frissDatummal } from './ujVerzioDatum';
import type { PatientMasterData, Plan, PriceList, Settings } from './types';

/**
 * "Új terv" (páciensszintű) -- csak a `paciens` blokk és a `paciensId` jön a
 * forrásból (ez tartja a másolatot ugyanabban a páciens-mappában, új
 * terv-láncként -- lásd `planMasolatKent` kommentjét), minden más a mai
 * `createBlankPlan()` friss alapértéke -- KIVÉVE a nyelvet/pénznemet, ha a
 * hívó a `oroklott` paraméterrel a páciens legutóbb véglegesített tervéből
 * adja át -- ugyanúgy, mintha a doki a Kezdőlap "+ Új kezelési terv"
 * gombját nyomta volna, azzal a különbséggel.
 */
export function planUjPaciensselTervhez(
  plan: Plan,
  settings: Settings,
  priceList: PriceList,
  oroklott?: OroklottNyelvPenznem | null,
): Plan {
  return {
    ...createBlankPlan(settings, priceList, oroklott),
    paciens: plan.paciens,
    paciensId: plan.paciensId,
  };
}

/**
 * "Új terv" (páciensszintű), a lezárt páciens-adatok.json-ból (backlog-28)
 * -- a `planUjPaciensselTervhez` párja, de a forrás nem egy korábbi
 * `Plan.paciens` pillanatkép, hanem az élő törzsadat. A hívó dönti el,
 * melyiket használja (`domain/paciensAdatok.ts` `megjelenitettTorzsadat`
 * mondja ki, van-e lezárt fájl). Az `oroklott` paraméter jelentése
 * ugyanaz, mint `planUjPaciensselTervhez`-nél.
 */
export function planUjTorzsadattal(
  adatok: PatientMasterData,
  settings: Settings,
  priceList: PriceList,
  oroklott?: OroklottNyelvPenznem | null,
): Plan {
  return {
    ...createBlankPlan(settings, priceList, oroklott),
    paciens: paciensTorzsadatbol(adatok),
    paciensId: adatok.paciensId,
  };
}

/**
 * "Másolás új tervbe" -- a szakmai tartalmat (fázisok, sorok, `arlistaVerzio`,
 * ugyanaz a snapshot-elv, mint egy meglévő terv új verzióra nyitásakor) a
 * forrásból, az azonosító/állapot/dátum kivételével. Két mező KIVÉTEL:
 * a `paciens` blokk -- a `master` -- ha van --
 * felülírja a forrás pillanatképét, mert a másolás pillanatában a doki a
 * páciens JELENLEGI adatait akarja az új ajánlatba tenni, nem a forrás
 * verzió esetleg hónapokkal korábbi állapotát. Törzsadat híján (`master`
 * hiányzik) a forrás `plan.paciens` pillanatképe marad, a mai viselkedés.
 * Az `orvos` -- MINDIG a mai globális alapértelmezett orvos, a forrás
 * orvosa SOSEM másolódik át (ellentétben a nyelvvel/pénznemmel, ami
 * pillanatkép-jelleggel öröklődik). Az `osszesitok` a saját (átvett)
 * `fazisok`-ból ÚJRASZÁMOLVA -- a forrás `osszesitok`-ja az EREDETI, már
 * mentett terv fájl-igazsága, nem a most keletkező piszkozaté.
 *
 * Az opcionális `priceList` -- ha a hívó átadja -- a `frissArlistaval()`-t
 * (domain/arKoveti.ts, backlog-61) futtatja a fázisokon: azok a
 * sorok, amik a forrásban PONTOSAN követték az akkori árlistát (ár ÉS név
 * ÉS leírás egyaránt), az AKTUÁLIS árlistára frissülnek, a kézzel felülírt
 * sorok érintetlenek maradnak; a másolat `arlistaVerzio`-ja ilyenkor az
 * aktuális árlistáé lesz. `priceList` híján (a hívó nem adja át) a forrás
 * sorai és `arlistaVerzio`-ja változatlanul másolódnak -- a korábbi,
 * VÁRAKOZÓ viselkedés.
 *
 * Ugyanezzel a `priceList`-gate-tel az `orokoltJelzesekkel()`
 * (domain/orokoltJelzesek.ts) a `frissArlistaval()` MELLETT, önálló
 * lépésként jelöli meg, mely sorok/fázisok tartalma másolatból örökölt: a
 * kézzel felülírt ajánlati ár, a másoláskor már inaktivált tételre
 * hivatkozás, és a nem üres fázismegjegyzés. `priceList` híján egyik
 * jelzés sem íródik.
 */
export function planMasolatKent(
  plan: Plan,
  settings: Settings,
  ma: string,
  master?: PatientMasterData | null,
  priceList?: PriceList | null,
): Plan {
  const friss = frissDatummal(plan, settings, ma);
  const arlistavalFriss = priceList ? frissArlistaval(friss, priceList) : friss;
  const jelzesekkel = priceList ? orokoltJelzesekkel(arlistavalFriss, priceList) : arlistavalFriss;
  return {
    ...jelzesekkel,
    orvos: alapertelmezettOrvosNeve(settings),
    paciens: master ? paciensTorzsadatbol(master) : friss.paciens,
    tervId: '',
    verzio: 0,
    statusz: 'PISZKOZAT',
    // A "Csak ajánlat" állapot NEM öröklődik másoláskor (ellentétben az "Új
    // verzió" nyitással) -- enélkül a fenti spread csendben átvinné a forrás
    // állapotát, amit ez a mező kifejezetten kizár.
    csakAjanlat: false,
    osszesitok: computeOsszesitok(jelzesekkel.fazisok, jelzesekkel.kedvezmenyOsszeg),
  };
}
