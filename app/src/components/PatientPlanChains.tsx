// EGY páciens terv-lánc -> verzió fája (D29), a hozzá tartozó akciókkal
// (Új verzió / Másolás új tervbe / Megnézés / Letöltés / Új terv /
// terv-címke szerkesztés). Eredetileg az OsszesTervSection.tsx soronkénti
// (`.map(patients...)`) JSX-e volt -- backlog-30 (Páciens detail shell)
// emelte ide, páciens-paraméteresre alakítva, mert mostantól KÉT hívó
// használja: az OsszesTervSection.tsx lista (patiensenként egy példány) ÉS a
// PatientDetailPage.tsx "Kezelési tervek" tabja (egy példány).
//
// A korábban OLDAL-szintű, csak EGY aktív interakciót engedő state
// (címke-szerkesztés, megerősítő dialógus, akció-hiba, összecsukás)
// idekerült, saját `useState`-ekként -- minden példány függetlenül kezeli
// a saját interakcióját. A `patient`-en kívüli adatokat (plans/
// versionsByPlan/plansByVersion/totalsByVersion) a hívó tölti be és adja
// át, hogy a betöltési STRATÉGIA (az OsszesTervSection egyszerre, minden
// páciensre; a PatientDetailPage egyetlen páciensre, lásd
// domain/planChainData.ts) hívónként eltérhessen, a renderelés viszont
// egy helyen éljen.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  DropdownMenu,
  Flex,
  IconButton,
  Separator,
  Text,
  TextField,
} from '@radix-ui/themes';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CrossCircledIcon,
  Cross2Icon,
  DotsHorizontalIcon,
  Pencil1Icon,
} from '@radix-ui/react-icons';
import { csokkentettMozgas } from '../design/motion';
import { t } from '../design/tokens';
import { formatPiszkozatIdo } from '../domain/date';
import { formatMoney } from '../domain/money';
import { latestVersionAcrossPlans, legfrissebbVerzio } from '../domain/planFolders';
import { piszkozatCelRoute } from '../domain/piszkozat';
import { tervReszleteiUtvonal, type VersionRef } from '../domain/planVersionActions';
import { rendezettLancok, versionDataKey, type VersionTotal } from '../domain/planChainData';
import { tervVegosszeg } from '../domain/totals';
import { ALAPERTELMEZETT_TERV_CIM, megjelenitettTervCim } from '../domain/tervCim';
import { workflowLepesFelirat } from '../domain/workflowLepesek';
import type { PatientFolder, Plan, PlanFolder, PlanVersion } from '../domain/types';
import { useAppState } from '../state/AppState';
import type { AktivDraft } from './useAktivDraft';
import PlanVersionActionDialog, {
  nincsMentettPdfHiba,
  usePlanVersionActions,
  VerzioAkcioUzenet,
} from './PlanVersionActionDialog';
import { buildDownloadFileName } from '../storage/paths';
import { useStorage } from '../storage/StorageContext';

