// Véglegesítés-őr -- a PreviewPage.tsx tartalmi validációjának tiszta,
// React-mentes magja (lásd app/src/domain/CLAUDE.md). Egységes,
// navigálható `hard`/`soft`/`info` tétel-lista
// modellt ad -- a korábbi, szekvenciális megerősítő-lánc
// (`VEGLEGESITES_LEPESEK`/`kovetkezoLepes`) megszűnt: a puha tételek NEM
// blokkolnak és nem kérnek "Folytatás"-t, a sorrend a checklist RENDER-
// sorrendje, nem egy bejárt állapotgép. A meglévő domain-függvényeket
// hívja, egyiket sem írja újra -- lásd `domain/kitoltetlen.ts`,
// `domain/nemetNev.ts`, `domain/nev.ts`.
//
// A `PreviewPage.tsx`-ben marad: a React state, a checklist RENDERelése,
// a `doFinalize()`, és az `isPlaceholderTemplate()`-re épülő placeholder-zár
// (a nyilatkozat+aláírás blokk letiltása: a jogász „még nincs lezárva"
// jelölésű szövege nem kerülhet aláírásra) -- ez utóbbi nem ehhez a listához,
// hanem a nyilatkozat blokk renderjéhez tartozik (a `nyilatkozat-
// placeholder` tétel itt csak a TÉNYT jelzi, a kényszerített offer-only
// mód a hívó dolga).

import {
  araztalanSorok,
  fogszamNelkuliSorok,
  hianyzoCsomagLeirasok,
  inaktivTetelreHivatkozoSorok,
  kitoltetlenSorok,
  nullaOsszeguSorok,
  uresFazisok,
} from './kitoltetlen';
import { arElteroSorok } from './arKoveti';
import { masterSnapshotDiff } from './masterSnapshotDiff';
import { formatMoney } from './money';
import { igazolatlanNemetKategoriak, igazolatlanNemetNevek } from './nemetNev';
import {
  orokoltInaktivSorok,
  orokoltKeziAruSorok,
  orokoltMegjegyzesuFazisok,
} from './orokoltJelzesek';
import { nyelviMismatchek, type NyelviMismatchTetel, type ReviewMezo } from './nyelviReview';
import type { PaciensKotes } from './paciensKotes';
import { orvosProblema as szamitOrvosProblema } from './orvosok';
import { elolegTullepi, tervVegosszeg } from './totals';
import type { Paciens, Plan, PriceList } from './types';

export type CsekklistaSulyossag = 'hard' | 'soft' | 'info';
export type CsekklistaRoute =
  | '/paciens'
  | '/terv'
  | '/arlista'
  | '/beallitasok'
  | '/beallitasok?tab=nyomtatvanyok&nyelv=hu'
  | '/beallitasok?tab=nyomtatvanyok&nyelv=de';

export interface CsekklistaReszlet {
  cim: string;
  nevek: string[];
}

export interface CsekklistaTetel {
  id: string;
  sulyossag: CsekklistaSulyossag;
  cim: string;
  reszletek?: CsekklistaReszlet[];
  szamlalo?: number;
  route?: CsekklistaRoute;
}

export interface VeglegesitesCsekklista {
  tetelek: CsekklistaTetel[];
}

/** Igaz, ha a listában van legalább egy `hard` tétel -- a Véglegesítés gomb ekkor letiltott. */
export function vanKemenyBlokk(csekklista: VeglegesitesCsekklista): boolean {
  return csekklista.tetelek.some((t) => t.sulyossag === 'hard');
}

/** A sablon-tételek route-ja a HÍVÓ terv nyelvén nyitja a Nyomtatványok fület --
 * lásd `NyomtatvanyokTab.tsx` `templateLang` kezdőértékét. */
function nyomtatvanyokRoute(nyelv: Plan['nyelv']): CsekklistaRoute {
  return nyelv === 'de' ? '/beallitasok?tab=nyomtatvanyok&nyelv=de' : '/beallitasok?tab=nyomtatvanyok&nyelv=hu';
}

