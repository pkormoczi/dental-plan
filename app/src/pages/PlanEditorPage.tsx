// Kezelési terv szerkesztő -- a legfontosabb képernyő, portolva
// ui/PlanEditor.jsx-ből. A billentyűzetes ciklus a lényeg, ez veri meg az
// Excelt: gépel -> nyíl -> Enter -> a kereső kiürül és visszakapja a
// fókuszt -> gépel tovább, egérhasználat nélkül. Lásd CLAUDE.md
// "A UX kritikus pontja".

import { Fragment, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  Badge,
  Box,
  Button,
  Callout,
  Checkbox,
  Flex,
  Heading,
  IconButton,
  Separator,
  Table,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  InfoCircledIcon,
  ResetIcon,
  TrashIcon,
  UpdateIcon,
} from '@radix-ui/react-icons';
import HuChip from '../components/HuChip';
import NumberField from '../components/NumberField';
import ToothChartPanel from '../components/ToothChartPanel';
import ToothPickerPopover from '../components/ToothPickerPopover';
import { csokkentettMozgas } from '../design/motion';
import { t } from '../design/tokens';
import { arFrissites, arFrissitesPatch, type ArFrissites } from '../domain/arKoveti';
import { fazisNevGeneralt, generaltFazisNev } from '../domain/blankPlan';
import { formatLongDate, formatPiszkozatIdo } from '../domain/date';
import { leirasTulHosszu } from '../domain/leirasHossz';
import { sorPatchKovetessel } from '../domain/mennyiseg';
import { basePrice, formatMoney } from '../domain/money';
import { arlistaiLeiras, leirasKoveti, nevAtirt, resolveNev, sorFallback, type SorFallbackOk } from '../domain/nev';
import { invalidFdiTokens, parseTeeth } from '../domain/teeth';
import { buildToothVisualStates, type FogterkepAllapot } from '../domain/toothVisual';
import { elolegOsszegek, elolegTullepi, fazisOsszeg, sorokListaOsszeg, sorokOsszeg, tervVegosszeg } from '../domain/totals';
import type { Fazis, Nyelv, Penznem, Plan, Sor, Tetel } from '../domain/types';
import { useAppState } from '../state/AppState';
import ItemPicker from './planEditor/ItemPicker';

/**
 * Egy árlista-tétel felvételéhez/kitöltéséhez tartozó soradatok -- közös az
 * új sor felvitelénél (`addLine`) és egy a fogtérképről létrehozott, tétel
 * nélküli sor utólagos kitöltésénél (`LineRow` beágyazott `ItemPicker`-je),
 * hogy az árazási logika (SAVOS -> min) egy helyen éljen -- lásd
 * `domain/money.ts` `basePrice()`, CLAUDE.md "Meglévő segédfüggvények",
 * ne írd újra.
 */
function sorMezokTetelbol(
  item: Tetel,
  currency: Penznem,
  nyelv: Nyelv,
): Pick<
  Sor,
  'tetelId' | 'nevSnapshot' | 'savos' | 'listaEgysegar' | 'tenylegesEgysegar' | 'leirasSnapshot'