export interface PatientPlanChainsProps {
  patient: PatientFolder;
  plans: PlanFolder[];
  versionsByPlan: Record<string, PlanVersion[]>;
  plansByVersion: Record<string, Plan>;
  totalsByVersion: Record<string, VersionTotal>;
  /** Legalább egy terv-lánc vagy verzió listázása/betöltése hibázott (P1-2). */
  unreadable: boolean;
  /**
   * A fejlécsor alakja (D44), a hívó felület dönti el -- a komponens nem
   * ismerheti, ki hívja, ugyanaz az elv, mint a `PatientEditorPanel`
   * callback-propjainál. `standalone`: páciensnév + „Páciens adatai”
   * kereszt-link + „Új terv” -- a Korábbi tervek listáján ez az EGYETLEN
   * páciens-azonosító és az EGYETLEN út a törzsadathoz. `embedded`: csak
   * „Új terv” (és hiba esetén a ⚠ jelzés) -- a páciens-részletoldalon,
   * ahol a sticky fejléc már kiírja a nevet, a tabsor pedig már kínálja a
   * `Páciens adatai`-t; mindkettő megismétlése zaj, nem
   * redundancia-biztonság. Szándékosan nincs alapértelmezés: melyik alak
   * a helyes, kizárólag a körülvevő felületből következik.
   */
  header: 'standalone' | 'embedded';
  /** Kereszt-link a páciens törzsadatára -- kizárólag `header: 'standalone'` esetén hívódik. */
  onNavigateToPatientData?: () => void;
  /**
   * Sikeres címke-mentés után -- a `plans` prop a HÍVÓ állapota, ezt a
   * komponens maga nem írhatja át közvetlenül. A hívó felelőssége a saját
   * `plans`-listájában a megfelelő elem `tervCim`-jét frissíteni, hogy a
   * következő render már a mentett címkét mutassa (nem élő javaslatra
   * visszaesve).
   */
  onLabelSaved: (planDir: string, tervCim: string | null) => void;
  /**
   * Az EGYETLEN globális, mentetlen piszkozat (D21) -- KIZÁRÓLAG akkor
   * átadva, ha ehhez a `patient`-hez tartozik (a hívó már szűrt
   * `sajatDraft()`-tal, `components/useAktivDraft.ts`, 46. tétel). A
   * komponens nem ellenőrzi újra a hovatartozást, ugyanaz a doktrína, mint
   * a `plans`/`versionsByPlan` betöltésénél.
   */
  aktivDraft?: AktivDraft | null;
  /**
   * planDir -> nyitva (46. tétel, D237/D250). Hiányzó kulcs = alapértelmezés
   * (csak a legfrissebb lánc, `rendezettLancok()[0]`, nyitva). Ha nincs
   * átadva (PatientDetailPage `embedded`), a komponens a saját, lokális
   * state-jében tartja a nyitottságot; ha VAN (OsszesTervSection `standalone`),
   * ez a prop az igazság forrása -- a POP-navigációs visszaállításhoz a
   * lapnak kell birtokolnia (D240, `useListStateMemory`).
   */
  nyitottLancok?: Record<string, boolean>;
  /** `nyitottLancok`-hoz tartozó író -- csak akkor hívódik, ha `nyitottLancok` is át van adva. */
  onLancValtas?: (planDir: string, nyitva: boolean) => void;
}

