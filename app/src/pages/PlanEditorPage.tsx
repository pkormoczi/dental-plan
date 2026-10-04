// Kezelési terv szerkesztő -- a legfontosabb képernyő, portolva
// ui/PlanEditor.jsx-ből. A billentyűzetes ciklus a lényeg, ez veri meg az
// Excelt: gépel -> nyíl -> Enter -> a kereső kiürül és visszakapja a
// fókuszt -> gépel tovább, egérhasználat nélkül. Lásd CLAUDE.md
// "A UX kritikus pontja".

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  Box,
  Button,
  Callout,
  Checkbox,
  Flex,
  Separator,
  Text,
  VisuallyHidden,
} from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { useNyelviReview } from '../components/NyelviReviewContext';
import ToothChartPanel from '../components/ToothChartPanel';
import { arFrissites, arFrissitesPatch, type ArFrissites } from '../domain/arKoveti';
import { generaltFazisNev } from '../domain/blankPlan';
import { formatLongDate } from '../domain/date';
import {
  fazisCsukvaMozgatasUtan,
  fazisCsukvaTorlesUtan,
  fazisokFelcserelve,
  sorAthelyezve,
  type SorHely,
} from '../domain/fazisSorrend';
import { kovetettMennyiseg, sorPatchKovetessel } from '../domain/mennyiseg';
import { formatMoney } from '../domain/money';
import { reviewElfogadva, reviewIrasUtan, sorPatchNyelvvel } from '../domain/nyelviReview';
import { sorPatchOroklessel } from '../domain/orokoltJelzesek';
import { sorMezokEgyedibol, sorMezokTetelbol } from '../domain/sorMezok';
import { buildToothVisualStates } from '../domain/toothVisual';
import { elteresBontas, fazisOsszeg, sorokOsszeg, tervVegosszeg } from '../domain/totals';
import type { Plan, Sor, Tetel } from '../domain/types';
import { useAppState } from '../state/AppState';
import { fogantyuId, type FokuszCel } from './planEditor/elemIdk';
import type { SorDraftErtekek } from './planEditor/LineRow';
import EgyediVegosszegBlokk from './planEditor/EgyediVegosszegBlokk';
import ElolegBlokk from './planEditor/ElolegBlokk';
import PhaseSection from './planEditor/PhaseSection';
import PlanEditorHeader from './planEditor/PlanEditorHeader';
import Summary from './planEditor/Summary';
import { useFokuszEffekt } from './planEditor/useFokuszEffekt';