> | null {
  const ar = item.ar[currency];
  if (!ar) return null; // a hívó (available/ItemPicker) már kiszűrte, de a típusnak ez kell
  const base = basePrice(ar);
  return {
    tetelId: item.id,
    nevSnapshot: resolveNev(item.nev, nyelv).szoveg,
    savos: ar.tipus === 'SAVOS',
    listaEgysegar: base,
    tenylegesEgysegar: base,
    // D27 (docs/01): nincs HU-visszaesés a leírásra, hiányzó fordítás = üres.
    leirasSnapshot: arlistaiLeiras(item, nyelv),
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
function sorMezokEgyedibol(
  nev: string,
): Pick<
  Sor,
  'tetelId' | 'nevSnapshot' | 'savos' | 'listaEgysegar' | 'tenylegesEgysegar' | 'leirasSnapshot'
> {
  return {
    tetelId: '',
    nevSnapshot: nev.trim(),
    savos: false,
    listaEgysegar: 0,
    tenylegesEgysegar: 0,
    leirasSnapshot: '',
  };
}

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
    piszkozatPatientDir,
    resetPlanDraft,
  } = useAppState();
  const navigate = useNavigate();
  const currency = plan.penznem;
  const nyelv = plan.nyelv;
  // A teljes piszkozat eldobása (nem sor-/fázisszintű) -- lásd a fázistörlés
  // AlertDialog-ját lent: két külön Root, mert egyszerre csak az egyik
  // vonatkozó `open`-állapot kell.
  const [confirmDiscard, setConfirmDiscard] = useState(false);
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
  // Ár-frissítés megerősítő előnézete (backlog-61, D70) -- a "Hatás a
  // tervre" számításhoz a teljes `plan`-re van szükség, ezért a state itt,
  // a szülőben él, nem a LineRow-ban (a fázistörlés `pendingDeleteIndex`
  // mintája).
  const [pendingArFrissites, setPendingArFrissites] = useState<{ pi: number; li: number } | null>(
    null,
  );
  // Melyik fázisok vannak összecsukva (D72/73) -- a halmaz a CSUKOTT
  // indexeket tartja, alapból üres (minden fázis nyitva). A szülőben él,
  // NEM PhaseSection lokális state-je, hogy túlélje a `fazisResetToken`
  // bump-ot törléskor/mozgatáskor -- lásd deletePhase/movePhase, ahol a
  // tagság újraindexelődik/felcserélődik.
  const [fazisCsukva, setFazisCsukva] = useState<Set<number>>(() => new Set());
  // Melyik fázisba kerüljön az új sor, ha a doki kezeletlen fogra kattint a
  // fogtérképen -- csak akkor látszik a választó, ha >1 fázis van (lásd
  // lent). Renderléskor mindig `Math.min`-nel szorítva a fázisok
  // számához, hogy egy törölt fázis ne hagyjon lógó indexet.
  const [celFazisIndex, setCelFazisIndex] = useState(0);
  const celFazisIndexClamped = Math.min(celFazisIndex, plan.fazisok.length - 1);
  // Hova kell fókuszálni/görgetni renderelés UTÁN -- egy useEffect dolgozza
  // fel (lásd lent), mert a célelem DOM-ja (most felvett sor, most
  // hozzáadott fázis) csak a következő renderben létezik. A `fazisKereso`
  // ág (backlog-59, D64) a fázis alatti keresőnek szól, ezért nincs `li`-je.
  const [fokuszCel, setFokuszCel] = useState<
    | { mit: 'fogak' | 'kereso'; pi: number; li: number }
    | { mit: 'fazisKereso'; pi: number }
    | null
  >(null);
  // Ismételt kattintás ugyanarra a (már kezelt) fogra a következő érintett
  // sorra lép, körbeérve -- ref, mert a körbejárás nem igényel újrarenderelést
  // önmagában, csak a fókuszváltás (lásd fokuszCel).
  const ciklusRef = useRef<{ fdi: string; index: number } | null>(null);

  useEffect(() => {
    if (!fokuszCel) return;
    const id =
      fokuszCel.mit === 'fazisKereso'
        ? `kereso-fazis-${fokuszCel.pi}`
        : fokuszCel.mit === 'fogak'
          ? `fog-${fokuszCel.pi}-${fokuszCel.li}`
          : `kereso-${fokuszCel.pi}-${fokuszCel.li}`;
    const el = document.getElementById(id);
    el?.scrollIntoView({ block: 'nearest', behavior: csokkentettMozgas() ? 'auto' : 'smooth' });
    (el as HTMLInputElement | null)?.focus();
    setFokuszCel(null);
  }, [fokuszCel]);

  const catName = (id: string): string => {
    const kat = priceList.kategoriak.find((k) => k.id === id);
    return kat ? resolveNev(kat.nev, nyelv).szoveg : 'Egyéb';
  };

  const available = useMemo(
    () => priceList.tetelek.filter((x) => x.aktiv && x.ar[currency]),
    [priceList, currency],
  );
  const frequent = useMemo(() => available.filter((x) => x.gyakori), [available]);

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

  // Az új fázis keresője fókuszt kap és a lap odagördül (backlog-59, D64)
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
    setFazisCsukva((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < pi) next.add(idx);
        else if (idx > pi) next.add(idx - 1);
      });
      return next;
    });
  }

  /**
   * Fázis-sorrendezés (D75), a PriceListAdminPage.tsx `moveCategory()`
   * mintáján, index-alapúra igazítva (a `Fazis`-nak nincs `Kategoria`-
   * szerű `id`-je). A `fazisCsukva` (összecsukott indexek) tagsága a két
   * érintett indexen felcserélődik, hogy az összecsukott/nyitott állapot
   * a fázist kövesse, ne a pozíciót.
   */
  function movePhase(pi: number, irany: -1 | 1) {
    const cel = pi + irany;
    if (cel < 0 || cel >= plan.fazisok.length) return;
    updatePlan((draft) => {
      const f = draft.fazisok;
      // Csak a generált nevet (pl. "2. kezelés") frissítjük pozíció
      // szerint -- a kézzel átírt fázisnevet a mozgatás nem bántja.
      if (fazisNevGeneralt(f[pi].megnevezes, pi + 1)) f[pi].megnevezes = generaltFazisNev(cel + 1);
      if (fazisNevGeneralt(f[cel].megnevezes, cel + 1)) f[cel].megnevezes = generaltFazisNev(pi + 1);
      [f[pi], f[cel]] = [f[cel], f[pi]];
      f.forEach((x, i) => {
        x.sorszam = i + 1;
      });
    });
    setFazisResetToken((n) => n + 1);
    setFazisCsukva((prev) => {
      const piCsukva = prev.has(pi);
      const celCsukva = prev.has(cel);
      const next = new Set(prev);
      if (celCsukva) next.add(pi);
      else next.delete(pi);
      if (piCsukva) next.add(cel);
      else next.delete(cel);
      return next;
    });
  }

  // A teljes piszkozat eldobása (6. döntés) -- a `patientDir`-t a
  // `resetPlanDraft()` HÍVÁS ELŐTT kell kiolvasni, mert az nullázza a
  // piszkozat-metaadatot (D37).
  function handleDiscardDraft() {
    const dir = piszkozatPatientDir;
    resetPlanDraft();
    setConfirmDiscard(false);
    navigate(dir ? `/paciensek/${encodeURIComponent(dir)}` : '/paciensek');
  }

  function addLine(phaseIdx: number, item: Tetel) {
    const mezok = sorMezokTetelbol(item, currency, nyelv);
    if (!mezok) return; // available már kiszűrte, de a típusnak ez kell
    updatePlan((draft) => {
      draft.fazisok[phaseIdx].sorok.push({
        ...mezok,
        fogak: '',
        mennyiseg: 1,
        mennyisegKezi: false,
      });
    });
  }

  function addEgyediLine(phaseIdx: number, nev: string) {
    updatePlan((draft) => {
      draft.fazisok[phaseIdx].sorok.push({
        ...sorMezokEgyedibol(nev),
        fogak: '',
        mennyiseg: 1,
        mennyisegKezi: false,
      });
    });
  }

  function patchLine(pi: number, li: number, patch: Partial<Sor>) {
    updatePlan((draft) => {
      const sor = draft.fazisok[pi].sorok[li];
      Object.assign(sor, sorPatchKovetessel(sor, patch));
    });
  }

  // A sorok nyers összege -- az Egyedi végösszeg blokknak erre van szüksége
  // a mező kiindulási alapjához, NEM a tervVegosszeg() eredményére (D69).
  const sorszintuOsszeg = sorokOsszeg(plan.fazisok);
  const grand = tervVegosszeg(plan.fazisok, plan.kedvezmenyOsszeg);
  const listTotal = sorokListaOsszeg(plan.fazisok);
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

  // D59: egy VADONATÚJ (még soha nem mentett -- `tervId === ''`)
  // ÉS sor nélküli piszkozaton az első fázis keresője A LAP BETÖLTÉSEKOR
  // fókuszt kap. Szándékosan NEM `piszkozatTartalmas()`: az a páciensnévre
  // is igazat ad, tehát a normál Terv adatai -> Kezelések úton sosem sülne
  // el. A `tervId` fél zárja ki a betöltött "Új verzió"/"Másolás új
  // tervbe" esetet -- ott a fókusz elvinné a figyelmet a
  // `frissitettDatum`/`loadedOsszesitokDiff` Callout-okról egy már
  // tartalmas (bár még mentetlen) tervnél. Egy UTÓLAG hozzáadott fázis
  // keresője külön úton, az `addPhase()` `fokuszCel`-jén át kap fókuszt
  // (backlog-59, D64) -- a két eset nem ütközik, mert ez a kifejezés csak
  // az 1. fázisra érvényesül (lásd lent, `pi === 0`).
  const ujUresPiszkozat = plan.tervId === '' && plan.fazisok.every((f) => f.sorok.length === 0);

  /**
   * A fogtérkép beviteli logikája: ha a fog már érintett, ugrás a sorára
   * (ismételt kattintásra a következő érintettre, körbe); ha nem, tétel
   * nélküli új sor a kiválasztott fázisban, a fog már beírva, fókusz a
   * soron belüli keresőn.
   */
  function onToothClick(fdi: string) {
    const cimek = fogterkep.fogak.get(fdi)?.kezelesek ?? [];
    if (cimek.length === 0) {
      const pi = celFazisIndexClamped;
      const ujIndex = plan.fazisok[pi].sorok.length;
      updatePlan((draft) => {
        draft.fazisok[pi].sorok.push({
          tetelId: '',
          nevSnapshot: '',
          savos: false,
          fogak: fdi,
          mennyiseg: 1,
          listaEgysegar: 0,
          tenylegesEgysegar: 0,
          leirasSnapshot: '',
          mennyisegKezi: false,
        });
      });
      ciklusRef.current = null;
      setFokuszCel({ pi, li: ujIndex, mit: 'kereso' });
      return;
    }
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
    <Box style={{ maxWidth: 900, margin: '0 auto' }}>
      <Header
        patientName={plan.paciens.nev}
        statusz={plan.statusz}
        onPreview={() => navigate('/elonezet')}
        piszkozatMentve={piszkozatMentve}
        piszkozatHiba={piszkozatHiba}
        onDiscard={() => setConfirmDiscard(true)}
      />

      {/* docs/03-funkcionalis-spec.md § Korábbi terv új verzióra nyitása:
          semleges szín -- ez várt, nem hiba-jellegű viselkedés, az amber az alatta lévő valódi
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

      {/* D63: a betöltött verzió orvosa időközben inaktívvá vált -- a
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
          (pl. kvótahiba), azt itt kell látnia, nem csak a Kezdőlapon (lásd
          docs/03-funkcionalis-spec.md § Autosave). */}
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
        fazisok={plan.fazisok}
        celFazisIndex={celFazisIndexClamped}
        onCelFazisChange={setCelFazisIndex}
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
            catName={catName}
            frequent={frequent}
            tetelekById={tetelekById}
            fogterkep={fogterkep}
            canDelete={plan.fazisok.length > 1}
            total={fazisOsszeg(p)}
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
            onAdd={(item) => addLine(pi, item)}
            onAddEgyedi={(nev) => addEgyediLine(pi, nev)}
            onPatchLine={(li, patch) => patchLine(pi, li, patch)}
            onRequestArFrissites={(li) => setPendingArFrissites({ pi, li })}
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
                draft.fazisok[pi].megnevezes = v;
              })
            }
            onNote={(v) =>
              updatePlan((draft) => {
                draft.fazisok[pi].megjegyzes = v;
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
            <Summary grand={grand} listTotal={listTotal} currency={currency} nyelv={nyelv} />
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
        <AlertDialog.Content maxWidth="440px">
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

function Header({
  patientName,
  statusz,
  onPreview,
  piszkozatMentve,
  piszkozatHiba,
  onDiscard,
}: {
  patientName: string;
  statusz: Plan['statusz'];
  onPreview: () => void;
  piszkozatMentve: string | null;
  piszkozatHiba: string | null;
  onDiscard: () => void;
}) {
  return (
    <Flex justify="between" align="center" mb="4">
      <Box>
        <Heading size="5" style={{ color: t.brand }}>
          Kezelési terv
        </Heading>
        <Text as="div" size="2" color="gray">
          {patientName || 'Új páciens'} · {statusz === 'VEGLEGES' ? 'véglegesítve' : 'piszkozat'}
        </Text>
        {/* A meglévő piros Callout (hiba esetén) alatta marad, kikapcsolhatatlanul --
            ez csak a SIKERES mentés pozitív visszajelzése, hiba mellett nem
            látszik, hogy ne mondjon ellent egymásnak a két jelzés. */}
        {piszkozatMentve && !piszkozatHiba && (
          <Text as="div" size="1" color="gray" mt="1">
            Piszkozat mentve {formatPiszkozatIdo(piszkozatMentve)}
          </Text>
        )}
      </Box>
      <Flex gap="3" align="center">
        <IconButton
          type="button"
          aria-label="Piszkozat eldobása"
          variant="ghost"
          color="gray"
          size="2"
          onClick={onDiscard}
        >
          <TrashIcon />
        </IconButton>
        <Button onClick={onPreview}>Előnézet</Button>
      </Flex>
    </Flex>
  );
}

function PhaseSection({
  pi,
  phase,
  currency,
  nyelv,
  available,
  catName,
  frequent,
  tetelekById,
  fogterkep,
  total,
  canDelete,
  autoFokusz,
  open,
  onToggleOpen,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onAdd,
  onAddEgyedi,
  onPatchLine,
  onRequestArFrissites,
  onRemoveLine,
  onRestoreLine,
  onRename,
  onNote,
  onDelete,
}: {
  pi: number;
  phase: Fazis;
  currency: Penznem;
  nyelv: Nyelv;
  available: Tetel[];
  catName: (id: string) => string;
  frequent: Tetel[];
  tetelekById: Map<string, Tetel>;
  fogterkep: FogterkepAllapot;
  total: number;
  canDelete: boolean;
  autoFokusz: boolean;
  open: boolean;
  onToggleOpen: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAdd: (item: Tetel) => void;
  onAddEgyedi: (nev: string) => void;
  onPatchLine: (li: number, patch: Partial<Sor>) => void;
  onRequestArFrissites: (li: number) => void;
  onRemoveLine: (li: number) => void;
  onRestoreLine: (li: number, sor: Sor) => void;
  onRename: (v: string) => void;
  onNote: (v: string) => void;
  onDelete: () => void;
}) {
  // Sortörléskor a maradék sorok indexe (li) eltolódik -- index-kulcs
  // mellett egy remount nélkül ugyanaz a DOM-csomópont (és benne a
  // LineRow lokális `keresoMod` állapota vagy egy soron belüli ItemPicker
  // gépelt szövege) átvándorolna egy MÁSIK sorra. Ugyanaz a minta, mint a
  // fázistörlésnél a fazisResetToken (lásd fent).
  const [sorResetToken, setSorResetToken] = useState(0);
  // Tisztán UI-réteg felirat, nem pénzösszeg-formázás -- nem indokol közös
  // domain segédfüggvényt, lásd docs/03-funkcionalis-spec.md § Sor mezői.
  const penznemJel = currency === 'EUR' ? '€' : 'Ft';

  // Sortörlés Undo-sávja (D79): a törölt sor + eredeti indexe rövid ideig
  // helyi state-ben, NEM egy általános undo-stack -- a `LineRow` DOM-eleme
  // eltűnik a törléssel, ezért ennek itt, a szülőjében kell élnie, hogy a
  // sáv túlélje. Egy újabb sortörlés lecseréli (nem halmozza) a korábbit.
  const [pendingUndo, setPendingUndo] = useState<{ index: number; sor: Sor } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (pendingUndo) undoButtonRef.current?.focus();
  }, [pendingUndo]);

  useEffect(
    () => () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    },
    [],
  );

  function removeWithUndo(li: number, sor: Sor) {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    onRemoveLine(li);
    setSorResetToken((n) => n + 1);
    setPendingUndo({ index: li, sor });
    // Nincs docs/07-előírás a pontos időtartamra -- ennyi idő elég a sáv
    // észrevételéhez/elolvasásához, anélkül, hogy tartósan helyet foglalna.
    undoTimerRef.current = setTimeout(() => setPendingUndo(null), 8000);
  }

  function undoRemove() {
    if (!pendingUndo) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    onRestoreLine(pendingUndo.index, pendingUndo.sor);
    setSorResetToken((n) => n + 1);
    setPendingUndo(null);
  }

  return (
    <Box>
      <Flex justify="between" align="center" mb="3" gap="3">
        <Flex align="center" gap="2" flexGrow="1" style={{ minWidth: 0 }}>
          <IconButton
            type="button"
            variant="ghost"
            color="gray"
            size="1"
            aria-expanded={open}
            aria-controls={`fazis-panel-${pi}`}
            aria-label={open ? 'Fázis összecsukása' : 'Fázis kinyitása'}
            onClick={onToggleOpen}
          >
            {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </IconButton>
          <TextField.Root
            value={phase.megnevezes}
            onChange={(e) => onRename(e.target.value)}
            style={{ maxWidth: 360, fontWeight: 600, color: t.brand }}
          />
          {/* Csukott fejléc-összegzés (D72): név/darabszám/összeg -- nyitva
              a törzs ugyanezt (táblázat + lábléc) részletesen mutatja. */}
          {!open && (
            <Text size="2" color="gray" style={{ whiteSpace: 'nowrap' }}>
              {phase.sorok.length} tétel · {formatMoney(total, currency, nyelv)}
            </Text>
          )}
        </Flex>
        {/* ↑ ↓ 🗑 közvetlenül a fejlécen, három látható gomb -- lásd
            docs/07-felulet-rendszer.md névesített kivétele (a fázisfejléc
            szekciófejléc, nem lista-jellegű adatsor; az Árlista admin
            kategória-sora, PriceListAdminPage.tsx, ugyanezt teszi). */}
        <Flex gap="1" align="center">
          <IconButton
            type="button"
            aria-label="Fázis feljebb"
            variant="ghost"
            color="gray"
            size="1"
            disabled={!canMoveUp}
            onClick={onMoveUp}
          >
            <ArrowUpIcon />
          </IconButton>
          <IconButton
            type="button"
            aria-label="Fázis lejjebb"
            variant="ghost"
            color="gray"
            size="1"
            disabled={!canMoveDown}
            onClick={onMoveDown}
          >
            <ArrowDownIcon />
          </IconButton>
          {canDelete && (
            <IconButton
              type="button"
              aria-label="Fázis törlése"
              variant="ghost"
              color="gray"
              size="1"
              onClick={onDelete}
            >
              <TrashIcon />
            </IconButton>
          )}
        </Flex>
      </Flex>

      {open && (
        <Box id={`fazis-panel-${pi}`}>
          {(phase.sorok.length > 0 || pendingUndo) && (
            <Table.Root size="1" mb="3">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Beavatkozás</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="132px">Fog</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="88px" justify="center">
                    Db
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="104px" justify="end">
                    Listaár ({penznemJel})
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="148px" justify="end">
                    Ajánlati ár ({penznemJel})
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="112px" justify="end">
                    Összeg ({penznemJel})
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="32px" />
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {phase.sorok.map((l, li) => (
                  <Fragment key={`${sorResetToken}-${li}`}>
                    {pendingUndo?.index === li && (
                      <UndoRow nev={pendingUndo.sor.nevSnapshot} buttonRef={undoButtonRef} onUndo={undoRemove} />
                    )}
                    <LineRow
                      pi={pi}
                      li={li}
                      line={l}
                      currency={currency}
                      nyelv={nyelv}
                      available={available}
                      catName={catName}
                      fogterkep={fogterkep}
                      fallback={sorFallback(l, nyelv, tetelekById)}
                      tetel={tetelekById.get(l.tetelId)}
                      arFrissitesJavaslat={arFrissites(l, currency, tetelekById)}
                      onPatch={(p) => onPatchLine(li, p)}
                      onRequestArFrissites={() => onRequestArFrissites(li)}
                      onRemove={() => removeWithUndo(li, l)}
                    />
                  </Fragment>
                ))}
                {pendingUndo?.index === phase.sorok.length && (
                  <UndoRow nev={pendingUndo.sor.nevSnapshot} buttonRef={undoButtonRef} onUndo={undoRemove} />
                )}
              </Table.Body>
            </Table.Root>
          )}

          <ItemPicker
            id={`kereso-fazis-${pi}`}
            available={available}
            catName={catName}
            currency={currency}
            nyelv={nyelv}
            onPick={onAdd}
            onPickEgyedi={onAddEgyedi}
            autoFocus={autoFokusz}
          />

          {frequent.length > 0 && (
            <Flex gap="2" wrap="wrap" mt="2">
              {frequent.map((f) => (
                <Button
                  key={f.id}
                  type="button"
                  size="1"
                  variant="soft"
                  color="gray"
                  onClick={() => onAdd(f)}
                >
                  + {resolveNev(f.nev, nyelv).szoveg}
                </Button>
              ))}
            </Flex>
          )}

          <FazisMegjegyzes value={phase.megjegyzes} onChange={onNote} />

          <Flex
            justify="end"
            mt="3"
            pt="2"
            style={{ borderTop: `1px solid ${t.uiLine}` }}
          >
            <Text size="2" style={{ fontVariantNumeric: 'tabular-nums' }}>
              Fázis összesen: <Text weight="bold">{formatMoney(total, currency, nyelv)}</Text>
            </Text>
          </Flex>
        </Box>
      )}
    </Box>
  );
}

/** A sortörlés inline Undo-sávja (D79) -- lásd `PhaseSection` `removeWithUndo`/`undoRemove`. */
function UndoRow({
  nev,
  buttonRef,
  onUndo,
}: {
  nev: string;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onUndo: () => void;
}) {
  return (
    <Table.Row style={{ backgroundColor: t.accentWash }}>
      <Table.Cell colSpan={7}>
        <Flex align="center" justify="between" gap="3">
          <Text size="2" color="gray">
            Sor törölve{nev.trim() ? `: ${nev}` : ''}
          </Text>
          <Button type="button" size="1" variant="soft" color="gray" ref={buttonRef} onClick={onUndo}>
            Visszavonás
          </Button>
        </Flex>
      </Table.Cell>
    </Table.Row>
  );
}

/**
 * Fázismegjegyzés progresszív elrejtése (D95-97) -- a `LineRow` „+ leírás"
 * mintáját követi (`leirasNyitva`), alapból nyitva, ha már van tartalma.
 * A megjegyzés MINDIG nyomtatódik, függetlenül a „Tétel-leírások
 * nyomtatása" kapcsolótól -- ez a mező nem a `Tetel.leiras` snapshotja.
 */
function FazisMegjegyzes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [nyitva, setNyitva] = useState(Boolean(value.trim()));
  return (
    <Box mt="3">
      <Button
        type="button"
        size="1"
        variant="ghost"
        color="gray"
        aria-expanded={nyitva}
        onClick={() => setNyitva((v) => !v)}
      >
        {value.trim() ? 'Megjegyzés' : '+ megjegyzés'}
      </Button>
      {nyitva && (
        <TextField.Root
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Megjegyzés a fázishoz (megjelenik a nyomtatványon)"
          mt="1"
        />
      )}
    </Box>
  );
}