const NYELVI_REVIEW_MEZO_CIMKE: Record<ReviewMezo, string> = {
  fazisNev: 'Fázis neve',
  fazisMegjegyzes: 'Fázis megjegyzése',
  sorNev: 'Sor neve',
  sorLeiras: 'Sor leírása',
};

function nyelviReviewReszletek(tetelek: NyelviMismatchTetel[]): CsekklistaReszlet[] {
  if (tetelek.length === 0) return [];
  return [
    {
      cim: 'Ellenőrzésre vár',
      nevek: tetelek.map((m) => `${NYELVI_REVIEW_MEZO_CIMKE[m.cel.mezo]}: ${m.cimke}`),
    },
  ];
}

/**
 * A véglegesítés-őr összes bemenete egy helyen, tiszta függvényként.
 * `leirasokMutatasa` a hívó felelőssége (`plan.leirasokMutatasa ?? true`) --
 * ez a modul nem ismeri a `Plan` mező alapértékét, csak a kikapcsolt/
 * bekapcsolt tényt. `master` ugyanígy a hívó betöltése (`null` = nincs
 * lezárt törzsadat vagy nem ismert a patientDir). `aktivOrvosNevek` a hívó
 * MÁR feloldott aktív-orvos listája (`domain/orvosok.ts` `aktivOrvosok()`).
 * `sablon` a hívó sablonbetöltésének eredménye -- ez a modul sosem tölt be
 * sablont, csak a TÉNYt kapja meg, a fenti három paraméter mintáján.
 * `nevUtkozes` (94. tétel, `domain/paciensKotes.ts`) a hívó MÁR feloldott
 * páciens-kötése/ütközése, ugyanezen a mintán -- `null`, ha nincs
 * feloldható kötés.
 * Szándékosan kötelező, nem defaultos paraméterek -- egy csendben
 * kikapcsolt hard block jogi kockázat lenne (a `ujVerzioDatum.ts` `ma`
 * paraméterének mintája).
 */