export default function PatientPlanChains({
  patient,
  plans,
  versionsByPlan,
  plansByVersion,
  totalsByVersion,
  unreadable,
  header,
  onNavigateToPatientData,
  onLabelSaved,
  aktivDraft,
  nyitottLancok,
  onLancValtas,
}: PatientPlanChainsProps) {
  const { storage, loadPlanPdf, isSeedVersion } = useStorage();
  const { priceList } = useAppState();
  const navigate = useNavigate();
  const akciok = usePlanVersionActions({ patientDir: patient.dirName });

  const standalone = header === 'standalone';

  // Lánc-szintű összecsukás (46. tétel, D237/D249/D250) -- FELVÁLTJA a
  // korábbi, kizárólag `standalone`-ban élő páciens-szintű "N terv"
  // kapcsolót: az most már redundáns lenne a lánc-szintű toggle mellett,
  // mindkét hívón egyformán. Override-map, a régi `expandedOverride ?? false`
  // idióma lánconkénti kiterjesztése -- ha a hívó nem ad `nyitottLancok`-ot
  // (embedded), a komponens saját state-je az igazság forrása.
  const [helyiNyitas, setHelyiNyitas] = useState<Record<string, boolean>>({});
  const nyitas = nyitottLancok ?? helyiNyitas;
  const rendezett = rendezettLancok(plans, versionsByPlan, plansByVersion);
  const alapNyitottDir = rendezett[0]?.dirName ?? null;
  function nyitva(planDir: string): boolean {
    return nyitas[planDir] ?? planDir === alapNyitottDir;
  }
  function toggleLanc(planDir: string) {
    const kovetkezo = !nyitva(planDir);
    if (onLancValtas) {
      onLancValtas(planDir, kovetkezo);
    } else {
      setHelyiNyitas((prev) => ({ ...prev, [planDir]: kovetkezo }));
    }
  }

  const [editingLabel, setEditingLabel] = useState<{ planDir: string } | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [labelError, setLabelError] = useState<{ planDir: string; message: string } | null>(null);

  const latestOverall = latestVersionAcrossPlans(plans, (planDir) => versionsByPlan[planDir] ?? []);

  async function downloadVersion(ref: VersionRef, tervId: string) {
    akciok.jelezHiba(null);
    try {
      const bytes = await loadPlanPdf({
        patientDir: patient.dirName,
        planDir: ref.planDir,
        versionDir: ref.versionDir,
      });
      if (!bytes) {
        akciok.jelezHiba(
          nincsMentettPdfHiba(ref, isSeedVersion({ patientDir: patient.dirName, ...ref })),
        );
        return;
      }
      // A verzió saját, MÁR betöltött terv.json-ja adja a nevet/statuszt --
      // olvashatatlan verziónál (nincs a plansByVersion-ben, csak a PDF
      // tölthető be külön) a páciens-szintű névre és `isDraft: false`-ra
      // esünk vissza, hogy a letöltés emiatt ne váljon szigorúbbá, mint ma.
      const versionPlan = plansByVersion[versionDataKey(ref.planDir, ref.versionDir)];
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildDownloadFileName(versionPlan?.paciens.nev || patient.nev, {
        tervId,
        isDraft: versionPlan ? versionPlan.statusz !== 'VEGLEGES' : false,
        suffix: ref.versionDir,
      });
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      akciok.jelezHiba({
        ...ref,
        message:
          err instanceof Error
            ? `A letöltés nem sikerült: ${err.message}`
            : 'A letöltés váratlanul meghiúsult.',
      });
    }
  }

  /**
   * "Ugrás a legfrissebb verzióra" (50. tétel, D58, D24) -- azonos oldalon
   * belüli scroll+fókusz a lánc legfrissebb verziósorára, a MEGLÉVŐ
   * `data-plan={plan.dirName}` horgony felhasználásával (a lánc ilyenkor
   * MÁR nyitva van, a horgony a DOM-ban). A `DropdownMenu.Content`-en lent
   * MÁR le van tiltva az `onCloseAutoFocus`, tehát a Radix nem veszi
   * vissza a fókuszt a (scroll után képernyőn kívülre kerülő) `⋯`
   * triggerre -- a lánc-fejléc toggle gombjára fókuszálunk helyette, mert
   * az minden láncon létezik, stabil id-vel.
   */
  function ugrasLegfrissebbre(planDir: string) {
    const box = document.querySelector<HTMLElement>(`[data-plan="${planDir}"]`);
    box?.scrollIntoView({ block: 'start', behavior: csokkentettMozgas() ? 'auto' : 'smooth' });
    // requestAnimationFrame: a DropdownMenu.Item onSelect még a menü
    // FocusScope-ja alatt fut -- egy szinkron .focus() ide kívülre a trap
    // visszalöki, a menü bezárása UTÁN a fókusz body-ra esne (ugyanaz az
    // idióma, mint az ItemPicker.tsx/UjPaciensDialog.tsx/NewPlanPage.tsx
    // fókusz-visszaadásánál).
    requestAnimationFrame(() => {
      document.getElementById(`lanc-toggle-${planDir}`)?.focus();
    });
  }

  function startEditLabel(planDir: string, current: string) {
    setLabelError(null);
    setEditingLabel({ planDir });
    setLabelDraft(current);
  }

  function cancelEditLabel() {
    setEditingLabel(null);
  }

  async function saveLabel(planDir: string, value: string) {
    setLabelError(null);
    try {
      await storage.savePlanLabel(patient.dirName, planDir, value);
      const trimmed = value.trim();
      onLabelSaved(planDir, trimmed || null);
      setEditingLabel(null);
    } catch (err) {
      setLabelError({
        planDir,
        message:
          err instanceof Error
            ? `A címke mentése nem sikerült: ${err.message}`
            : 'A címke mentése váratlanul meghiúsult.',
      });
    }
  }

  /** A ténylegesen megjelenített címke -- kézi vagy élő javaslat (D29). */
  function displayedLabel(plan: PlanFolder): string {
    const versions = versionsByPlan[plan.dirName] ?? [];
    const latest = versions[versions.length - 1];
    const latestPlan = latest ? plansByVersion[versionDataKey(plan.dirName, latest.dirName)] : undefined;
    return latestPlan
      ? megjelenitettTervCim(plan.tervCim, latestPlan, priceList)
      : (plan.tervCim ?? ALAPERTELMEZETT_TERV_CIM);
  }

  // Az aktív draft blokk kontextus-sora (6. döntés): "Új verzió — <lánc
  // címke>", ha a piszkozat `tervId`-je egy MEGLÉVŐ lánccal egyezik,
  // egyébként "Új terv" (a `tervId` üres -- "Másolás új tervbe"/"Új terv"
  // eredménye).
  let draftKontextus: string | null = null;
  if (aktivDraft) {
    const lanc = aktivDraft.plan.tervId ? plans.find((p) => p.tervId === aktivDraft.plan.tervId) : undefined;
    draftKontextus = lanc ? `Új verzió — ${displayedLabel(lanc)}` : 'Új terv';
  }

  return (
    <Box>
      {/* `embedded` fejlécben a páciensnév és a „Páciens adatai” kereszt-link
          elmarad (D44): ott a körülvevő felület sticky fejléce és tab-sávja
          már kimondja mindkettőt. Az „Új terv” akciógomb mindkét változatban
          marad, és `standalone`-ban a névfejléc MELLETT van, nem benne: a
          páciensnév címke, a gomb akció -- egy Text-en belül a kettő
          összeolvad. Balra zárva, közvetlenül a név után: a rövid "+ Új
          terv" felirat nem mondja ki, hogy a páciensadatot átviszi -- ezt
          az elhelyezés hordozza. Accent (nem szürke), a páciensnév
          `t.brand` színével egy családban. `embedded`-ben a gomb teljes
          értékű CTA (alap méret, solid) -- egyenrangú a terv nélküli
          páciens üres állapotának „+ Új terv” gombjával, ugyanezen a
          tabon. Cím nélkül (D44) a gomb jobbra zárva horgonyzódik a
          tartalom-terület tetejéhez, egy vonalban a verzió-sorok jobb
          szélével (⋯ menü / összeg) -- ezért `justify="end"` csak
          `embedded`-ben, `standalone`-ban marad a default balra zárás. */}
      {(standalone || unreadable || latestOverall || aktivDraft) && (
        <Flex align="baseline" gap="3" mb="2" wrap="wrap" justify={standalone ? 'start' : 'end'}>
          {standalone && (
            <Text as="div" size="3" weight="bold" style={{ color: t.brand }}>
              {patient.nev}
            </Text>
          )}
          {unreadable && (
            <Text size="1" style={{ color: t.warn }}>
              ⚠ néhány verziója nem olvasható
            </Text>
          )}
          {/* 46. tétel: a gomb akkor is megjelenik, ha a páciensnek nincs
              még véglegesített terve, de VAN aktív, mentetlen piszkozata --
              a `planDir`/`versionDir` ilyenkor nem használt (a `ujTerv`
              dispatch a páciens ÉLŐ törzsadatával indít, nem egy konkrét
              verzióból, lásd `ujTervPaciensAdataival()`). */}
          {(latestOverall || aktivDraft) && (
            <Button
              size={standalone ? '1' : undefined}
              variant={standalone ? 'soft' : undefined}
              onClick={() =>
                akciok.inditas({
                  kind: 'ujTerv',
                  planDir: latestOverall?.planDir,
                  versionDir: latestOverall?.version.dirName,
                })
              }
            >
              + Új terv
            </Button>
          )}
          {/* Kereszt-link a páciens törzsadatára (backlog-28/backlog-30, D33) --
              gray/ghost, hogy a hangsúly az "Új terv" akción maradjon: ez csak
              navigáció, nem terv-létrehozó. */}
          {standalone && (
            <Button size="1" variant="ghost" color="gray" onClick={onNavigateToPatientData}>
              Páciens adatai
            </Button>
          )}
        </Flex>
      )}
      {akciok.hiba && akciok.hiba.planDir === null && akciok.hiba.versionDir === null && (
        <VerzioAkcioUzenet hiba={akciok.hiba} />
      )}

      {aktivDraft && (
        <AktivDraftBlokk
          kontextus={draftKontextus ?? 'Új terv'}
          paciensNev={aktivDraft.plan.paciens.nev.trim()}
          lepesFelirat={workflowLepesFelirat(aktivDraft.lastRoute)}
          mentve={aktivDraft.mentve}
          osszeg={
            aktivDraft.plan.fazisok.every((f) => f.sorok.length === 0)
              ? null
              : {
                  ertek: tervVegosszeg(aktivDraft.plan.fazisok, aktivDraft.plan.kedvezmenyOsszeg),
                  penznem: aktivDraft.plan.penznem,
                  nyelv: aktivDraft.plan.nyelv,
                }
          }
          onFolytatas={() => navigate(piszkozatCelRoute(aktivDraft.lastRoute, aktivDraft.plan))}
        />
      )}

      {rendezett.map((plan, planIdx) => {
        const versions = versionsByPlan[plan.dirName] ?? [];
        const isEditing = editingLabel?.planDir === plan.dirName;
        const label = displayedLabel(plan);
        const legfrissebb = legfrissebbVerzio(versions);
        const chainTotal = legfrissebb
          ? totalsByVersion[versionDataKey(plan.dirName, legfrissebb.dirName)]
          : undefined;
        const lancNyitva = nyitva(plan.dirName);
        const lancDraftJelzett =
          aktivDraft != null && aktivDraft.plan.tervId !== '' && aktivDraft.plan.tervId === plan.tervId;
        const controlsId = `lanc-${patient.dirName}-${plan.dirName}`;
        return (
          <Box key={plan.dirName} mb="3" data-plan={plan.dirName}>
            {/* mt="4" a fölötte lévő elem mb-jével kollabálva 16px teret
                ad a cím fölé (a szülő Box-ok itt paddig/margó nélküliek,
                a margó "átüt" rajtuk); mb="2" 8px-re nyitja a cím és az
                első verzió-sor közti rést -- így a cím egyértelműen a
                verziók fejléceként olvasódik, nem újabb sorként. A lánc-
                toggle és a végösszeg (46. tétel, 2. döntés) a Flex KÉT
                VÉGÉN áll -- a végösszeg CSAK csukott állapotban látszik,
                nyitva redundáns lenne a legfrissebb verziósor azonos
                értékével. */}
            <Flex align="center" gap="2" mt="4" mb="2" justify="between">
              <Flex align="center" gap="1" wrap="wrap">
                {isEditing ? (
                  <>
                    <TextField.Root
                      size="1"
                      autoFocus
                      value={labelDraft}
                      onChange={(e) => setLabelDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          void saveLabel(plan.dirName, labelDraft);
                        } else if (e.key === 'Escape') {
                          cancelEditLabel();
                        }
                      }}
                      placeholder="Terv címe"
                      aria-label="Terv címe"
                      style={{ maxWidth: 260 }}
                    />
                    <IconButton
                      size="1"
                      variant="soft"
                      aria-label="Címke mentése"
                      onClick={() => void saveLabel(plan.dirName, labelDraft)}
                    >
                      <CheckIcon />
                    </IconButton>
                    <IconButton
                      size="1"
                      variant="soft"
                      color="gray"
                      aria-label="Címke szerkesztésének elvetése"
                      onClick={cancelEditLabel}
                    >
                      <Cross2Icon />
                    </IconButton>
                  </>
                ) : (
                  <>
                    {/* Lánc-fejléc toggle (46. tétel, 1./8. döntés): sima
                        `Button` `aria-expanded`/`aria-controls` párral, a
                        MEGLÉVŐ (mai, most törölt page-szintű) toggle
                        mintáján -- NEM fa-widget. A draft-jelző Badge a
                        gombon BELÜL, saját onClick nélkül (5. döntés: nem
                        kattintható külön, a kattintás célja a toggle marad;
                        a badge szövege ezért szándékosan a gomb accessible
                        name-ébe folyik). */}
                    <Button
                      type="button"
                      id={`lanc-toggle-${plan.dirName}`}
                      size="1"
                      variant="ghost"
                      aria-expanded={lancNyitva}
                      aria-controls={controlsId}
                      onClick={() => toggleLanc(plan.dirName)}
                    >
                      {lancNyitva ? <ChevronDownIcon /> : <ChevronRightIcon />}
                      <Text size="2" weight="medium">
                        {label} · v{legfrissebb?.verzio ?? '—'} · {legfrissebb?.isoDate ?? '—'}
                      </Text>
                      {lancDraftJelzett && (
                        <Badge color="amber" variant="soft" size="1" ml="1">
                          Piszkozat
                        </Badge>
                      )}
                    </Button>
                    <IconButton
                      size="1"
                      variant="ghost"
                      color="gray"
                      aria-label="Terv címének szerkesztése"
                      onClick={() => startEditLabel(plan.dirName, label)}
                    >
                      <Pencil1Icon />
                    </IconButton>
                  </>
                )}
              </Flex>
              {!isEditing && !lancNyitva && (
                <Text
                  size="2"
                  weight="medium"
                  style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right', minWidth: '7rem' }}
                >
                  {formatMoney(
                    chainTotal?.fizetendo ?? null,
                    chainTotal?.penznem ?? 'HUF',
                    chainTotal?.nyelv ?? 'hu',
                  )}
                </Text>
              )}
            </Flex>
            {isEditing && (
              <Text as="p" size="1" color="gray" mt="0" mb="2">
                Üresen mentve visszaáll az automatikus javaslatra.
              </Text>
            )}
            {labelError?.planDir === plan.dirName && (
              <Callout.Root color="red" size="1" mb="2">
                <Callout.Icon>
                  <CrossCircledIcon />
                </Callout.Icon>
                <Callout.Text>{labelError.message}</Callout.Text>
              </Callout.Root>
            )}

            {/* Feltételes render, NEM CSS-rejtés (docs/07-felulet-rendszer.md
                "Billentyűzet") -- csukott lánc `⋯` gombjai kiesnek a
                Tab-sorrendből, nem csak vizuálisan tűnnek el. Ismert,
                docs-szentesített kompromisszum: csukott állapotban az
                `aria-controls` fenti nem létező id-re mutat -- ugyanez volt
                igaz a korábbi page-szintű togglenál is. */}
            {lancNyitva && (
              <Box id={controlsId}>
                {versions
                  .slice()
                  .reverse()
                  .map((v, vi) => {
                    const ref: VersionRef = { planDir: plan.dirName, versionDir: v.dirName };
                    const total = totalsByVersion[versionDataKey(plan.dirName, v.dirName)];
                    const versionPlan = plansByVersion[versionDataKey(plan.dirName, v.dirName)];
                    // D53: "Új verzió" kizárólag a lánc legfrissebb
                    // verziósorán engedett -- egy historical sorról indítva a
                    // doki tévesen azt hihetné, hogy a régi verziót
                    // folytatja, valójában egy új "fejet" hozna létre a
                    // láncon, ami a lánc-rendezésben megelőzné a tényleges
                    // legfrissebb verziót.
                    const isLegfrissebb = v.dirName === legfrissebb?.dirName;
                    // "Legutóbbi" badge (46. tétel, 4. döntés): csak 2+
                    // verziós láncon -- egyverziós láncon funkciótlan dísz
                    // lenne (docs/07 tiltja).
                    const legutobbi = versions.length > 1 && isLegfrissebb;
                    return (
                      <Box key={v.dirName}>
                        {vi > 0 && <Separator size="4" />}
                        <Flex justify="between" align="center" py="2">
                          <Flex align="center" gap="2">
                            <Text size="2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              v{v.verzio} · {v.isoDate}
                            </Text>
                            {legutobbi && (
                              <Badge color="gray" variant="soft" size="1">
                                Legutóbbi
                              </Badge>
                            )}
                            {versionPlan?.csakAjanlat === true && (
                              <Badge color="gray" variant="soft" size="1">
                                Csak ajánlat
                              </Badge>
                            )}
                          </Flex>
                          <Flex align="center" gap="4">
                            {/* A verzió végösszege (osszesitok.fizetendo) a saját
                                terv.json-jából, a saját pénznemében -- külön, jobbra
                                igazított elem, nem a bal oldali szöveghez fűzve
                                (docs/07-felulet-rendszer.md: pénzérték jobbra,
                                tabular-nums). Olvashatatlan verziónál "—". */}
                            <Text
                              size="2"
                              weight="medium"
                              style={{
                                fontVariantNumeric: 'tabular-nums',
                                textAlign: 'right',
                                minWidth: '7rem',
                              }}
                            >
                              {formatMoney(
                                total?.fizetendo ?? null,
                                total?.penznem ?? 'HUF',
                                total?.nyelv ?? 'hu',
                              )}
                            </Text>
                            {/* D58 (50. tétel): a legfrissebb soron két látható gomb --
                                elsődleges "Új verzió", másodlagos "Megnézés" (docs/07
                                "legfeljebb két látható gomb egy adatsoron"). Egy
                                historical soron NINCS látható gomb, csak a `⋯` --
                                onnan induló módosítás helyes útja a "Másolás új
                                tervbe" (D53). */}
                            {isLegfrissebb && (
                              <Flex align="center" gap="2">
                                <Button size="1" onClick={() => akciok.inditas({ kind: 'open', ...ref })}>
                                  Új verzió
                                </Button>
                                <Button
                                  size="1"
                                  variant="soft"
                                  color="gray"
                                  onClick={() => navigate(tervReszleteiUtvonal(patient.dirName, ref))}
                                >
                                  Megnézés
                                </Button>
                              </Flex>
                            )}
                            <DropdownMenu.Root>
                              <DropdownMenu.Trigger>
                                {/* Az aria-label a terv-címkével ÉS a verziószámmal
                                    képzett: csupasz "v1 — további műveletek" két
                                    különböző terv-lánc esetén (mindkettő saját v1-gyel
                                    indul, D29) ütközne -- a képernyőolvasó (és a teszt)
                                    nem tudná megkülönböztetni őket. */}
                                <IconButton
                                  size="1"
                                  variant="soft"
                                  color="gray"
                                  aria-label={`${label} — v${v.verzio} — további műveletek`}
                                >
                                  <DotsHorizontalIcon />
                                </IconButton>
                              </DropdownMenu.Trigger>
                              {/* onCloseAutoFocus: a menü záráskor visszavenné a
                                  fókuszt a triggerre, és ezzel elhalászná azt a
                                  piszkozat-őr AlertDialog-ja elől, ami ugyanabban a
                                  tickben nyílik (akciok.inditas), VAGY a "Ugrás a
                                  legfrissebb verzióra" görgetés utáni saját
                                  fókuszkezelést venné el (ugrasLegfrissebbre). Ne
                                  cseréld setTimeout-os késleltetésre. */}
                              <DropdownMenu.Content size="1" onCloseAutoFocus={(e) => e.preventDefault()}>
                                {/* Megnézés a legfrissebb soron már látható gombként
                                    létezik (fent) -- itt csak historical soron
                                    jelenik meg, hogy ne duplikálódjon. Az "Új verzió"
                                    SOHA nem menüpont többé, csak látható gomb a
                                    legfrissebb soron. */}
                                {!isLegfrissebb && (
                                  <DropdownMenu.Item
                                    onSelect={() => navigate(tervReszleteiUtvonal(patient.dirName, ref))}
                                  >
                                    Megnézés
                                  </DropdownMenu.Item>
                                )}
                                <DropdownMenu.Item onSelect={() => downloadVersion(ref, plan.tervId)}>
                                  Letöltés
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator />
                                <DropdownMenu.Item
                                  onSelect={() =>
                                    akciok.inditas({ kind: 'copy', ...ref, historical: !isLegfrissebb })
                                  }
                                >
                                  Másolás új tervbe
                                </DropdownMenu.Item>
                                {!isLegfrissebb && (
                                  <DropdownMenu.Item onSelect={() => ugrasLegfrissebbre(plan.dirName)}>
                                    Ugrás a legfrissebb verzióra
                                  </DropdownMenu.Item>
                                )}
                              </DropdownMenu.Content>
                            </DropdownMenu.Root>
                          </Flex>
                        </Flex>
                        {akciok.hiba?.planDir === plan.dirName && akciok.hiba.versionDir === v.dirName && (
                          <VerzioAkcioUzenet hiba={akciok.hiba} />
                        )}
                      </Box>
                    );
                  })}
              </Box>
            )}
            {planIdx < rendezett.length - 1 && <Separator size="4" mt="2" mb="1" />}
          </Box>
        );
      })}

      <PlanVersionActionDialog akciok={akciok} />
    </Box>
  );
}