function LineRow({
  pi,
  li,
  line,
  currency,
  nyelv,
  available,
  catName,
  fogterkep,
  fallback,
  tetel,
  arFrissitesJavaslat,
  onPatch,
  onRequestArFrissites,
  onRemove,
}: {
  pi: number;
  li: number;
  line: Sor;
  currency: Penznem;
  nyelv: Nyelv;
  available: Tetel[];
  catName: (id: string) => string;
  fogterkep: FogterkepAllapot;
  fallback: SorFallbackOk | null;
  /** A sor mögötti árlistai tétel, ha `tetelId`-hez kötött (a `csomag`/leírás/
      név-eltérés forrása); egyedi sornál `undefined`. */
  tetel: Tetel | undefined;
  /** `null`, ha a sor követi a mai árlistát -- lásd `domain/arKoveti.ts` (backlog-61, D70). */
  arFrissitesJavaslat: ArFrissites | null;
  onPatch: (patch: Partial<Sor>) => void;
  onRequestArFrissites: () => void;
  onRemove: () => void;
}) {
  // A fogtérkép-kattintással létrehozott, még meg nem nevezett sor -- ez az
  // EGYETLEN eset, ami a keresőt mutatja induláskor (backlog-3 1-2.
  // döntés: a névmező-pontosítás és az egyedi sor felvétele ugyanaz a
  // mechanizmus, csak azonositatlan sornál indul kereső módban).
  const azonositatlan = line.tetelId.trim() === '' && line.nevSnapshot.trim() === '';
  const [keresoMod, setKeresoMod] = useState(azonositatlan);
  // CSAK kikapcsolni szabad -- ha a doki utólag kiüríti egy egyedi sor
  // névmezőjét, a cella nem ránthatja ki alóla a fókuszt egy hirtelen
  // visszaugró keresővel.
  useEffect(() => {
    if (!azonositatlan) setKeresoMod(false);
  }, [azonositatlan]);
  const egyedi = line.tetelId.trim() === '';
  const teeth = parseTeeth(line.fogak);
  // Nem blokkoló, és a szabadszöveges jegyzet (pl. „jobb felső") nem hiba --
  // docs/02-domain-modell.md "Fogszám kezelés" szerint ez érvényes tartalom.
  // Csak azt a tokent jelezzük, ami SZÁMNAK néz ki, de nem érvényes FDI kód
  // (pl. elgépelt "99") -- lásd domain/teeth.ts `invalidFdiTokens`.
  const rosszTokenek = invalidFdiTokens(line.fogak);
  const invalidFormat = rosszTokenek.length > 0;
  // A darabszám mezőbe gépelt, még nem committált érték -- a NumberField
  // csak blur/Enterre írja a törzsadatot (P1-4), de ez a figyelmeztetés
  // gépelés közben is éljen, ne csak commit után.
  const [mennyisegDraft, setMennyisegDraft] = useState(line.mennyiseg);
  useEffect(() => setMennyisegDraft(line.mennyiseg), [line.mennyiseg]);
  const mismatch = teeth.valid && teeth.teeth.length !== mennyisegDraft;
  // A visszakapcsoló ⟳ gomb (a Db cellában) akkor jelenik meg, ha a sor
  // levált a fogak-követéstől, ÉS van mihez visszakapcsolni -- lásd
  // `sorPatchKovetessel` (domain/mennyiseg.ts) 1. szabálya.
  const visszakapcsolhato = line.mennyisegKezi !== false && teeth.valid;
  // P2-4: `listaEgysegar === 0` (vagy egy jövőbeli NaN/Infinity) esetén ez a
  // képlet korábban "−Infinity%"-ot adott -- most ha az osztó nem egy
  // pozitív véges szám, nincs kedvezmény-/felár-jelvény.
  const listaarErvenyes = Number.isFinite(line.listaEgysegar) && line.listaEgysegar > 0;
  const discount =
    listaarErvenyes && line.tenylegesEgysegar < line.listaEgysegar
      ? Math.round((1 - line.tenylegesEgysegar / line.listaEgysegar) * 100)
      : 0;
  // A `Summary` terv-szintű felár-sorának soronkénti tükre (backlog-60,
  // 2. döntés) -- semleges ténymegállapítás, nem hiba.
  const surcharge =
    listaarErvenyes && line.tenylegesEgysegar > line.listaEgysegar
      ? Math.round((line.tenylegesEgysegar / line.listaEgysegar - 1) * 100)
      : 0;
  const arEltero = !egyedi && line.tenylegesEgysegar !== line.listaEgysegar;

  // backlog-60, 1. döntés: a `sorFallback`-tól FÜGGETLEN, nyelvfüggetlen
  // "kézzel átírt" komparátor -- lásd `domain/nev.ts` `nevAtirt()`.
  const nevEltero = tetel != null && nevAtirt(line, tetel, nyelv);

  // "+ leírás" összecsukható trigger (docs/02-domain-modell.md § Tétel-leírás)
  // -- ha már van tartalom, nyitva induljon; nincs "csak
  // kikapcsolni szabad" korlátozás, mert itt (a keresőmódtól eltérően)
  // nincs auto-collapse kockázat.
  const leirasTartalom = (line.leirasSnapshot ?? '').trim();
  const [leirasNyitva, setLeirasNyitva] = useState(Boolean(leirasTartalom));
  // Korai vizuális jelzés (15. döntés): a trigger maga jelez amber színnel,
  // hogy ne szaporodjon egy külön jelvény a már amúgy is sűrű jelvénysorban.
  const csomag = tetel?.csomag ?? false;
  const hianyzoCsomagLeiras = csomag && !leirasTartalom;
  // backlog-60, 4. döntés: reset/marker csak akkor értelmes, ha VAN
  // árlistai leírás -- D27 mintája, hiányzó fordításnál nincs mire
  // visszaállítani.
  const arlistaLeirasSzoveg = tetel ? arlistaiLeiras(tetel, nyelv) : '';
  const leirasEltero = tetel != null && arlistaLeirasSzoveg !== '' && !leirasKoveti(line, tetel, nyelv);

  return (
    <>
    <Table.Row>
      <Table.Cell>
        {keresoMod ? (
          <ItemPicker
            available={available}
            catName={catName}
            currency={currency}
            nyelv={nyelv}
            floating="portal"
            autoFocus
            clearOnPick={false}
            id={`kereso-${pi}-${li}`}
            onPick={(item) => {
              const mezok = sorMezokTetelbol(item, currency, nyelv);
              if (mezok) onPatch(mezok);
              setKeresoMod(false);
            }}
            onPickEgyedi={(nev) => {
              onPatch(sorMezokEgyedibol(nev));
              setKeresoMod(false);
            }}
          />
        ) : (
          <Flex align="center" gap="1" wrap="wrap">
            <Box flexGrow="1" style={{ minWidth: 160 }}>
              <TextField.Root
                value={line.nevSnapshot}
                onChange={(e) => onPatch({ nevSnapshot: e.target.value })}
                aria-label="Beavatkozás megnevezése"
                aria-invalid={!line.nevSnapshot.trim() || undefined}
                // Radix a TextField keretét box-shadow-val rajzolja, nem
                // border-rel (lásd index.css) -- `borderColor` itt nem
                // hatna semmit, a hibaállapotot ezért box-shadow-val kell
                // felülírni. Alapállapotban a globális CSS-szabály elég.
                style={
                  line.nevSnapshot.trim() ? undefined : { boxShadow: `inset 0 0 0 1px ${t.danger}` }
                }
              />
            </Box>
            {egyedi && (
              <Badge color="gray" variant="soft" size="1">
                egyedi
              </Badge>
            )}
            {fallback === 'nincsForditas' && <HuChip />}
            {nevEltero && tetel && (
              <>
                <Badge color="amber" variant="soft" size="1">
                  átírt
                </Badge>
                <IconButton
                  type="button"
                  variant="ghost"
                  color="gray"
                  size="1"
                  aria-label="Név visszaállítása az árlistaira"
                  title="Név visszaállítása az árlistaira"
                  onClick={() => onPatch({ nevSnapshot: resolveNev(tetel.nev, nyelv).szoveg })}
                >
                  <ResetIcon />
                </IconButton>
              </>
            )}
            {discount > 0 && (
              <Badge color="green" variant="soft" size="1">
                −{discount}%
              </Badge>
            )}
            {surcharge > 0 && (
              <Badge color="amber" variant="soft" size="1">
                +{surcharge}%
              </Badge>
            )}
            <Button
              type="button"
              size="1"
              variant="ghost"
              color={hianyzoCsomagLeiras ? 'amber' : 'gray'}
              aria-expanded={leirasNyitva}
              title={
                hianyzoCsomagLeiras
                  ? 'Csomagtétel — hiányzik a leírás'
                  : 'Leírás (mi van benne?)'
              }
              onClick={() => setLeirasNyitva((v) => !v)}
            >
              {leirasTartalom ? 'Leírás' : '+ leírás'}
            </Button>
          </Flex>
        )}
      </Table.Cell>

      <Table.Cell>
        <Flex align="center" gap="1">
          <Box flexGrow="1">
            <TextField.Root
              id={`fog-${pi}-${li}`}
              value={line.fogak}
              placeholder="16, 17, 26"
              onChange={(e) => onPatch({ fogak: e.target.value })}
              aria-invalid={invalidFormat || undefined}
              // lásd a soron fentebb: box-shadow, nem borderColor -- az
              // utóbbi nem hatna semmit a Radix TextField-en.
              style={{
                textAlign: 'center',
                ...(invalidFormat ? { boxShadow: `inset 0 0 0 1px ${t.danger}` } : {}),
              }}
            />
          </Box>
          <ToothPickerPopover
            fogak={line.fogak}
            allapot={fogterkep}
            onChange={(fogak) => onPatch({ fogak })}
          />
        </Flex>
        {invalidFormat && (
          <Text as="div" size="1" mt="1" style={{ color: t.danger }}>
            Nem érvényes FDI fogszám: {rosszTokenek.join(', ')} -- a kvadráns 1-4 (tejfog 5-8), a fog a
            kvadránson belül 1-8 (tejfog 1-5) lehet.
          </Text>
        )}
        {mismatch && (
          <Text as="div" size="1" mt="1" style={{ color: t.warn }}>
            {teeth.teeth.length} fog van felsorolva, a darabszám {mennyisegDraft}. Szándékos?
          </Text>
        )}
      </Table.Cell>

      <Table.Cell>
        <Flex align="center" gap="1">
          <Box flexGrow="1">
            <NumberField
              value={line.mennyiseg}
              min={1}
              onCommit={(v) => onPatch({ mennyiseg: v })}
              onDraftChange={(v) => setMennyisegDraft(v ?? line.mennyiseg)}
              textAlign="center"
              aria-label="Darabszám"
            />
          </Box>
          <IconButton
            type="button"
            variant="ghost"
            color="gray"
            size="1"
            aria-label="Darabszám igazítása a fogakhoz"
            title="Darabszám igazítása a fogakhoz – innentől a fogak számát követi"
            // A tényleges szinkronizálást a `sorPatchKovetessel` 1. szabálya
            // végzi (domain/mennyiseg.ts) -- a hívó csak a szándékot jelzi.
            onClick={() => onPatch({ mennyisegKezi: false })}
            // A gomb MINDIG a DOM-ban marad, csak `visibility: hidden`-nel
            // tűnik el -- ha feltételesen renderelnénk, a mellette lévő
            // flexGrow-os NumberField szélessége soronként ugrálna aszerint,
            // hogy a sor levált-e. A tabIndex/aria-hidden kizárja a
            // fókuszsorból és a képernyőolvasóból, amíg nincs mit
            // visszakapcsolni.
            tabIndex={visszakapcsolhato ? 0 : -1}
            aria-hidden={visszakapcsolhato ? undefined : true}
            style={{ visibility: visszakapcsolhato ? 'visible' : 'hidden' }}
          >
            <UpdateIcon />
          </IconButton>
        </Flex>
      </Table.Cell>

      <Table.Cell justify="end">
        <Flex align="center" gap="1" justify="end">
          <Text
            style={{ fontVariantNumeric: 'tabular-nums', color: t.uiTextFaint, whiteSpace: 'nowrap' }}
          >
            {/* Egyedi sornál nincs értelmezhető árlistai referenciaár -- lásd
                sorMezokEgyedibol. */}
            {egyedi ? '—' : formatMoney(line.listaEgysegar, currency, nyelv)}
          </Text>
          <IconButton
            type="button"
            variant="ghost"
            color="gray"
            size="1"
            aria-label="Ár frissítése az árlistából"
            title="Ár frissítése az árlistából – a kézzel megadott ajánlati ár törlődik"
            onClick={onRequestArFrissites}
            // A ⟳ mennyiség-visszakapcsoló (fent, Db cella) mintája: mindig a
            // DOM-ban marad, csak `visibility: hidden`-nel tűnik el, hogy a
            // cella szélessége ne ugráljon soronként.
            tabIndex={arFrissitesJavaslat ? 0 : -1}
            aria-hidden={arFrissitesJavaslat ? undefined : true}
            style={{ visibility: arFrissitesJavaslat ? 'visible' : 'hidden', color: t.warn }}
          >
            <UpdateIcon />
          </IconButton>
        </Flex>
      </Table.Cell>

      <Table.Cell justify="end">
        <Flex direction="column" align="end" gap="1">
          <Flex align="center" gap="1" justify="end" width="100%">
            <Box flexGrow="1">
              <NumberField
                value={line.tenylegesEgysegar}
                unit={currency}
                min={0}
                onCommit={(v) =>
                  // Egyedi sornál nincs "listaár" mező -- a `listaEgysegar` a
                  // `tenylegesEgysegar`-ral együtt íródik, hogy sosem legyen
                  // kedvezmény-/felár-jelvény egy nem létező referenciaárhoz
                  // képest.
                  onPatch(egyedi ? { tenylegesEgysegar: v, listaEgysegar: v } : { tenylegesEgysegar: v })
                }
                textAlign="right"
                style={discount || surcharge ? { borderColor: t.brand } : undefined}
                aria-label="Ajánlati egységár"
              />
            </Box>
            {/* A Db cella ⟳ gombjának mintája (fentebb): MINDIG a DOM-ban,
                csak `visibility: hidden`-nel tűnik el -- egy feltételes
                render soronként ugráltatná a flexGrow-os NumberField
                szélességét. */}
            <IconButton
              type="button"
              variant="ghost"
              color="gray"
              size="1"
              aria-label="Ajánlati ár visszaállítása a listaárra"
              title="Ajánlati ár visszaállítása a listaárra"
              onClick={() => onPatch({ tenylegesEgysegar: line.listaEgysegar })}
              tabIndex={arEltero ? 0 : -1}
              aria-hidden={arEltero ? undefined : true}
              style={{ visibility: arEltero ? 'visible' : 'hidden' }}
            >
              <ResetIcon />
            </IconButton>
          </Flex>
          {/* backlog-60, 3. döntés: a widget MARAD ghost `IconButton` +
              `≈` szövegglyph (docs/07-felulet-rendszer.md nevesített
              kivétele) -- csak a pozíciója költözött az ár mező alá (D82). */}
          <IconButton
            type="button"
            variant="ghost"
            color="gray"
            size="1"
            aria-pressed={line.savos}
            aria-label="Becsült ár"
            title="Becsült ár – a végleges összeg a kezelés során változhat."
            onClick={() => onPatch({ savos: !line.savos })}
            style={{ color: line.savos ? t.warn : t.uiTextFaint }}
          >
            ≈
          </IconButton>
        </Flex>
      </Table.Cell>

      <Table.Cell justify="end" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatMoney(line.tenylegesEgysegar * line.mennyiseg, currency, nyelv)}
      </Table.Cell>

      <Table.Cell>
        <IconButton
          type="button"
          aria-label="Sor törlése"
          variant="ghost"
          color="gray"
          size="1"
          onClick={onRemove}
        >
          <TrashIcon />
        </IconButton>
      </Table.Cell>
    </Table.Row>
    {leirasNyitva && (
      <Table.Row>
        <Table.Cell colSpan={7}>
          <TextArea
            value={line.leirasSnapshot ?? ''}
            onChange={(e) => onPatch({ leirasSnapshot: e.target.value })}
            placeholder="pl. Implantátum, felépítmény, korona"
            rows={2}
            aria-label="Leírás (mi van benne?)"
          />
          <Flex justify="between" align="center" mt="1">
            {leirasTulHosszu(line.leirasSnapshot ?? '') ? (
              <Text as="div" size="1" style={{ color: t.warn }}>
                Hosszú leírás — ellenőrizd a nyomtatási képet.
              </Text>
            ) : (
              <Box />
            )}
            {leirasEltero && (
              <Flex align="center" gap="1">
                <Badge color="amber" variant="soft" size="1">
                  átírt leírás
                </Badge>
                <IconButton
                  type="button"
                  variant="ghost"
                  color="gray"
                  size="1"
                  aria-label="Leírás visszaállítása az árlistaira"
                  title="Leírás visszaállítása az árlistaira"
                  onClick={() => onPatch({ leirasSnapshot: arlistaLeirasSzoveg })}
                >
                  <ResetIcon />
                </IconButton>
              </Flex>
            )}
          </Flex>
        </Table.Cell>
      </Table.Row>
    )}
    </>
  );
}

