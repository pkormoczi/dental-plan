// "Másolás új tervbe" (priceList átadásával) másolat-eredetének jelzései --
// szándékosan KÜLÖN modul a `frissArlistaval()`-től (`domain/arKoveti.ts`),
// nem abba ágyazva. Az a függvény egy ÁLTALÁNOS célú "frissítsd a mai
// árlistára" transzformáció -- egy jövőbeli hívó (pl. egy esetleges "teljes
// terv frissítése" szerkesztő-akció) a másolással semmilyen kapcsolatban nem
// lévő terven futtatná, és onnantól hamis "ez másolatból örökölt" jelzést
// kapna. Ez a modul kizárólag a `planCopy.ts` `planMasolatKent()` hívási
// pillanatához kötött, additív provenienciát ír.
//
// A stamper AUTORITATÍV, nem csak additív: a forrás `Sor`/`Fazis` markerei
// szó szerint átjönnének egy sima spreaddel akkor is, ha a mögöttes feltétel
// a forráson már nem áll (pl. egy korábbi másolat-láncból ittmaradt, azóta
// tárgytalanná vált jelzés) -- ezért minden marker a MÁSOLATI állapotból
// újraszámolva íródik, sosem a forrásból átvéve.

import type { Fazis, Plan, PriceList, Sor, Tetel } from './types';

function keziAru(sor: Sor): boolean {
  return sor.tetelId.trim() !== '' && sor.tenylegesEgysegar !== sor.listaEgysegar;
}

function inaktivTetelre(sor: Sor, tetelById: ReadonlyMap<string, Tetel>): boolean {
  const tetel = tetelById.get(sor.tetelId);
  return tetel != null && !tetel.aktiv;
}

/**
 * A `plan` mindhárom marker mezőjének (`Sor.orokoltKeziAr`,
 * `Sor.orokoltInaktivTetel`, `Fazis.orokoltMegjegyzes`) újraszámolása a
 * MÁSOLATI állapot szerint -- `true`, ha a feltétel áll; explicit `false`,
 * ha nem áll, de a mező jelenleg be van állítva (a fenti autoritatív
 * szabály); egyébként a kulcs hiányzó marad, nincs JSON-bloat. A
 * `planMasolatKent()` (domain/planCopy.ts) hívja, a `frissArlistaval()`
 * hívása mellett, azzal egyenrangú, önálló lépésként.
 */
export function orokoltJelzesekkel(plan: Plan, priceList: PriceList): Plan {
  const tetelById = new Map(priceList.tetelek.map((x) => [x.id, x]));
  const fazisok: Fazis[] = plan.fazisok.map((fazis) => {
    const megjegyzesVan = fazis.megjegyzes.trim() !== '';
    const sorok = fazis.sorok.map((sor) => {
      const keziAr = keziAru(sor);
      const inaktiv = inaktivTetelre(sor, tetelById);
      if (!keziAr && !inaktiv && sor.orokoltKeziAr == null && sor.orokoltInaktivTetel == null) {
        return sor;
      }
      return {
        ...sor,
        ...(keziAr || sor.orokoltKeziAr != null ? { orokoltKeziAr: keziAr } : {}),
        ...(inaktiv || sor.orokoltInaktivTetel != null ? { orokoltInaktivTetel: inaktiv } : {}),
      };
    });
    if (!megjegyzesVan && fazis.orokoltMegjegyzes == null) {
      return { ...fazis, sorok };
    }
    return { ...fazis, sorok, orokoltMegjegyzes: megjegyzesVan };
  });
  return { ...plan, fazisok };
}

/**
 * Egy `Sor`-patch kiegészítése az örökölt-jelzések törlési hatásával -- a
 * `sorPatchKovetessel()`/`sorPatchNyelvvel()` mintája. Az `orokoltKeziAr`
 * bármilyen `tenylegesEgysegar`-t érintő patch-re törlődik (kulcs jelenléte
 * -- ezt a `NumberField`/ár-⟳ eleve csak tényleges érték-változásra hívja).
 * Az `orokoltInaktivTetel` viszont csak akkor, ha a `tetelId` TÉNYLEGESEN
 * megváltozik -- a kulcs puszta jelenléte nem elég, mert az `ItemPicker`
 * ugyanarra a (még mindig inaktív) tételre való újraválasztáskor is
 * `tetelId`-t ír a patch-be, ez nem teszi tárgytalanná a provenienciát.
 */