/**
 * Az aktív, mentetlen piszkozat blokkja a láncok FÖLÖTT (46. tétel, 6.
 * döntés) -- tétel-/fázisszám és előlegösszeg nélkül (D247/D248), üres
 * (sor nélküli) piszkozatnál `osszeg: null` (D246). A `Card` egésze
 * kattintható (a `PatientTableRow.tsx` `closest('a')`-mintájának
 * `closest('button')`-párja, hogy a "Folytatás" gomb kattintása ne
 * duplikálja a navigációt), PLUSZ egy külön "Folytatás" gomb (D244) -- ez
 * utóbbi az elsődleges billentyűzetes út. NEM megy át a `runOrConfirm`
 * piszkozat-felülírás-őrön: a SAJÁT draft folytatása nem "felülírás".
 */
function AktivDraftBlokk({
  kontextus,
  paciensNev,
  lepesFelirat,
  mentve,
  osszeg,
  onFolytatas,
}: {
  kontextus: string;
  paciensNev: string;
  lepesFelirat: string | null;
  mentve: string | null;
  osszeg: { ertek: number; penznem: Plan['penznem']; nyelv: Plan['nyelv'] } | null;
  onFolytatas: () => void;
}) {
  return (
    <Card
      size="2"
      mb="3"
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onFolytatas();
      }}
    >
      <Flex align="center" gap="1" wrap="wrap" mb="1">
        <Text as="p" size="2" weight="bold" style={{ color: t.brand }}>
          {kontextus}
        </Text>
      </Flex>
      {paciensNev && (
        <Text as="p" size="2" mt="0" mb="1">
          {paciensNev}
        </Text>
      )}
      {lepesFelirat && (
        <Text as="p" size="1" color="gray" mt="0" mb="0">
          {lepesFelirat}
        </Text>
      )}
      {mentve && (
        <Text as="p" size="1" color="gray" mt="0" mb="1">
          Utolsó módosítás: {formatPiszkozatIdo(mentve)}
        </Text>
      )}
      {osszeg && (
        <Text
          as="p"
          size="2"
          weight="medium"
          mt="1"
          mb="2"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {formatMoney(osszeg.ertek, osszeg.penznem, osszeg.nyelv)}
        </Text>
      )}
      <Button size="1" mt="1" onClick={onFolytatas}>
        Folytatás
      </Button>
    </Card>
  );
}