function Summary({
  grand,
  listTotal,
  currency,
  nyelv,
}: {
  grand: number;
  listTotal: number;
  currency: Penznem;
  nyelv: Nyelv;
}) {
  // A két ág kizárja egymást (`listTotal` és `grand` közül csak az egyik
  // lehet nagyobb). A felár azonos vizuális súlyt kap, mint a kedvezmény:
  // semleges ténymegállapítás, nem hibajelzés -- a doki dolgozhat felárral
  // (backlog-12, 4. döntés). A nyomtatvány mindkét irányú eltérésre
  // megmutatja a "Kezelések összesen" referenciasort, ezért indokolatlan
  // lenne, ha a szerkesztő csak az egyik irányról adna visszajelzést.
  const discount = listTotal - grand;
  const surcharge = grand - listTotal;
  return (
    <Flex justify="between" align="baseline" gap="4">
      <Text size="3" color="gray">
        Mindösszesen
      </Text>
      <Box style={{ textAlign: 'right' }}>
        <Text
          as="div"
          size="6"
          weight="bold"
          style={{ color: t.brand, fontVariantNumeric: 'tabular-nums' }}
        >
          {formatMoney(grand, currency, nyelv)}
        </Text>
        {discount > 0 && (
          // Csak a szerkesztőben látszik. A nyomtatványon NEM (D9).
          <Text as="div" size="2" style={{ color: t.ok }}>
            Kedvezmény: {formatMoney(discount, currency, nyelv)}
          </Text>
        )}
        {surcharge > 0 && (
          <Text as="div" size="2" style={{ color: t.ok }}>
            Felár: {formatMoney(surcharge, currency, nyelv)}
          </Text>
        )}
      </Box>
    </Flex>
  );
}

