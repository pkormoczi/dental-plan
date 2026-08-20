// Véglegesítés-őr -- a PreviewPage.tsx tartalmi validációjának tiszta,
// React-mentes magja (docs/03-funkcionalis-spec.md § 4. Előnézet és
// véglegesítés). Egységes, navigálható `hard`/`soft`/`info` tétel-lista
// modellt ad (D73) -- a korábbi, szekvenciális megerősítő-lánc
// (`VEGLEGESITES_LEPESEK`/`kovetkezoLepes`) megszűnt: a puha tételek NEM
// blokkolnak és nem kérnek "Folytatás"-t, a sorrend a checklist RENDER-
// sorrendje, nem egy bejárt állapotgép. A meglévő domain-függvényeket
// hívja, egyiket sem írja újra -- lásd `domain/kitoltetlen.ts`,
// `domain/nemetNev.ts`, `domain/nev.ts`.
//
// A `PreviewPage.tsx`-ben marad: a React state, a checklist RENDERelése,
// a `doFinalize()`, és az `isPlaceholderTemplate()`-re épülő D23-zár (a
// nyilatkozat+aláírás oldal letiltása) -- ez utóbbi nem ehhez a listához,
// hanem a 4. oldal renderjéhez tartozik (a `nyilatkozat-placeholder` tétel
// itt csak a TÉNYT jelzi, a kényszerített offer-only mód a hívó dolga).

import { araztalanSorok, hianyzoCsomagLeirasok, kitoltetlenSorok, nullaOsszeguSorok, uresFazisok } from './kitoltetlen';
import { arElteroSorok } from './arKoveti';
import { masterSnapshotDiff } from './masterSnapshotDiff';
import { formatMoney } from './money';
import { igazolatlanNemetKategoriak, igazolatlanNemetNevek } from './nemetNev';
import { nyelviMismatchek, type NyelviMismatchTetel, type ReviewMezo } from './nyelviReview';
import { orvosProblema as szamitOrvosProblema } from './orvosok';
import { elolegTullepi, tervVegosszeg } from './totals';
import type { Paciens, Plan, PriceList } from './types';

export type CsekklistaSulyossag = 'hard' | 'soft' | 'info';
export type CsekklistaRoute = '/paciens' | '/terv' | '/arlista' | '/beallitasok';

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
  sablon: { sablonFallback: boolean; nyilatkozatPlaceholder: boolean },
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

  // KEMÉNY blokk (62. tétel, D71): egy beárazatlan tétel 0 Ft-tal nem
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

  // D74/D133: minden látható sornak legyen igazolt német neve -- árlistai
  // nev.de-t követő VAGY D72 szerint igazoltan németül írt kézi szöveg.
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

  // D74/D404: a fogtérkép-legendán ténylegesen megjelenő kategóriának
  // legyen német neve.
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

  // 65. tétel (D72) -- a doki SAJÁT, szabadon gépelt szövegeinek nyelve,
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

  // PUHA figyelmeztetés (backlog-61, D70) -- utolsó tartalmi tétel: az
  // árlista-eltérés (kedvezmény/felár vagy elavult pillanatkép) legitim
  // állapot is lehet.
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

  if (sablon.sablonFallback) {
    tetelek.push({
      id: 'sablon-fallback',
      sulyossag: 'soft',
      cim:
        'A tervhez tartozó sablon nem érhető el a megfelelő nyelven (hiányzik, vagy még jogi ' +
        'lektorálásra vár) — helyette a magyar szöveg jelenik meg a nyomtatványon.',
      route: '/beallitasok',
    });
  }

  if (sablon.nyilatkozatPlaceholder) {
    tetelek.push({
      id: 'nyilatkozat-placeholder',
      sulyossag: 'info',
      cim:
        'A nyilatkozat szövege ezen a nyelven még jogi lektorálásra vár — a nyilatkozat és ' +
        'aláírás oldal emiatt nem kerülhet a nyomtatványra, a „Csak ajánlat” mód kényszerítve van.',
      route: '/beallitasok',
    });
  }

  // backlog-40 (D162/D163): a páciens törzsadata INFO-szintű, nem blokkoló
  // jelzés -- a véglegesítés önmagában nem kényszerít szinkronizálást (D9/D33).
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

  return { tetelek };
}