export default function PlanEditorPage() {
  const {
    plan,
    setPlan,
    priceList,
    loadedOsszesitokDiff,
    frissitettDatum,
    orvosFallback,
    piszkozatHiba,
    piszkozatMentve,
    piszkozatKonfliktus,
    piszkozatPatientDir,
    resetPlanDraft,
    // A CSUKOTT fázisok indexei -- se PhaseSection-, se lap-lokális state,
    // mert az Előnézetre lépés unmountolja ezt a lapot (lásd az AppState
    // doc-kommentjét). A `fazisResetToken` bumpot is túl kell élnie.
    fazisCsukva,
    setFazisCsukva,
  } = useAppState();
  const navigate = useNavigate();
  const currency = plan.penznem;
  const nyelv = plan.nyelv;
  // A teljes piszkozat eldobása (nem sor-/fázisszintű) -- lásd a fázistörlés
  // AlertDialog-ját lent: két külön Root, mert egyszerre csak az egyik
  // vonatkozó `open`-állapot kell.
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // A megerősítés Escape-es bezárása után ide kell visszaesnie a fókusznak,
  // ne a <body>-ra -- lásd a `components/DiscardChangesDialog.tsx`
  // `visszaFokuszRef` kommentjét: kontrollált (trigger nélküli) AlertDialog-
  // nál a Radix beépített visszafókuszálása nem fut le.
  const discardVisszaFokuszRef = useRef<HTMLElement | null>(null);
  // P1-7: index-kulcs helyett -- fázistörléskor a maradék PhaseSection-ok
  // pozíciója (pi) eltolódik, és egy sima `key={pi}` React-remount nélkül
  // ugyanazt a DOM-csomópontot (és benne az ItemPicker lokális kereső-
  // állapotát: a gépelt szöveget) tartaná meg egy MÁSIK fázison. A token
  // növelése törléskor mindent remountol, a keresőmező sosem "vándorol" át.
  const [fazisResetToken, setFazisResetToken] = useState(0);
  // Csak a sorral rendelkező fázis törlése kérdez vissza (lásd lent,
  // AlertDialog) -- egy üres fázis újralétrehozása két kattintás, egy
  // 8 sorosé nem.
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);
  // Ár-frissítés megerősítő előnézete (backlog-61) -- a "Hatás a
  // tervre" számításhoz a teljes `plan`-re van szükség, ezért a state itt,
  // a szülőben él, nem a LineRow-ban (a fázistörlés `pendingDeleteIndex`
  // mintája).
  const [pendingArFrissites, setPendingArFrissites] = useState<{ pi: number; li: number } | null>(
    null,
  );
  // Az éppen szerkesztett sor még nem committált ár/darabszáma -- a Fázis
  // összesen és a Mindösszesen ebből számol élőben (lásd `eloFazisok` lent).
  // A `pendingArFrissites`-hez hasonlóan a szülőben él: a fázison ÁTNYÚLÓ
  // Mindösszesen egyik `PhaseSection` state-jéből sem látszana.
  const [sorDraft, setSorDraft] = useState<
    ({ pi: number; li: number } & SorDraftErtekek) | null
  >(null);
  // Hova kell fókuszálni/görgetni renderelés UTÁN -- a `useFokuszEffekt`
  // hook dolgozza fel (lásd `pages/planEditor/useFokuszEffekt.ts`), mert a
  // célelem DOM-ja (most felvett sor, most hozzáadott fázis) csak a
  // következő renderben létezik. A `fazisKereso` ág (backlog-59) a
  // fázis alatti keresőnek szól, ezért nincs `li`-je. A `nev`/`fazisNev`
  // (65. tétel, guided review) mindig a DOM-ban van, amíg a sornak/
  // fázisnak van neve -- szinkron fókuszálható, a `leiras`/`fazisMegjegyzes`
  // viszont összecsukható sávban él, lásd `useFokuszEffekt`.
  const [fokuszCel, setFokuszCel] = useState<FokuszCel>(null);
  // Ismételt kattintás ugyanarra a (már kezelt) fogra a következő érintett
  // sorra lép, körbeérve -- ref, mert a körbejárás nem igényel újrarenderelést
  // önmagában, csak a fókuszváltás (lásd fokuszCel).
  const ciklusRef = useRef<{ fdi: string; index: number } | null>(null);

  useFokuszEffekt(fokuszCel, setFokuszCel);

  // Sor-áthelyezés. Egérrel: a húzott sor és az ejtés várható helye (a cél-
  // fázisban a kivétel ELŐTTI beszúrási index, 0..sorok.length) -- a szülőben,
  // mert a húzás fázisokon ível át. Billentyűvel: a fogantyún felvett sor
  // eredeti és aktuális helye; minden nyíl azonnal áthelyez, Escape az
  // eredetire tesz vissza.
  const [huzott, setHuzott] = useState<SorHely | null>(null);
  const [ejtesCel, setEjtesCel] = useState<{ pi: number; index: number } | null>(null);
  const [felvett, setFelvett] = useState<{ eredeti: SorHely; aktualis: SorHely } | null>(null);
  const [athelyezesBejelentes, setAthelyezesBejelentes] = useState('');

  // A felvétel véget ér, ha a fókusz a felvett sor fogantyújáról máshová kerül
  // (Tab, kattintás) -- a sor ott marad, ahová addig került. Az áthelyezés
  // remountja alatt a fókusz a body-n áll, az nem `focusin`.
  useEffect(() => {
    if (!felvett) return;
    const id = fogantyuId(felvett.aktualis.pi, felvett.aktualis.li);
    function onFocusIn(e: FocusEvent) {
      if ((e.target as HTMLElement | null)?.id !== id) setFelvett(null);
    }
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, [felvett]);

  const nyelviReview = useNyelviReview();

  // 65. tétel, 5. döntés: a guided review célja (`ReviewCel`) a
  // VALÓDI szerkesztőmezőkhöz navigál -- a fázis kinyitása + a
  // `fokuszCel` beállítása a MEGLÉVŐ mechanizmust hajtja meg, nem egy
  // duplikált útvonalat.
  useEffect(() => {
    const cel = nyelviReview.cel;
    if (!cel) return;
    setFazisCsukva((prev) => {
      if (!prev.has(cel.fazisIndex)) return prev;
      const next = new Set(prev);
      next.delete(cel.fazisIndex);
      return next;
    });
    if (cel.mezo === 'fazisNev') setFokuszCel({ mit: 'fazisNev', pi: cel.fazisIndex });
    else if (cel.mezo === 'fazisMegjegyzes') setFokuszCel({ mit: 'fazisMegjegyzes', pi: cel.fazisIndex });
    else if (cel.mezo === 'sorNev') setFokuszCel({ mit: 'nev', pi: cel.fazisIndex, li: cel.sorIndex ?? 0 });
    else setFokuszCel({ mit: 'leiras', pi: cel.fazisIndex, li: cel.sorIndex ?? 0 });
  }, [nyelviReview.cel]);

  // 62. tétel C5: egy `currency`-ben nem beárazott tétel is
  // kereshető/felvehető marad -- a kereső ma nem szűr pénznemre, csak
  // aktivitásra (lásd `sorMezokTetelbol()`). A gyorsgombok (`frequent`)
  // SZÁNDÉKOSAN a beárazott részhalmazra szorítkoznak: egy kattintásra
  // 0 Ft-os sort felvenni rosszabb, mint elrejteni a chipet.
  const available = useMemo(() => priceList.tetelek.filter((x) => x.aktiv), [priceList]);
  const frequent = useMemo(
    () => available.filter((x) => x.gyakori && x.ar[currency]),
    [available, currency],
  );

  // A `sorFallback` (HU/„átírt" jelvény) soronként a tényleges árlistai
  // nevet nézi, ezért egy id -> Tetel lookupra van szüksége, nem csak egy
  // "van-e fordítás" halmazra -- lásd domain/nev.ts.
  const tetelekById = useMemo(
    () => new Map(priceList.tetelek.map((x) => [x.id, x])),
    [priceList],
  );

  function updatePlan(fn: (draft: Plan) => void) {
    setPlan((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }

  // Az új fázis keresője fókuszt kap és a lap odagördül (backlog-59)
  // -- a `plan.fazisok.length` a hívás pillanatában (a push ELŐTT) az új
  // fázis leendő indexe. `fazisResetToken` szándékosan NEM bumpol: az
  // minden fázist remountolna, elveszítve a többi kereső begépelt szövegét.
  function addPhase() {
    const ujIndex = plan.fazisok.length;
    updatePlan((draft) => {
      draft.fazisok.push({
        sorszam: draft.fazisok.length + 1,
        megnevezes: generaltFazisNev(draft.fazisok.length + 1),
        megjegyzes: '',
        sorok: [],
      });
    });
    setFokuszCel({ mit: 'fazisKereso', pi: ujIndex });
  }

  function deletePhase(pi: number) {
    updatePlan((draft) => {
      draft.fazisok.splice(pi, 1);
    });
    setFazisResetToken((n) => n + 1);
    setFazisCsukva((prev) => fazisCsukvaTorlesUtan(prev, pi));
  }

  /**
   * Fázis-sorrendezés, a PriceListAdminPage.tsx `moveCategory()`
   * mintáján, index-alapúra igazítva (a `Fazis`-nak nincs `Kategoria`-
   * szerű `id`-je). A `fazisCsukva` (összecsukott indexek) tagsága a két
   * érintett indexen felcserélődik, hogy az összecsukott/nyitott állapot
   * a fázist kövesse, ne a pozíciót.
   */
  function movePhase(pi: number, irany: -1 | 1) {
    const cel = pi + irany;
    if (cel < 0 || cel >= plan.fazisok.length) return;
    updatePlan((draft) => {
      draft.fazisok = fazisokFelcserelve(draft.fazisok, pi, cel);
    });
    setFazisResetToken((n) => n + 1);
    setFazisCsukva((prev) => fazisCsukvaMozgatasUtan(prev, pi, cel));
  }

  /**
   * Egy sor áthelyezése (egér és billentyű közös útja). Minden fázis
   * remountol (`fazisResetToken`): két fázis sorindexei tolódhatnak el, és
   * index-kulcs mellett a `LineRow` lokális állapota (keresőmód, leírás-sáv,
   * gépelt ár) MÁSIK sorra vándorolna. Ugyanezért az index-kulcsos szülő-
   * állapot (élő draft, ár-frissítés megerősítő, fogkattintás-ciklus) elesik;
   * a `PhaseSection` Undo-sávja a remounttal megy. A fókusz a mozgatott sor
   * fogantyújára kerül.
   */
  function athelyez(honnan: SorHely, hova: SorHely) {
    if (honnan.pi === hova.pi && honnan.li === hova.li) return;
    updatePlan((draft) => {
      draft.fazisok = sorAthelyezve(draft.fazisok, honnan, hova);
    });
    setFazisResetToken((n) => n + 1);
    setSorDraft(null);
    setPendingArFrissites(null);
    ciklusRef.current = null;
    setFokuszCel({ mit: 'fogantyu', pi: hova.pi, li: hova.li });
  }

  function huzasVege() {
    setHuzott(null);
    setEjtesCel(null);
  }

  function ejtes() {
    if (huzott && ejtesCel) {
      // Fázison belül hátrafelé a kivétel eggyel előrébb tolja a beszúrási helyet.
      const li =
        ejtesCel.pi === huzott.pi && ejtesCel.index > huzott.li ? ejtesCel.index - 1 : ejtesCel.index;
      athelyez(huzott, { pi: ejtesCel.pi, li });
    }
    huzasVege();
  }

  function helyLeiras(hely: SorHely): string {
    return `${plan.fazisok[hely.pi].megnevezes}, ${hely.li + 1}. hely`;
  }

  /**
   * A fogantyú billentyűs útja: Szóköz/Enter felvesz, ↑/↓ léptet (a fázis
   * szélén át a szomszéd fázisba), Szóköz/Enter letesz, Escape visszatesz.
   * Csukott fázisba lépve a fázis kinyílik -- különben a fogantyú, és vele
   * a fókusz, eltűnne. `true`, ha a billentyűt ez kezelte.
   */
  function fogantyuBillentyu(pi: number, li: number, key: string): boolean {
    const nev = plan.fazisok[pi].sorok[li]?.nevSnapshot.trim() || 'Sor';
    if (!felvett) {
      if (key !== ' ' && key !== 'Enter') return false;
      setFelvett({ eredeti: { pi, li }, aktualis: { pi, li } });
      setAthelyezesBejelentes(
        `${nev} felvéve, ${helyLeiras({ pi, li })}. Nyilakkal mozgasd, Enter leteszi, Escape visszavonja.`,
      );
      return true;
    }
    if (key === ' ' || key === 'Enter') {
      setFelvett(null);
      setAthelyezesBejelentes(`${nev} letéve, ${helyLeiras({ pi, li })}.`);
      return true;
    }
    if (key === 'Escape') {
      athelyez({ pi, li }, felvett.eredeti);
      setFelvett(null);
      setAthelyezesBejelentes(`Áthelyezés visszavonva, ${nev} az eredeti helyén.`);
      return true;
    }
    if (key !== 'ArrowUp' && key !== 'ArrowDown') return false;
    let hova: SorHely | null = null;
    if (key === 'ArrowDown') {
      if (li < plan.fazisok[pi].sorok.length - 1) hova = { pi, li: li + 1 };
      else if (pi < plan.fazisok.length - 1) hova = { pi: pi + 1, li: 0 };
    } else if (li > 0) hova = { pi, li: li - 1 };
    else if (pi > 0) hova = { pi: pi - 1, li: plan.fazisok[pi - 1].sorok.length };
    if (!hova) return true;
    const celPi = hova.pi;
    if (fazisCsukva.has(celPi)) {
      setFazisCsukva((prev) => {
        const next = new Set(prev);
        next.delete(celPi);
        return next;
      });
    }
    athelyez({ pi, li }, hova);
    setFelvett({ eredeti: felvett.eredeti, aktualis: hova });
    setAthelyezesBejelentes(`${nev}: ${helyLeiras(hova)}.`);
    return true;
  }

  // A teljes piszkozat eldobása (6. döntés) -- a `patientDir`-t a
  // `resetPlanDraft()` HÍVÁS ELŐTT kell kiolvasni, mert az nullázza a
  // piszkozat-metaadatot.
  function handleDiscardDraft() {
    const dir = piszkozatPatientDir;
    resetPlanDraft();
    setConfirmDiscard(false);
    navigate(dir ? `/paciensek/${encodeURIComponent(dir)}` : '/paciensek');
  }

  /**
   * Kíván-e fogszámot a most felvett sor. Ugyanaz a szabály, ami a
   * véglegesítés-őr puha „nincs fogszám" jelzését hajtja
   * (`domain/kitoltetlen.ts` `fogszamNelkuliSorok`): hiányzó/false
   * `fogszamNemKell` = kell fogszám, egyedi (árlistai tétel nélküli) sor is
   * kell. Két, egymástól elcsúszó definíció rosszabb lenne, mint egy.
   */
  function fogszamotKivan(item: Tetel | null): boolean {
    return !item?.fogszamNemKell;
  }

  /**
   * A `fogak` a keresőszövegből leválasztott fogszám (`domain/search.ts`
   * `fogszamBontas`), `''`, ha nem volt. A darabszám a fogak számát követi --
   * kézzel beírva is ez történne --, a sor `mennyisegKezi: false` marad.
   * Ezek a hívások a draftba KÖZVETLENÜL push-olnak, nem a `patchLine`-on át,
   * ezért a `sorPatchKovetessel` itt nem fut le magától.
   */
  function addLine(phaseIdx: number, item: Tetel, fogak = '') {
    const mezok = sorMezokTetelbol(item, currency, nyelv);
    const ujIndex = plan.fazisok[phaseIdx].sorok.length;
    updatePlan((draft) => {
      draft.fazisok[phaseIdx].sorok.push({
        ...mezok,
        fogak,
        mennyiseg: kovetettMennyiseg(fogak) ?? 1,
        mennyisegKezi: false,
      });
    });
    if (fogszamotKivan(item)) setFokuszCel({ mit: 'fogak', pi: phaseIdx, li: ujIndex });
  }

  function addEgyediLine(phaseIdx: number, nev: string, fogak = '') {
    const ujIndex = plan.fazisok[phaseIdx].sorok.length;
    updatePlan((draft) => {
      draft.fazisok[phaseIdx].sorok.push({
        ...sorMezokEgyedibol(nev, nyelv),
        fogak,
        mennyiseg: kovetettMennyiseg(fogak) ?? 1,
        mennyisegKezi: false,
      });
    });
    if (fogszamotKivan(null)) setFokuszCel({ mit: 'fogak', pi: phaseIdx, li: ujIndex });
  }

  function patchLine(pi: number, li: number, patch: Partial<Sor>) {
    updatePlan((draft) => {
      const sor = draft.fazisok[pi].sorok[li];
      Object.assign(
        sor,
        sorPatchOroklessel(sor, sorPatchNyelvvel(sor, sorPatchKovetessel(sor, patch), nyelv)),
      );
    });
  }

  // A sorok nyers összege -- az Egyedi végösszeg blokknak erre van szüksége
  // a mező kiindulási alapjához, NEM a tervVegosszeg() eredményére.
  const sorszintuOsszeg = sorokOsszeg(plan.fazisok);
  const grand = tervVegosszeg(plan.fazisok, plan.kedvezmenyOsszeg);

  // Az ÉPPEN GÉPELT sor draftjával patchelt fázis-másolat -- a lenti
  // `pendingUjFazisok` mintája: a meglévő `domain/totals.ts` függvények
  // számolnak rajta, a szignatúrájuk (és a `tervVegosszeg` „EGYETLEN hely"
  // invariánsa) érintetlen. Egyszerre csak egy mező lehet fókuszban, ezért
  // egyetlen sor override-ja elég.
  const eloFazisok = useMemo(() => {
    if (!sorDraft || plan.fazisok[sorDraft.pi]?.sorok[sorDraft.li] == null) return plan.fazisok;
    return plan.fazisok.map((f, fi) =>
      fi !== sorDraft.pi
        ? f
        : {
            ...f,
            sorok: f.sorok.map((s, si) =>
              si !== sorDraft.li
                ? s
                : {
                    ...s,
                    tenylegesEgysegar: sorDraft.tenylegesEgysegar,
                    mennyiseg: sorDraft.mennyiseg,
                  },
            ),
          },
    );
  }, [plan.fazisok, sorDraft]);
  const eloGrand = tervVegosszeg(eloFazisok, plan.kedvezmenyOsszeg);
  const eloBontas = elteresBontas(eloFazisok, plan.kedvezmenyOsszeg);
  const fogterkep = useMemo(() => buildToothVisualStates(plan, priceList), [plan, priceList]);

  // Az ár-frissítés megerősítő dialógusának "Hatás a tervre" előnézete --
  // a MEGLÉVŐ `sorokOsszeg`/`tervVegosszeg`-gel számolva egy, a célsoron
  // patchelt fázis-másolaton, nem a képletet újraimplementálva.
  const pendingSor = pendingArFrissites
    ? plan.fazisok[pendingArFrissites.pi].sorok[pendingArFrissites.li]
    : null;
  const pendingFrissites: ArFrissites | null = pendingSor
    ? arFrissites(pendingSor, currency, tetelekById)
    : null;
  const pendingUjFazisok =
    pendingArFrissites && pendingFrissites
      ? plan.fazisok.map((f, fi) =>
          fi !== pendingArFrissites.pi
            ? f
            : {
                ...f,
                sorok: f.sorok.map((s, si) =>
                  si !== pendingArFrissites.li ? s : { ...s, ...arFrissitesPatch(pendingFrissites) },
                ),
              },
        )
      : plan.fazisok;
  const kedvezmenyAktiv = plan.kedvezmenyOsszeg != null;

  // Egy VADONATÚJ (még soha nem mentett -- `tervId === ''`)
  // ÉS sor nélküli piszkozaton az első fázis keresője A LAP BETÖLTÉSEKOR
  // fókuszt kap. Szándékosan NEM `piszkozatTartalmas()`: az a páciensnévre
  // is igazat ad, tehát a normál Terv adatai -> Kezelések úton sosem sülne
  // el. A `tervId` fél zárja ki a betöltött "Új verzió"/"Másolás új
  // tervbe" esetet -- ott a fókusz elvinné a figyelmet a
  // `frissitettDatum`/`loadedOsszesitokDiff` Callout-okról egy már
  // tartalmas (bár még mentetlen) tervnél. Egy UTÓLAG hozzáadott fázis
  // keresője külön úton, az `addPhase()` `fokuszCel`-jén át kap fókuszt
  // (backlog-59) -- a két eset nem ütközik, mert ez a kifejezés csak
  // az 1. fázisra érvényesül (lásd lent, `pi === 0`).
  const ujUresPiszkozat = plan.tervId === '' && plan.fazisok.every((f) => f.sorok.length === 0);

  /**
   * A fogtérkép NAVIGÁCIÓ, nem tétel-felvitel (`PRODUCT.md § Nem cél`): kezelt
   * fogra a sorára ugrik (ismételt kattintásra a következő érintettre, körbe),
   * kezeletlen fogra némán nem történik semmi -- a fogszám a sor `Fog` mezőjén
   * és a melletti fogválasztón át kerül a tervbe. Ugyanez a viselkedés, mint a
   * Terv részletei lap térképén (`tervReszletei/FogterkepPanel.tsx`).
   */
  function onToothClick(fdi: string) {
    const cimek = fogterkep.fogak.get(fdi)?.kezelesek ?? [];
    if (cimek.length === 0) return;
    const elozo = ciklusRef.current;
    const idx = elozo && elozo.fdi === fdi ? (elozo.index + 1) % cimek.length : 0;
    ciklusRef.current = { fdi, index: idx };
    const cel = cimek[idx];
    setFokuszCel({
      pi: cel.fazisIndex,
      li: cel.sorIndex,
      mit: cel.sor.tetelId ? 'fogak' : 'kereso',
    });
  }

  return (
    // Szélesebb, mint a többi lap plafonja (900/1100/640/560) -- a Beavatkozás
    // az egyetlen szélesség nélküli, maradék oszlop; a plusz 280px oda megy,
    // hogy egy hosszú (~57 karakteres) tételnév is görgetés nélkül olvasható
    // legyen.
    <Box style={{ maxWidth: 1180, margin: '0 auto' }}>
      {/* Lap-szintű, mindig jelen lévő élő régió: a dinamikusan beszúrtat
          sok képernyőolvasó nem mondja ki (lásd `LetoltesJelzo.tsx`). */}
      <VisuallyHidden aria-live="polite">{athelyezesBejelentes}</VisuallyHidden>
      <PlanEditorHeader
        patientName={plan.paciens.nev}
        statusz={plan.statusz}
        onPreview={() => navigate('/elonezet')}
        piszkozatMentve={piszkozatMentve}
        piszkozatHiba={piszkozatHiba}
        piszkozatKonfliktus={piszkozatKonfliktus != null}
        onDiscard={() => {
          discardVisszaFokuszRef.current = document.activeElement as HTMLElement | null;
          setConfirmDiscard(true);
        }}
      />

      {/* Korábbi terv új verzióra nyitása (dátum betöltéskor bélyegezve, lásd
          app/src/domain/CLAUDE.md): semleges szín -- ez várt, nem hiba-jellegű viselkedés, az amber az alatta lévő valódi
          anomáliának (loadedOsszesitokDiff) van fenntartva. A dátum-Callout
          `formatLongDate` hívása fixen 'hu': ez UI-próza, a kezelőfelület
          a CLAUDE.md szerint végig magyar marad -- a lentebbi
          `formatMoney`-hívások ezzel szemben a terv nyelvét (`nyelv`)
          követik, mert azok a dokumentum tartalmát tükrözik (1:1 a
          generált PDF-fel, 52. tétel). */}
      {frissitettDatum && (
        <Callout.Root color="gray" mb="4">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            Az új verzió mai dátummal indul (keltezés:{' '}
            <Text weight="bold">{formatLongDate(frissitettDatum.keltezes, 'hu')}</Text>, érvényesség:{' '}
            <Text weight="bold">{formatLongDate(frissitettDatum.ervenyesIg, 'hu')}</Text>) — a korábbi
            tételek ára változatlan.
          </Callout.Text>
        </Callout.Root>
      )}

      {/* A betöltött verzió orvosa időközben inaktívvá vált -- a
          globális default orvosra esett vissza. Ugyanaz a semleges szín,
          mint a fenti dátum-sávnál, ugyanazon indoklással -- nem hiba, a
          Terv adatai lapon egy kattintással javítható. */}
      {orvosFallback && (
        <Callout.Root color="gray" mb="4">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            A korábbi verzió kezelőorvosa (<Text weight="bold">{orvosFallback.regi}</Text>) már
            nem aktív — az új verzió a <Text weight="bold">{orvosFallback.uj}</Text> nevére
            készül. A Terv adatai lapon módosítható.
          </Callout.Text>
        </Callout.Root>
      )}

      {loadedOsszesitokDiff && (
        <Callout.Root color="amber" mb="4">
          <Callout.Text>
            A betöltött terv mentett összesítője nem egyezik az itt újraszámolt értékkel —
            mentett fizetendő:{' '}
            <Text weight="bold">{formatMoney(plan.osszesitok.fizetendo, currency, nyelv)}</Text>,
            újraszámolva:{' '}
            <Text weight="bold">{formatMoney(loadedOsszesitokDiff.fizetendo, currency, nyelv)}</Text>.
            A fájlban lévő (mentett) érték az igazság — az aláírt papírral kell egyeznie —, ezt nem
            írjuk felül automatikusan.
          </Callout.Text>
        </Callout.Root>
      )}

      {/* Itt dolgozik a doki -- ha az automatikus piszkozat-mentés elhasal
          (pl. kvótahiba), azt itt kell látnia, nem csak a Kezdőlapon. */}
      {piszkozatHiba && (
        <Callout.Root color="red" mb="4">
          <Callout.Text>A piszkozat automatikus mentése nem sikerült: {piszkozatHiba}</Callout.Text>
        </Callout.Root>
      )}

      {/* A beavatkozás lista fölött, alapból csukva -- kattintásra nyílik
          (lásd components/ToothChartPanel.tsx). Korábban az oldal alján,
          mindig nyitva állt; a doki kérésére show-hide módra váltott. */}
      <ToothChartPanel
        allapot={fogterkep}
        onToothClick={onToothClick}
        nyomtatas={plan.fogterkepMutatasa ?? true}
        onNyomtatasChange={(nyomtatas) =>
          updatePlan((draft) => {
            draft.fogterkepMutatasa = nyomtatas;
          })
        }
      />
      <Separator size="4" mb="6" mt="4" />

      {plan.fazisok.map((p, pi) => (
        <Box key={`${fazisResetToken}-${pi}`} mb="6">
          {pi > 0 && <Separator size="4" mb="6" />}
          <PhaseSection
            pi={pi}
            phase={p}
            currency={currency}
            nyelv={nyelv}
            available={available}
            kategoriak={priceList.kategoriak}
            frequent={frequent}
            tetelekById={tetelekById}
            fogterkep={fogterkep}
            fokuszCel={fokuszCel}
            canDelete={plan.fazisok.length > 1}
            total={fazisOsszeg(eloFazisok[pi])}
            autoFokusz={pi === 0 && ujUresPiszkozat}
            open={!fazisCsukva.has(pi)}
            onToggleOpen={() =>
              setFazisCsukva((prev) => {
                const next = new Set(prev);
                if (next.has(pi)) next.delete(pi);
                else next.add(pi);
                return next;
              })
            }
            canMoveUp={pi > 0}
            canMoveDown={pi < plan.fazisok.length - 1}
            onMoveUp={() => movePhase(pi, -1)}
            onMoveDown={() => movePhase(pi, 1)}
            onAdd={(item, fogak) => addLine(pi, item, fogak)}
            onAddEgyedi={(nev, fogak) => addEgyediLine(pi, nev, fogak)}
            onPatchLine={(li, patch) => patchLine(pi, li, patch)}
            onLineDraft={(li, draft) => setSorDraft(draft && { pi, li, ...draft })}
            fokuszAtadva={fogszamotKivan}
            onRequestArFrissites={(li) => setPendingArFrissites({ pi, li })}
            felvettLi={felvett?.aktualis.pi === pi ? felvett.aktualis.li : null}
            huzottLi={huzott?.pi === pi ? huzott.li : null}
            huzasFolyik={huzott != null}
            ejtesIndex={ejtesCel?.pi === pi ? ejtesCel.index : null}
            onFogantyuBillentyu={(li, key) => fogantyuBillentyu(pi, li, key)}
            onHuzasKezdet={(li) => {
              setFelvett(null);
              setHuzott({ pi, li });
            }}
            onHuzasVege={huzasVege}
            onEjtesCel={(index) =>
              setEjtesCel((prev) =>
                index == null
                  ? prev?.pi === pi
                    ? null
                    : prev
                  : prev?.pi === pi && prev.index === index
                    ? prev
                    : { pi, index },
              )
            }
            onEjtes={ejtes}
            onRemoveLine={(li) =>
              updatePlan((draft) => {
                draft.fazisok[pi].sorok.splice(li, 1);
              })
            }
            onRestoreLine={(li, sor) =>
              updatePlan((draft) => {
                draft.fazisok[pi].sorok.splice(li, 0, sor);
              })
            }
            onRename={(v) =>
              updatePlan((draft) => {
                const f = draft.fazisok[pi];
                // A doki gépelése stampel -- a `generaltFazisNev()`/
                // `movePhase()` RENDSZER-írásai (fenti :262/:299-300) nem
                // ezen az úton mennek, azok nem érintik a review-metaadatot.
                f.megnevezesNyelv = reviewIrasUtan(f.megnevezesNyelv, f.megnevezes, v, nyelv);
                f.megnevezes = v;
              })
            }
            onNevKesz={() => setFokuszCel({ mit: 'fazisKereso', pi })}
            onFogKesz={() => setFokuszCel({ mit: 'fazisKereso', pi })}
            onNote={(v) =>
              updatePlan((draft) => {
                const f = draft.fazisok[pi];
                f.megjegyzesNyelv = reviewIrasUtan(f.megjegyzesNyelv, f.megjegyzes, v, nyelv);
                f.megjegyzes = v;
                if (f.orokoltMegjegyzes) f.orokoltMegjegyzes = false;
              })
            }
            onReviewMegnevezes={() =>
              updatePlan((draft) => {
                const f = draft.fazisok[pi];
                f.megnevezesNyelv = reviewElfogadva(f.megnevezesNyelv, nyelv);
              })
            }
            onReviewMegjegyzes={() =>
              updatePlan((draft) => {
                const f = draft.fazisok[pi];
                f.megjegyzesNyelv = reviewElfogadva(f.megjegyzesNyelv, nyelv);
              })
            }
            onDelete={() => {
              if (p.sorok.length > 0) setPendingDeleteIndex(pi);
              else deletePhase(pi);
            }}
          />
        </Box>
      ))}

      <Button variant="soft" color="gray" onClick={addPhase}>
        Fázis hozzáadása
      </Button>

      <Box mt="6">
        <Separator size="4" />
        <Flex mt="4" justify="end">
          <Box style={{ flex: '0 1 320px' }}>
            <Summary
              grand={eloGrand}
              kedvezmeny={eloBontas.kedvezmeny}
              felar={eloBontas.felar}
              fazisOsszegek={
                eloFazisok.length > 1
                  ? eloFazisok.map((f) => ({ nev: f.megnevezes, osszeg: fazisOsszeg(f) }))
                  : []
              }
              currency={currency}
              nyelv={nyelv}
            />
            <EgyediVegosszegBlokk
              sorszintuOsszeg={sorszintuOsszeg}
              currency={currency}
              nyelv={nyelv}
              kedvezmenyOsszeg={plan.kedvezmenyOsszeg ?? null}
              onChange={(next) =>
                updatePlan((draft) => {
                  draft.kedvezmenyOsszeg = next;
                })
              }
            />
            <ElolegBlokk
              grand={grand}
              currency={currency}
              nyelv={nyelv}
              elolegOsszeg={plan.elolegOsszeg ?? null}
              onChange={(next) =>
                updatePlan((draft) => {
                  draft.elolegOsszeg = next;
                })
              }
            />
            <Box mt="3">
              <Text as="label" size="2" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Checkbox
                  checked={plan.leirasokMutatasa ?? true}
                  onCheckedChange={(checked) =>
                    updatePlan((draft) => {
                      draft.leirasokMutatasa = checked === true;
                    })
                  }
                />
                Tétel-leírások nyomtatása
              </Text>
            </Box>
          </Box>
        </Flex>
      </Box>

      <AlertDialog.Root
        open={pendingDeleteIndex !== null}
        onOpenChange={(open) => !open && setPendingDeleteIndex(null)}
      >
        <AlertDialog.Content maxWidth="440px">
          <AlertDialog.Title>Fázis törlése</AlertDialog.Title>
          <AlertDialog.Description size="2">
            A fázis összes sora törlődik, ez nem vonható vissza. Folytatod?
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Mégse
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                color="red"
                onClick={() => {
                  if (pendingDeleteIndex !== null) deletePhase(pendingDeleteIndex);
                  setPendingDeleteIndex(null);
                }}
              >
                {/* Szándékosan NEM „Fázis törlése" -- a canDelete gate
                    (>=2 fázis) miatt minden fázis trigger-gombja a DOM-ban
                    marad, amíg a dialógus nyitva van (ugyanaz a helyzet,
                    mint OsszesTervSection.tsx-ben). */}
                Törlés
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      <AlertDialog.Root
        open={confirmDiscard}
        onOpenChange={(open) => !open && setConfirmDiscard(false)}
      >
        <AlertDialog.Content
          maxWidth="440px"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            requestAnimationFrame(() => discardVisszaFokuszRef.current?.focus());
          }}
        >
          <AlertDialog.Title>Piszkozat eldobása</AlertDialog.Title>
          <AlertDialog.Description size="2">
            A teljes piszkozat elvész, ez nem vonható vissza. Folytatod?
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Mégse
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              {/* Szándékosan NEM „Piszkozat eldobása" -- lásd a fázistörlés
                  dialógusának kommentjét fent: a trigger-IconButton a DOM-ban
                  marad, amíg a dialógus nyitva van. */}
              <Button color="red" onClick={handleDiscardDraft}>
                Eldobás
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      <AlertDialog.Root
        open={pendingArFrissites !== null}
        onOpenChange={(open) => !open && setPendingArFrissites(null)}
      >
        <AlertDialog.Content maxWidth="440px">
          <AlertDialog.Title>Ár frissítése az árlistából</AlertDialog.Title>
          <AlertDialog.Description size="2" style={{ whiteSpace: 'pre-line' }}>
            {pendingSor &&
              pendingFrissites &&
              [
                `${pendingSor.nevSnapshot} — Listaár: ${formatMoney(pendingFrissites.regi, currency, nyelv)} → ${formatMoney(pendingFrissites.uj, currency, nyelv)}`,
                pendingSor.tenylegesEgysegar !== pendingSor.listaEgysegar
                  ? 'A kézzel megadott ajánlati ár törlődik, a sor az új listaárra áll.'
                  : '',
                `Hatás a tervre:\nKezelések összege: ${formatMoney(sorszintuOsszeg, currency, nyelv)} → ${formatMoney(sorokOsszeg(pendingUjFazisok), currency, nyelv)}` +
                  (kedvezmenyAktiv
                    ? `\nFizetendő: ${formatMoney(grand, currency, nyelv)} → ${formatMoney(tervVegosszeg(pendingUjFazisok, plan.kedvezmenyOsszeg), currency, nyelv)}`
                    : ''),
              ]
                .filter(Boolean)
                .join('\n\n')}
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Mégse
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                onClick={() => {
                  if (pendingArFrissites && pendingFrissites) {
                    patchLine(pendingArFrissites.pi, pendingArFrissites.li, arFrissitesPatch(pendingFrissites));
                  }
                  setPendingArFrissites(null);
                }}
              >
                Frissítés
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}
