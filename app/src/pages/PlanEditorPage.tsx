// Kezelési terv szerkesztő -- a legfontosabb képernyő, portolva
// ui/PlanEditor.jsx-ből. A billentyűzetes ciklus a lényeg, ez veri meg az
// Excelt: gépel -> nyíl -> Enter -> a kereső kiürül és visszakapja a
// fókuszt -> gépel tovább, egérhasználat nélkül. Lásd CLAUDE.md
// "A UX kritikus pontja".

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, Box, Button, Callout, Checkbox, Flex, Separator, Text } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { useNyelviReview } from '../components/NyelviReviewContext';
import ToothChartPanel from '../components/ToothChartPanel';
import { arFrissites, arFrissitesPatch, type ArFrissites } from '../domain/arKoveti';
import { generaltFazisNev } from '../domain/blankPlan';
import { formatLongDate } from '../domain/date';
import { fazisCsukvaMozgatasUtan, fazisCsukvaTorlesUtan, fazisokFelcserelve } from '../domain/fazisSorrend';
import { sorPatchKovetessel } from '../domain/mennyiseg';
import { formatMoney } from '../domain/money';
import { reviewElfogadva, reviewIrasUtan, sorPatchNyelvvel } from '../domain/nyelviReview';
import { sorPatchOroklessel } from '../domain/orokoltJelzesek';
import { sorMezokEgyedibol, sorMezokTetelbol } from '../domain/sorMezok';
import { buildToothVisualStates } from '../domain/toothVisual';
import { elteresBontas, fazisOsszeg, sorokOsszeg, tervVegosszeg } from '../domain/totals';
import type { Plan, Sor, Tetel } from '../domain/types';
import { useAppState } from '../state/AppState';
import type { FokuszCel } from './planEditor/elemIdk';
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
  // Ár-frissítés megerősítő előnézete (backlog-61) -- a "Hatás a
  // tervre" számításhoz a teljes `plan`-re van szükség, ezért a state itt,
  // a szülőben él, nem a LineRow-ban (a fázistörlés `pendingDeleteIndex`
  // mintája).
  const [pendingArFrissites, setPendingArFrissites] = useState<{ pi: number; li: number } | null>(
    null,
  );
  // Melyik fázisok vannak összecsukva -- a halmaz a CSUKOTT
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

  // A teljes piszkozat eldobása (6. döntés) -- a `patientDir`-t a
  // `resetPlanDraft()` HÍVÁS ELŐTT kell kiolvasni, mert az nullázza a
  // piszkozat-metaadatot.
  function handleDiscardDraft() {
    const dir = piszkozatPatientDir;
    resetPlanDraft();
    setConfirmDiscard(false);
    navigate(dir ? `/paciensek/${encodeURIComponent(dir)}` : '/paciensek');
  }

  function addLine(phaseIdx: number, item: Tetel) {
    const mezok = sorMezokTetelbol(item, currency, nyelv);
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
        ...sorMezokEgyedibol(nev, nyelv),
        fogak: '',
        mennyiseg: 1,
        mennyisegKezi: false,
      });
    });
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
  const bontas = elteresBontas(plan.fazisok, plan.kedvezmenyOsszeg);
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
      <PlanEditorHeader
        patientName={plan.paciens.nev}
        statusz={plan.statusz}
        onPreview={() => navigate('/elonezet')}
        piszkozatMentve={piszkozatMentve}
        piszkozatHiba={piszkozatHiba}
        piszkozatKonfliktus={piszkozatKonfliktus != null}
        onDiscard={() => setConfirmDiscard(true)}
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
            kategoriak={priceList.kategoriak}
            frequent={frequent}
            tetelekById={tetelekById}
            fogterkep={fogterkep}
            fokuszCel={fokuszCel}
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
                const f = draft.fazisok[pi];
                // A doki gépelése stampel -- a `generaltFazisNev()`/
                // `movePhase()` RENDSZER-írásai (fenti :262/:299-300) nem
                // ezen az úton mennek, azok nem érintik a review-metaadatot.
                f.megnevezesNyelv = reviewIrasUtan(f.megnevezesNyelv, f.megnevezes, v, nyelv);
                f.megnevezes = v;
              })
            }
            onNevKesz={() => setFokuszCel({ mit: 'fazisKereso', pi })}
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
              grand={grand}
              kedvezmeny={bontas.kedvezmeny}
              felar={bontas.felar}
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