export function sorPatchOroklessel(sor: Sor, patch: Partial<Sor>): Partial<Sor> {
  let eredmeny = patch;
  if (sor.orokoltKeziAr && 'tenylegesEgysegar' in patch) {
    eredmeny = { ...eredmeny, orokoltKeziAr: false };
  }
  if (sor.orokoltInaktivTetel && patch.tetelId !== undefined && patch.tetelId !== sor.tetelId) {
    eredmeny = { ...eredmeny, orokoltInaktivTetel: false };
  }
  return eredmeny;
}

/**
 * Igaz, ha a soron ténylegesen látszó örökölt-ár jelzést kell mutatni -- a
 * tárolt marker ÉS az aktuális adat konzisztenciáját nézi (self-healing):
 * ha a `tenylegesEgysegar` egy a `patchLine`-t megkerülő úton (pl.
 * pénznemváltás, `domain/penznemValtas.ts`) visszaáll a listaárral egyezőre,
 * a jelzés magától eltűnik, marker-törlés nélkül is. A `LineRow` badge-e ÉS
 * az `orokoltKeziAruSorok()` checklist-collector is EZT hívja, nem
 * közvetlenül a `Sor.orokoltKeziAr` mezőt -- egy hely dönti el, mit lát a
 * doki.
 */
export function orokoltKeziAru(sor: Sor): boolean {
  return sor.orokoltKeziAr === true && keziAru(sor);
}

/**
 * Az `orokoltKeziAru()` fázis-megjegyzés párja -- lásd ott. Egy üresre
 * szerkesztett örökölt megjegyzés magától eltűnik a jelzésből.
 */
export function orokoltMegjegyzesu(fazis: Fazis): boolean {
  return fazis.orokoltMegjegyzes === true && fazis.megjegyzes.trim() !== '';
}

/**
 * Örökölt, kézzel felülírt ajánlati árú sorok neve, terv sorrendben -- a
 * `kitoltetlen.ts` `nullaOsszeguSorok()`/`inaktivTetelreHivatkozoSorok()`
 * mintája, a véglegesítés-őr `'orokolt-kezi-ar'` info csekklista-tételéhez.
 */
export function orokoltKeziAruSorok(plan: Plan): string[] {
  const eredmeny: string[] = [];
  plan.fazisok.forEach((fazis) => {
    fazis.sorok.forEach((sor) => {
      if (sor.nevSnapshot.trim() && orokoltKeziAru(sor)) eredmeny.push(sor.nevSnapshot);
    });
  });
  return eredmeny;
}

/**
 * Másoláskor is inaktivált tételre hivatkozó sorok neve, terv sorrendben --
 * szándékosan a TÁROLT `Sor.orokoltInaktivTetel` mezőt olvassa
 * újra-derivált predikátum nélkül (lásd `orokoltInaktivTetel` doc-ját a
 * `types.ts`-ben) -- a véglegesítés-őr `'inaktiv-tetel-orokolt'` soft
 * csekklista-tételéhez.
 */
export function orokoltInaktivSorok(plan: Plan): string[] {
  const eredmeny: string[] = [];
  plan.fazisok.forEach((fazis) => {
    fazis.sorok.forEach((sor) => {
      if (sor.nevSnapshot.trim() && sor.orokoltInaktivTetel === true) eredmeny.push(sor.nevSnapshot);
    });
  });
  return eredmeny;
}

/**
 * Örökölt fázismegjegyzésű fázisok neve, terv sorrendben -- a véglegesítés-
 * őr `'orokolt-fazismegjegyzes'` info csekklista-tételéhez.
 */
export function orokoltMegjegyzesuFazisok(plan: Plan): string[] {
  const eredmeny: string[] = [];
  plan.fazisok.forEach((fazis) => {
    if (orokoltMegjegyzesu(fazis)) eredmeny.push(fazis.megnevezes);
  });
  return eredmeny;
}