export function veglegesitesDiagnozis(
  plan: Plan,
  priceList: PriceList,
  leirasokMutatasa: boolean,
  master: Paciens | null,
  aktivOrvosNevek: string[],
  sablon: { sablonFallback: boolean; nyilatkozatPlaceholder: boolean; kihagyottSzekciok: string[] },
  nevUtkozes: PaciensKotes | null,
): VeglegesitesCsekklista {
  const tetelek: CsekklistaTetel[] = [];

  const nameMissing = !plan.paciens.nev.trim();
  if (nameMissing) {
    tetelek.push({
      id: 'nev-hianyzik',
      sulyossag: 'hard',
      cim: 'A páciens neve kötelező a véglegesítéshez.',
      route: '/paciens',
    });
  }

  // Üres vagy érvénytelen érték a `formatLongDate`-en át „Invalid Date"-ként
  // kerülne egy szerződéses dokumentumra. A Terv adatai lap a mező
  // elhagyásakor visszaállítja az alapértéket, de egy betöltött fájl vagy egy
  // a lapot megkerülő patch ezt kijátszhatja -- a véglegesítés-őr az utolsó
  // védvonal, ezért kemény blokk.
  if (!plan.ervenyesIg.trim() || Number.isNaN(Date.parse(plan.ervenyesIg))) {
    tetelek.push({
      id: 'ervenyes-ig-hianyzik',
      sulyossag: 'hard',
      cim: 'Az ajánlat érvényességi dátuma hiányzik vagy érvénytelen.',
      route: '/paciens',
    });
  }

  // 94. tétel: a piszkozathoz kötött páciensmappa MÁS páciens azonosító
  // adatai mellé, egy MÁSIK létező páciens nevével mentődne -- GDPR 9.
  // cikk szerinti különleges adatot érintő azonosítási kollízió egy
  // aláírásra kész dokumentumon, ezért KEMÉNY blokk, nem a lenti, ÁLTALÁNOS
  // (info-szintű) `torzsadat-elteres` tétel.
  if (nevUtkozes && nevUtkozes.utkozok.length > 0) {
    tetelek.push({
      id: 'nev-utkozes',
      sulyossag: 'hard',
      cim: 'A páciens neve egy másik, létező páciensre illik pontosan — a terv mégis a kötött páciensmappába mentődne.',
      szamlalo: nevUtkozes.utkozok.length,
      reszletek: [{ cim: 'Ütköző páciensek', nevek: nevUtkozes.utkozok.map((p) => p.nev) }],
      route: '/paciens',
    });
  }

  const orvosProblema = szamitOrvosProblema(plan.orvos, aktivOrvosNevek);
  if (orvosProblema) {
    tetelek.push({
      id: 'orvos',
      sulyossag: 'hard',
      cim:
        orvosProblema === 'hianyzik'
          ? 'A tervhez nincs kezelőorvos rendelve.'
          : `A terv kezelőorvosa (${plan.orvos}) már nem szerepel az aktív orvosok között.`,
      route: '/paciens',
    });
  }

  const uresSorok = kitoltetlenSorok(plan);
  if (uresSorok.length > 0) {
    tetelek.push({
      id: 'kitoltetlen-sor',
      sulyossag: 'hard',
      cim: `A terv ${uresSorok.length} kitöltetlen sort tartalmaz (nincs megnevezve a beavatkozás).`,
      szamlalo: uresSorok.length,
      reszletek: [
        {
          cim: 'Érintett sorok',
          nevek: uresSorok.map((s) => `${s.fazisNev} — ${s.fogak.trim() || 'nincs fogszám megadva'}`),
        },
      ],
      route: '/terv',
    });
  }

  const uresFazisokLista = uresFazisok(plan);
  if (uresFazisokLista.length > 0) {
    tetelek.push({
      id: 'ures-fazis',
      sulyossag: 'hard',
      cim: `A terv ${uresFazisokLista.length} üres (sor nélküli) fázist tartalmaz.`,
      szamlalo: uresFazisokLista.length,
      reszletek: [{ cim: 'Érintett fázisok', nevek: uresFazisokLista.map((f) => f.fazisNev) }],
      route: '/terv',
    });
  }

  const elolegTullep =
    plan.elolegOsszeg != null &&
    elolegTullepi(tervVegosszeg(plan.fazisok, plan.kedvezmenyOsszeg), plan.elolegOsszeg);
  if (elolegTullep) {
    tetelek.push({
      id: 'eloleg-tullep',
      sulyossag: 'hard',
      cim: 'Az előleg összege nagyobb, mint a fizetendő.',
      route: '/terv',
    });
  }

  // KEMÉNY blokk (62. tétel): egy beárazatlan tétel 0 Ft-tal nem
  // kerülhet aláírandó dokumentumra -- a doki vagy kézi ajánlati árat ad,
  // vagy törli/másik pénznemre vált.
  const araztalanSorokLista = araztalanSorok(plan, priceList);
  if (araztalanSorokLista.length > 0) {
    tetelek.push({
      id: 'araztalan-sor',
      sulyossag: 'hard',
      cim: `A terv ${araztalanSorokLista.length} olyan sort tartalmaz, aminek a tétele nincs beárazva a terv pénznemében (${plan.penznem}).`,
      szamlalo: araztalanSorokLista.length,
      reszletek: [{ cim: 'Érintett sorok', nevek: araztalanSorokLista }],
      route: '/terv',
    });
  }

  // DE terven minden látható sornak igazoltan német neve legyen -- árlistai
  // nev.de-t követő, VAGY a doki explicit „Nyelv ellenőrizve" akciójával
  // németnek igazolt kézi szöveg. A szerkesztő HU-visszaesése csak
  // munkaállapot: aláírandó német dokumentumon magyar tételnév nem
  // elfogadható.
  const { nincsArlistaiNev, ellenorizetlenKeziNev } = igazolatlanNemetNevek(plan, priceList);
  if (nincsArlistaiNev.length + ellenorizetlenKeziNev.length > 0) {
    const reszletek: CsekklistaReszlet[] = [];
    if (nincsArlistaiNev.length > 0) {
      reszletek.push({ cim: 'Nincs német nevük az árlistában', nevek: nincsArlistaiNev });
    }
    if (ellenorizetlenKeziNev.length > 0) {
      reszletek.push({ cim: 'Kézzel írt/átírt, nyelvileg nem ellenőrzött', nevek: ellenorizetlenKeziNev });
    }
    tetelek.push({
      id: 'nemet-nev',
      sulyossag: 'hard',
      cim: 'Ez egy német nyelvű ajánlat, de néhány sor neve nem igazoltan németül kerül a nyomtatványra.',
      szamlalo: nincsArlistaiNev.length + ellenorizetlenKeziNev.length,
      reszletek,
      route: '/terv',
    });
  }

  // A fogtérkép-legendán ténylegesen megjelenő kategóriának is legyen német
  // neve -- egy lefordítatlan legenda-felirat ugyanúgy nem elfogadható egy
  // aláírandó német dokumentumon, mint egy tételnév.
  const nemetKategoriak = igazolatlanNemetKategoriak(plan, priceList);
  if (nemetKategoriak.length > 0) {
    tetelek.push({
      id: 'nemet-kategoria-nev',
      sulyossag: 'hard',
      cim: `A fogtérkép jelmagyarázatán ${nemetKategoriak.length} olyan kategória szerepel, aminek nincs német neve.`,
      szamlalo: nemetKategoriak.length,
      reszletek: [{ cim: 'Érintett kategóriák', nevek: nemetKategoriak }],
      route: '/arlista',
    });
  }

  // A puha csoport ELEJÉN a két tétel, ami a NYOMTATVÁNY TARTALMÁT érinti --
  // a doki aláírt PDF-je más szöveget kap emiatt, szemben a lenti hét
  // tisztán adatminőségi/adminisztratív tétellel. `sablon-kihagyott-szekcio`
  // előzi meg `sablon-fallback`-ot: a teljesen hiányzó tartalom súlyosabb,
  // mint a rossz nyelvű, de meglévő tartalom.
  if (sablon.kihagyottSzekciok.length > 0) {
    tetelek.push({
      id: 'sablon-kihagyott-szekcio',
      sulyossag: 'soft',
      cim: 'A szakasz szövege hiányzik, vagy még jogi lektorálásra vár — a címével együtt kimarad a nyomtatványból.',
      szamlalo: sablon.kihagyottSzekciok.length,
      reszletek: [{ cim: 'Kimaradó szakaszok', nevek: sablon.kihagyottSzekciok }],
      route: nyomtatvanyokRoute(plan.nyelv),
    });
  }

  if (sablon.sablonFallback) {
    tetelek.push({
      id: 'sablon-fallback',
      sulyossag: 'soft',
      cim:
        'A tervhez tartozó sablon nem érhető el a megfelelő nyelven (hiányzik, vagy még jogi ' +
        'lektorálásra vár) — helyette a magyar szöveg jelenik meg a nyomtatványon.',
      route: nyomtatvanyokRoute(plan.nyelv),
    });
  }

  const otherFieldsMissing =
    !plan.paciens.szuletesiIdo ||
    !plan.paciens.lakcim ||
    !plan.paciens.telefon ||
    !plan.paciens.email ||
    !plan.paciens.taj;
  if (otherFieldsMissing) {
    tetelek.push({
      id: 'hianyzo-paciensadat',
      sulyossag: 'soft',
      cim: 'Néhány páciensadat hiányzik (nem kötelező, de a nyomtatványon üresen marad).',
      route: '/paciens',
    });
  }

  // 65. tétel -- a doki SAJÁT, szabadon gépelt szövegeinek nyelve,
  // SZÁNDÉKOSAN külön a fenti `nemet-nev` tételtől (az az ÁRLISTAI
  // fordítás/igazolás hiányát jelzi).
  const nyelviMismatchekLista = nyelviMismatchek(plan);
  if (nyelviMismatchekLista.length > 0) {
    tetelek.push({
      id: 'nyelvi-review',
      sulyossag: 'soft',
      cim: `${nyelviMismatchekLista.length} kézzel írt szöveg nem biztos, hogy a dokumentum nyelvén helyes.`,
      szamlalo: nyelviMismatchekLista.length,
      reszletek: nyelviReviewReszletek(nyelviMismatchekLista),
      route: '/terv',
    });
  }

  // A soron hiányzó tartalom egy blokkban: fogszám -> 0 összeg -> leírás.
  const fogszamNelkul = fogszamNelkuliSorok(plan, priceList);
  if (fogszamNelkul.length > 0) {
    tetelek.push({
      id: 'hianyzo-fogszam',
      sulyossag: 'soft',
      cim: `${fogszamNelkul.length} soron nincs fogszám.`,
      szamlalo: fogszamNelkul.length,
      reszletek: [{ cim: 'Érintett sorok', nevek: fogszamNelkul }],
      route: '/terv',
    });
  }

  // PUHA figyelmeztetés (backlog-19) -- névvel ellátott, de 0 összegű sorok.
  const nullaSorok = nullaOsszeguSorok(plan);
  if (nullaSorok.length > 0) {
    const nullaOsszeg = formatMoney(0, plan.penznem, plan.nyelv);
    const toldalek = plan.penznem === 'EUR' ? '-s' : '-os';
    tetelek.push({
      id: 'nulla-osszegu-sor',
      sulyossag: 'soft',
      cim: `A terv ${nullaSorok.length} ${nullaOsszeg}${toldalek} tételt tartalmaz.`,
      szamlalo: nullaSorok.length,
      reszletek: [{ cim: 'Érintett sorok', nevek: nullaSorok }],
      route: '/terv',
    });
  }

  // PUHA diagnosztika -- csak akkor releváns, ha a leírások ténylegesen
  // nyomtatódnak.
  const hianyzoLeirasok = leirasokMutatasa ? hianyzoCsomagLeirasok(plan, priceList) : [];
  if (hianyzoLeirasok.length > 0) {
    tetelek.push({
      id: 'hianyzo-leiras',
      sulyossag: 'soft',
      cim: `${hianyzoLeirasok.length} csomagtételre hivatkozó soron nincs leírás.`,
      szamlalo: hianyzoLeirasok.length,
      reszletek: [{ cim: 'Nincs leírás', nevek: hianyzoLeirasok.map((h) => h.nev) }],
      route: '/terv',
    });
  }

  // PUHA figyelmeztetés (backlog-61) -- az árlista-eltérés
  // (kedvezmény/felár vagy elavult pillanatkép) legitim állapot is lehet.
  const arElteresek = arElteroSorok(plan, priceList);
  if (arElteresek.elavult.length + arElteresek.keziAr.length > 0) {
    const reszletek: CsekklistaReszlet[] = [];
    if (arElteresek.elavult.length > 0) {
      reszletek.push({ cim: 'Elavult árlistai pillanatkép', nevek: arElteresek.elavult });
    }
    if (arElteresek.keziAr.length > 0) {
      reszletek.push({ cim: 'Kézzel felülírt ajánlati ár', nevek: arElteresek.keziAr });
    }
    tetelek.push({
      id: 'ar-elteres',
      sulyossag: 'soft',
      cim: 'Néhány sor ára eltér a mai árlistától.',
      szamlalo: arElteresek.elavult.length + arElteresek.keziAr.length,
      reszletek,
      route: '/terv',
    });
  }

  // PUHA figyelmeztetés -- a sor `nevSnapshot`-ja/ára a pillanatkép-elv
  // szerint változatlan marad, ez csak jelzi, hogy a hivatkozott tétel
  // időközben inaktívvá vált.
  const inaktivHivatkozasok = inaktivTetelreHivatkozoSorok(plan, priceList);
  if (inaktivHivatkozasok.length > 0) {
    tetelek.push({
      id: 'inaktiv-tetel-hivatkozas',
      sulyossag: 'soft',
      cim: `A terv ${inaktivHivatkozasok.length} sora egy időközben inaktivált tételre hivatkozik.`,
      szamlalo: inaktivHivatkozasok.length,
      reszletek: [{ cim: 'Érintett sorok', nevek: inaktivHivatkozasok }],
      route: '/terv',
    });
  }

  // PUHA figyelmeztetés -- a fentitől KÜLÖN tétel, csak a másoláskor is már
  // inaktivált tételre hivatkozó sorokra (`Sor.orokoltInaktivTetel`,
  // domain/orokoltJelzesek.ts): ez a szöveg hangsúlyosabban fogalmaz, mert a
  // doki a másolás pillanatában is láthatta volna a problémát. A fenti,
  // általános tétel erre a sorra TOVÁBBRA IS megjelenik -- a kettő
  // egymás mellett él, egyik sem blokkol.
  const orokoltInaktivHivatkozasok = orokoltInaktivSorok(plan);
  if (orokoltInaktivHivatkozasok.length > 0) {
    tetelek.push({
      id: 'inaktiv-tetel-orokolt',
      sulyossag: 'soft',
      cim: `A terv ${orokoltInaktivHivatkozasok.length} sora már a másoláskor is egy inaktivált tételre hivatkozott.`,
      szamlalo: orokoltInaktivHivatkozasok.length,
      reszletek: [{ cim: 'Érintett sorok', nevek: orokoltInaktivHivatkozasok }],
      route: '/terv',
    });
  }

  if (sablon.nyilatkozatPlaceholder) {
    tetelek.push({
      id: 'nyilatkozat-placeholder',
      sulyossag: 'info',
      cim:
        'A nyilatkozat szövege ezen a nyelven hiányzik, vagy még jogi lektorálásra vár — a ' +
        'nyilatkozat és aláírás oldal emiatt nem kerülhet a nyomtatványra, a „Csak ajánlat” mód ' +
        'kényszerítve van.',
      route: nyomtatvanyokRoute(plan.nyelv),
    });
  }

  // backlog-40: a páciens törzsadata INFO-szintű, nem blokkoló jelzés -- a
  // törzsadat és a terv `paciens` pillanatképe között nincs automatikus
  // szinkron egyik irányban sem, az átvétel mindig explicit doki-akció, a
  // véglegesítés nem kényszeríti ki.
  const masterElteresek = master ? masterSnapshotDiff(master, plan.paciens) : [];
  if (masterElteresek.length > 0) {
    tetelek.push({
      id: 'torzsadat-elteres',
      sulyossag: 'info',
      cim: `A páciens törzsadata ${masterElteresek.length} mezőben eltér a terv adataitól (${masterElteresek.map((m) => m.cimke).join(', ')}).`,
      szamlalo: masterElteresek.length,
      route: '/paciens',
    });
  }

  // INFO tétel -- tisztán tájékoztató, KÜLÖN a fenti (bármely tervre igaz)
  // `ar-elteres` puha tételtől: az ott csak "eltér a mai árlistától"
  // fogalmat fedi, itt kifejezetten a MÁSOLATBÓL örökölt eredet a téma,
  // amit csak a `Sor.orokoltKeziAr` marker tud eldönteni.
  const orokoltKeziArak = orokoltKeziAruSorok(plan);
  if (orokoltKeziArak.length > 0) {
    tetelek.push({
      id: 'orokolt-kezi-ar',
      sulyossag: 'info',
      cim: `${orokoltKeziArak.length} soron a másolt tervből örökölt, kézzel felülírt ajánlati ár van.`,
      szamlalo: orokoltKeziArak.length,
      reszletek: [{ cim: 'Örökölt ajánlati ár', nevek: orokoltKeziArak }],
      route: '/terv',
    });
  }

  const orokoltMegjegyzesek = orokoltMegjegyzesuFazisok(plan);
  if (orokoltMegjegyzesek.length > 0) {
    tetelek.push({
      id: 'orokolt-fazismegjegyzes',
      sulyossag: 'info',
      cim: `${orokoltMegjegyzesek.length} fázis megjegyzése a másolt tervből öröklődött.`,
      szamlalo: orokoltMegjegyzesek.length,
      reszletek: [{ cim: 'Érintett fázisok', nevek: orokoltMegjegyzesek }],
      route: '/terv',
    });
  }

  return { tetelek };
}