/**
 * Egyedi végösszeg (D69, a D25 fix-összeg elvének bővítése). A `Summary` ÉS
 * az `ElolegBlokk` KÖZÖTT áll: az előleg a CSÖKKENTETT végösszegből számol,
 * a vizuális sorrend kövesse a számítási sorrendet.
 *
 * A doki a kívánt VÉGÖSSZEGET gépeli be, de a `Plan`-en előjeles fix
 * eltérés tárolódik (`kedvezmenyOsszeg` -- pozitív kedvezmény, negatív
 * felár, D25/D69). A `NumberField`-nek nincs `max` propja, és a felső
 * korlát D69 óta nincs is -- a cél a sorok összege fölé is állítható.
 *
 * A kapcsoló bekapcsolása KÜLÖN lokális `be` állapotot tart: a
 * `kedvezmenyOsszeg` `null` marad, amíg a doki nem commitál (blur/Enter),
 * hogy a mező üresen, azonnali fókusszal induljon, ne egy hamis `0`
 * előtöltéssel. A `0` cél-végösszeg (teljes elengedés) egyszeri
 * megerősítést kér -- a `nullaMegerositve` addig érvényes, amíg a cél `0`
 * marad, egy 0→más→0 váltás újra kérdez.
 */
function EgyediVegosszegBlokk({
  sorszintuOsszeg,
  currency,
  nyelv,
  kedvezmenyOsszeg,
  onChange,
}: {
  sorszintuOsszeg: number;
  currency: Penznem;
  nyelv: Nyelv;
  kedvezmenyOsszeg: number | null;
  onChange: (next: number | null) => void;
}) {
  const [be, setBe] = useState(kedvezmenyOsszeg != null);
  // CSAK bekapcsolni szabad innen -- ha a doki kikapcsolja, a kapcsoló
  // állapota `onChange(null)`-on át, a propon keresztül jön vissza.
  useEffect(() => {
    if (kedvezmenyOsszeg != null) setBe(true);
  }, [kedvezmenyOsszeg]);

  // A tényleges (0-ra padlózott) Fizetendő -- ez a mező kiinduló/megjelenő
  // értéke, nem a nyers `kedvezmenyOsszeg - sorszintuOsszeg` levonás, ami
  // negatívba fordulhatna kedvezmény-ágon a sorok utólagos törlésekor.
  // `null`, amíg a doki még nem commitált -- ez adja az üres mezőt.
  const celVegosszeg = kedvezmenyOsszeg == null ? null : Math.max(0, sorszintuOsszeg - kedvezmenyOsszeg);
  const tulLog = kedvezmenyOsszeg != null && kedvezmenyOsszeg > sorszintuOsszeg;

  const [hiba, setHiba] = useState(false);
  const [nullaMegerositve, setNullaMegerositve] = useState(celVegosszeg === 0);
  useEffect(() => {
    if (celVegosszeg !== 0) setNullaMegerositve(false);
  }, [celVegosszeg]);
  const [pendingZero, setPendingZero] = useState<{ kedvezmeny: number } | null>(null);

  function commitCel(v: number) {
    setHiba(false);
    const target = Math.max(0, Math.round(v));
    const nextKedvezmeny = sorszintuOsszeg - target;
    if (target === 0 && !nullaMegerositve) {
      setPendingZero({ kedvezmeny: nextKedvezmeny });
      return;
    }
    onChange(nextKedvezmeny);
  }

  return (
    <Box mt="3">
      <Text as="label" size="2" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Checkbox
          checked={be}
          onCheckedChange={(checked) => {
            if (checked === true) {
              setBe(true);
            } else {
              setBe(false);
              setHiba(false);
              setPendingZero(null);
              onChange(null);
            }
          }}
        />
        Egyedi végösszeg beállítása
      </Text>

      {be && (
        <Box
          mt="2"
          onBlur={(e) => {
            // D521: a kötelező-mező hiba csak blur/véglegesítési kísérlet
            // UTÁN jelenik meg, nem azonnal a kapcsoló bekapcsolásakor --
            // és nem akkor, ha épp a 0-megerősítés dialógusa nyílik (az
            // maga is fókuszt visz el a mezőről).
            if (
              !e.currentTarget.contains(e.relatedTarget as Node | null) &&
              kedvezmenyOsszeg == null &&
              pendingZero === null
            ) {
              setHiba(true);
            }
          }}
        >
          <Flex justify="between" align="center" gap="3">
            <Text size="2" color="gray">
              Egyedi végösszeg
            </Text>
            <Box style={{ width: 120 }}>
              <NumberField
                value={celVegosszeg}
                min={0}
                unit={currency}
                aria-label="Egyedi végösszeg"
                textAlign="right"
                // Csak friss bekapcsoláskor (még nincs commitált érték) --
                // egy betöltött terven ez a mező már ki van töltve, ott nem
                // szabad elvinni a fókuszt.
                autoFocus={kedvezmenyOsszeg == null}
                onCommit={commitCel}
              />
            </Box>
          </Flex>
          {kedvezmenyOsszeg != null && (
            <Text as="div" size="2" color="gray" mt="1" style={{ textAlign: 'right' }}>
              {kedvezmenyOsszeg > 0 && `→ ${formatMoney(kedvezmenyOsszeg, currency, nyelv)} kedvezmény`}
              {kedvezmenyOsszeg < 0 && `→ ${formatMoney(-kedvezmenyOsszeg, currency, nyelv)} felár`}
              {kedvezmenyOsszeg === 0 && '→ nincs eltérés a tételek összegétől'}
            </Text>
          )}
          {tulLog && (
            <Text as="div" size="1" mt="1" style={{ color: t.warn }}>
              A beállított kedvezmény nagyobb, mint a tételek összege — a fizetendő 0. Írd be
              újra az egyedi végösszeget.
            </Text>
          )}
          {hiba && (
            <Text as="div" size="1" mt="1" style={{ color: t.danger }}>
              Add meg az egyedi végösszeget, vagy kapcsold ki a jelölőt.
            </Text>
          )}
        </Box>
      )}

      <AlertDialog.Root
        open={pendingZero !== null}
        onOpenChange={(open) => !open && setPendingZero(null)}
      >
        <AlertDialog.Content maxWidth="440px">
          <AlertDialog.Title>Egyedi végösszeg: {formatMoney(0, currency, nyelv)}</AlertDialog.Title>
          <AlertDialog.Description size="2">
            A beállított egyedi végösszeg {formatMoney(0, currency, nyelv)} — ez a tételek teljes
            elengedését jelenti. Biztosan ezt szeretnéd?
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
                  if (pendingZero) {
                    onChange(pendingZero.kedvezmeny);
                    setNullaMegerositve(true);
                  }
                  setPendingZero(null);
                }}
              >
                Megerősítem
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}

/**
 * Előleg-kapcsoló (backlog-9, D66: abszolút összeg). A `Summary` ALATT áll,
 * mert az előleg a végösszegből számol -- ez az a pillanat, amikor a doki
 * amúgy is azt nézi.
 *
 * A `Plan` továbbra is egyetlen nullázható mezőt hordoz (`elolegOsszeg`,
 * `null` = nincs előleg-sor a nyomtatványon). A "bekapcsolva, de a doki még
 * nem írt be összeget" állapot viszont KIZÁRÓLAG komponens-lokális (`on`) --
 * bekapcsoláskor a mező üresen, azonnali fókusszal jelenik meg, előtöltés
 * nélkül (D517), és amíg a doki nem commitál egy összeget, a `Plan`-en
 * marad `null`. Ez zárja ki, hogy egy "bekapcsolt, de értelmetlen" állapot
 * perzisztálódjon.
 */
function ElolegBlokk({
  grand,
  currency,
  nyelv,
  elolegOsszeg,
  onChange,
}: {
  grand: number;
  currency: Penznem;
  nyelv: Nyelv;
  elolegOsszeg: number | null;
  onChange: (next: number | null) => void;
}) {
  const [on, setOn] = useState(() => elolegOsszeg != null);
  // Van-e ÉRVÉNYES, commitált összeg a mezőben -- ezt nézi a kötelező-mező
  // hiba (D518: csak blur/véglegesítési kísérlet után), NEM a prop-ot: az
  // `onChange` a szülő state-jét frissíti, ami csak a KÖVETKEZŐ renderben ér
  // vissza propként, az `onCommit`-tal egy tickben lefutó `onBlur` még a
  // régi (stale) propot látná.
  const [helyesErtek, setHelyesErtek] = useState(() => elolegOsszeg != null);
  const [hibaLatszik, setHibaLatszik] = useState(false);

  // Külső prop-változást követ (pl. terv betöltése/másolása) -- a doki
  // épp folyamatban lévő, még nem commitált gépelését a NumberField saját
  // `focused`-őre már megvédi, ez csak a kapcsoló ki/be állapotát.
  useEffect(() => {
    setOn(elolegOsszeg != null);
    setHelyesErtek(elolegOsszeg != null);
  }, [elolegOsszeg]);

  const tullepi = on && elolegOsszeg != null && elolegTullepi(grand, elolegOsszeg);
  const osszegek = on && elolegOsszeg != null ? elolegOsszegek(grand, elolegOsszeg) : null;

  return (
    <Box mt="3">
      <Text as="label" size="2" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Checkbox
          checked={on}
          onCheckedChange={(checked) => {
            if (checked === true) {
              setOn(true);
              setHelyesErtek(false);
              setHibaLatszik(false);
              return;
            }
            setOn(false);
            setHelyesErtek(false);
            setHibaLatszik(false);
            onChange(null);
          }}
        />
        Ez a terv fogtechnikai munkát tartalmaz — előleg feltüntetése
      </Text>

      {on && (
        <Box mt="2">
          <Flex justify="between" align="center" gap="3">
            <Text size="2" color="gray">
              Előleg
            </Text>
            <Box style={{ width: 120 }}>
              <NumberField
                value={elolegOsszeg}
                unit={currency}
                min={0}
                autoFocus
                aria-label="Előleg összege"
                textAlign="right"
                onCommit={(v) => {
                  // Explicit 0 -- canonical disable: a kapcsoló automatikusan
                  // kikapcsol, a mező eltűnik (D519, "0 összegű előleg" nem
                  // értelmes állapot).
                  if (v === 0) {
                    setOn(false);
                    setHelyesErtek(false);
                    setHibaLatszik(false);
                    onChange(null);
                    return;
                  }
                  setHelyesErtek(true);
                  setHibaLatszik(false);
                  onChange(Math.max(0, Math.round(v)));
                }}
                onBlur={() => setHibaLatszik(!helyesErtek)}
              />
            </Box>
          </Flex>
          {hibaLatszik && (
            <Text as="div" size="1" mt="1" style={{ color: t.danger }}>
              Add meg az előleg összegét.
            </Text>
          )}
          {tullepi && (
            <Text as="div" size="1" mt="1" style={{ color: t.danger }}>
              Az előleg nagyobb, mint a fizetendő. A véglegesítéshez csökkentsd az összeget, vagy
              módosítsd a sorokat.
            </Text>
          )}
          <Flex justify="between" align="baseline" mt="1">
            <Text size="2" color="gray">
              Fennmaradó rész
            </Text>
            <Text size="2" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {osszegek?.fennmarado == null ? '—' : formatMoney(osszegek.fennmarado, currency, nyelv)}
            </Text>
          </Flex>
        </Box>
      )}
    </Box>
  );
}
