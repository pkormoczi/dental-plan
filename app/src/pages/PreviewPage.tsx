// Előnézet és véglegesítés -- portolva ui/PrintPreview.jsx-ből, valódi
// @react-pdf/renderer kimenetre kötve (nem HTML előnézet). Lásd
// docs/03-funkcionalis-spec.md "4. Előnézet és véglegesítés".

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePDF } from '@react-pdf/renderer';
import { AlertDialog, Box, Button, Callout, Checkbox, Flex, Skeleton, Text } from '@radix-ui/themes';
import { t } from '../design/tokens';
import { buildToothChartSvg } from '../design/toothChartSvg';
import { formatMoney } from '../domain/money';
import { aktivOrvosok } from '../domain/orvosok';
import { paciensTorzsadatbol } from '../domain/paciensAdatok';
import { isPlaceholderTemplate } from '../domain/templates';
import { computeOsszesitok } from '../domain/totals';
import { buildToothVisualStates } from '../domain/toothVisual';
import { feloldPatientDir } from '../domain/torzsadatBetoltes';
import type { Paciens, PlanRef } from '../domain/types';
import {
  kovetkezoLepes,
  veglegesitesDiagnozis,
  VEGLEGESITES_LEPESEK,
  type VeglegesitesLepes,
} from '../domain/veglegesitesOr';
import { TervDocument } from '../pdf/TervDocument';
import { renderToothChartPng } from '../pdf/toothChartImage';
import { useAppState } from '../state/AppState';
import { buildDownloadFileName } from '../storage/paths';
import { useStorage } from '../storage/StorageContext';

// `attemptFinalize` a lánc elején kezdi, `confirmStepContinue` a JELENLEGI
// lépés utáni első alkalmazható lépésre ugrik (lásd lent) -- a lánc maga
// (sorrend, kemény/puha megkülönböztetés) a `domain/veglegesitesOr.ts`-ben
// él, tiszta függvényként.
type ConfirmStep = VeglegesitesLepes | null;

/** Egy névlista szöveges blokkja a "Hiányzó/eltérő tételnevek" dialógushoz, üres listánál `''`. */
function nevListaSzoveg(cim: string, nevek: string[]): string {
  if (nevek.length === 0) return '';
  return (
    `${cim} (${nevek.length}):\n${nevek.slice(0, 8).join('\n')}` +
    (nevek.length > 8 ? `\n… és további ${nevek.length - 8}` : '')
  );
}

export default function PreviewPage() {
  const { plan, settings, priceList, markPlanSaved, piszkozatPatientDir, piszkozatTervCim } =
    useAppState();
  const { storage, loadLatestTemplateByBase } = useStorage();
  const navigate = useNavigate();

  const [offerOnly, setOfferOnly] = useState(false);
  const [nyilatkozatMd, setNyilatkozatMd] = useState('');
  // A ténylegesen megjelenített nyilatkozat-verzió fájlneve (kiterjesztés
  // nélkül) -- ez pinnelődik a `finalPlan.sablonVerzio`-jába véglegesítéskor
  // (lásd doFinalize), hogy a doki mindig a most LÁTOTT szöveget írassa alá,
  // ne egy korábban rögzített, esetleg már felülírt verziót. Alapértéknek a
  // terv jelenlegi pinnelt verziója -- ha a betöltés hibázna, ez marad.
  const [nyilatkozatVerzio, setNyilatkozatVerzio] = useState(plan.sablonVerzio);
  const [fizetesiFeltetelekMd, setFizetesiFeltetelekMd] = useState('');
  const [garanciaMd, setGaranciaMd] = useState('');
  const [sablonFallback, setSablonFallback] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedRef, setSavedRef] = useState<PlanRef | null>(null);
  // backlog-51 (D61): a vadonatúj lánc "Terv adatai" lapon beírt címének
  // véglegesítéskori írási hibája -- KÜLÖN a `saveError`-tól, mert ekkor a
  // terv MÁR a lemezen van (lásd doFinalize). Csak a siker-képernyőn
  // jelenik meg, amber színnel, nem piros hibaként.
  const [cimkeHiba, setCimkeHiba] = useState<string | null>(null);
  const [nameMissingNotice, setNameMissingNotice] = useState(false);
  const [orvosNotice, setOrvosNotice] = useState(false);
  const [uresSorokNotice, setUresSorokNotice] = useState(false);
  const [elolegTullepNotice, setElolegTullepNotice] = useState(false);
  // A webbel megegyező forrásból (design/toothChartSvg) canvason renderelt
  // fogtérkép-PNG a nyomtatványhoz -- lásd pdf/toothChartImage.ts. `null`,
  // amíg el nem készül, vagy ha a rajzolás meghiúsul (pl. jsdom teszt) --
  // ilyenkor a TervDocument a fogtérkép-blokkot egyszerűen kihagyja.
  const [toothChartPng, setToothChartPng] = useState<string | null>(null);
  // A confirm()-lánc (hiányzó adatok -> hiányzó német nevek) Radix
  // AlertDialogként: legfeljebb egy van nyitva egyszerre, a lépés neve
  // dönti el, melyik szöveg/cím jelenjen meg.
  const [confirmStep, setConfirmStep] = useState<ConfirmStep>(null);
  // P0-1: dupla kattintás elleni in-flight védelem -- a `saving` state
  // önmagában nem elég, mert egy második kattintás a state frissülése
  // (render) ELŐTT is megtörténhet.
  const savingRef = useRef(false);

  // backlog-40 (6. döntés, D162/D163): a páciens törzsadata (D33) INFO-
  // szintű, nem blokkoló jelzésként jelenik meg, ha eltér a terv `paciens`
  // pillanatképétől -- a `patientDirForMaster` a `doFinalize()` mastert
  // ÚJRAOLVasó lépéséhez is kell (D163), nem csak a mount-időbeli
  // betöltéshez.
  const [masterPaciens, setMasterPaciens] = useState<Paciens | null>(null);
  const [patientDirForMaster, setPatientDirForMaster] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const dir = await feloldPatientDir(storage, piszkozatPatientDir, plan.paciensId);
      if (cancelled) return;
      setPatientDirForMaster(dir);
      if (!dir) {
        setMasterPaciens(null);
        return;
      }
      try {
        const data = await storage.loadPatientData(dir);
        if (!cancelled) setMasterPaciens(data ? paciensTorzsadatbol(data) : null);
      } catch {
        // Best-effort, D162: egy sikertelen betöltés csak az info-sort
        // némítja el, a véglegesítést nem akadályozza.
        if (!cancelled) setMasterPaciens(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // A `plan.paciens` (a draft mezői) szándékosan NEM dependency -- csak az
    // azonosító (patientDir/paciensId) változása indokol újratöltést.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storage, piszkozatPatientDir, plan.paciensId]);

  useEffect(() => {
    let cancelled = false;

    // Mindhárom sablon a LEGFRISSEBB verzióban jelenik meg -- a nyilatkozat
    // verzióját csak véglegesítéskor pinneljük (lásd doFinalize), hogy a
    // doki a Beállításokban időközben mentett pontosítás után is a most
    // látott szöveget írassa alá, ne egy korábbi állapotot. Ha a tervhez
    // tartozó nyelven nincs sablon (pl. régi localStorage-ban a német
    // bevezetése előtt keletkezett), a magyar szövegre esünk vissza --
    // soha nem üres nyilatkozattal/hibával fut le a PDF. Ezt a
    // `sablonFallback`-en keresztül jelezzük is (lásd a sárga sávot lent).
    async function loadOrFallback(
      load: () => Promise<{ name: string; body: string }>,
      fallback: () => Promise<{ name: string; body: string }>,
      // A fizetési feltételek ÉS a garancia hívja ezzel (a nyilatkozat nem)
      // -- egy sikeresen betöltött, de még placeholder törzsű sablon
      // ugyanabba a fallback-ágba esik, mint a ténylegesen hiányzó fájl
      // (lásd docs/03-funkcionalis-spec.md § Sablon-placeholder őr). A
      // nyilatkozat placeholder-esetét EZ nem kezeli -- azt a kemény zár
      // váltja ki (lásd nyilatkozatIsPlaceholder lent), nem egy HU-visszaesés.
      extraFallbackCondition?: (result: { name: string; body: string }) => boolean,
    ) {
      try {
        const result = await load();
        if (extraFallbackCondition?.(result)) {
          return { ...(await fallback()), fellback: true };
        }
        return { ...result, fellback: false };
      } catch (err) {
        // P1-8 (05-hibakezeles #9): csak a VÁRT "nincs ilyen sablon" hibát
        // nyeljük el -- minden mást (pl. egy jövőbeli sérült bejegyzés)
        // továbbdobunk, hogy ne tűnjön el némán.
        if (err instanceof Error && err.message.startsWith('Nincs ')) {
          return { ...(await fallback()), fellback: true };
        }
        throw err;
      }
    }

    (async () => {
      try {
        const [nyil, fiz, gar] = await Promise.all([
          loadOrFallback(
            () => loadLatestTemplateByBase(`nyilatkozat-${plan.nyelv}`),
            () => loadLatestTemplateByBase('nyilatkozat-hu'),
          ),
          loadOrFallback(
            () => loadLatestTemplateByBase(`fizetesi-feltetelek-${plan.nyelv}`),
            () => loadLatestTemplateByBase('fizetesi-feltetelek-hu'),
            // Magyar tervnél a fallback maga a magyar szöveg lenne --
            // önmagára visszaesni félrevezető "sablonFallback" jelzést adna.
            plan.nyelv !== 'hu' ? (result) => isPlaceholderTemplate(result.body) : undefined,
          ),
          loadOrFallback(
            () => loadLatestTemplateByBase(`garancia-${plan.nyelv}`),
            () => loadLatestTemplateByBase('garancia-hu'),
            // Ugyanaz a minta, mint a fizetési feltételeknél -- a garancia
            // sosem kap kemény zárat (docs/03-funkcionalis-spec.md §
            // Sablon-placeholder őr), csak HU-visszaesést.
            plan.nyelv !== 'hu' ? (result) => isPlaceholderTemplate(result.body) : undefined,
          ),
        ]);
        if (!cancelled) {
          setNyilatkozatMd(nyil.body);
          setNyilatkozatVerzio(nyil.name.replace(/\.md$/, ''));
          setFizetesiFeltetelekMd(fiz.body);
          setGaranciaMd(gar.body);
          setSablonFallback(nyil.fellback || fiz.fellback || gar.fellback);
          setTemplateError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setTemplateError(
            err instanceof Error ? err.message : 'A sablonok betöltése váratlanul meghiúsult.',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plan.nyelv, loadLatestTemplateByBase]);

  useEffect(() => {
    let cancelled = false;
    const fogterkep = buildToothVisualStates(plan, priceList);
    if (fogterkep.fogak.size === 0 && fogterkep.tejfogak.length === 0) {
      setToothChartPng(null);
      return;
    }
    const svg = buildToothChartSvg(fogterkep, { sizing: 'fixed' });
    renderToothChartPng(svg).then((png) => {
      if (!cancelled) setToothChartPng(png);
    });
    return () => {
      cancelled = true;
    };
  }, [plan, priceList]);

  // Ha a MEGJELENÍTETT nyilatkozat placeholder (jogilag még nincs lezárva),
  // a 4. oldal (nyilatkozat + aláírás) garantáltan kimarad -- a doki nem
  // kapcsolhatja vissza, amíg a szöveg placeholder marad (D23, lásd
  // docs/03-funkcionalis-spec.md § Sablon-placeholder őr). A nyers
  // `offerOnly` state-et mindenhol ez az effektív érték váltja fel.
  const nyilatkozatIsPlaceholder = isPlaceholderTemplate(nyilatkozatMd);
  const effectiveOfferOnly = offerOnly || nyilatkozatIsPlaceholder;

  const tervDocument = (
    <TervDocument
      plan={plan}
      settings={settings}
      priceList={priceList}
      offerOnly={effectiveOfferOnly}
      nyilatkozatMd={nyilatkozatMd}
      fizetesiFeltetelekMd={fizetesiFeltetelekMd}
      garanciaMd={garanciaMd}
      toothChartPng={toothChartPng}
    />
  );
  const [pdfInstance, updatePdf] = usePDF({ document: tervDocument });

  // usePDF() saját belső effektje csak a MOUNT pillanatában lévő
  // `document`-et rendereli (a @react-pdf/renderer forrásában [] a
  // dependency array) -- utána a hívónak KELL az `update` függvénnyel
  // újragenerálnia, különben a nyilatkozat/fizetési feltételek/garancia
  // (amik a fenti useEffect-ben, a mount UTÁN töltődnek be) sosem kerülnek
  // bele, és a "Csak ajánlat" kapcsoló sem hat a letöltött PDF-re. Ugyanez a
  // minta, mint a könyvtár saját `PDFViewer` komponensében.
  useEffect(() => {
    updatePdf(tervDocument);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    plan,
    settings,
    effectiveOfferOnly,
    nyilatkozatMd,
    fizetesiFeltetelekMd,
    garanciaMd,
    toothChartPng,
    updatePdf,
  ]);

  const {
    nameMissing,
    uresSorok,
    elolegTullep,
    nevProblemak: { nincsForditas, elterAzArlistatol, egyedi },
    nullaSorok,
    hianyzoLeirasok,
    masterElteresek,
    orvosProblema,
    arElteresek,
    alkalmazhato,
  } = veglegesitesDiagnozis(
    plan,
    priceList,
    plan.leirasokMutatasa ?? true,
    masterPaciens,
    aktivOrvosok(settings),
  );

  /**
   * A `confirmStep`-dialógus cím/leírás szövege -- öt lépésnél a korábbi,
   * egymásba ágyazott ternár-lánc olvashatatlanná vált volna. `null` lépésnél
   * (dialógus zárva) a `price-drift` szöveg ágára esik, ez sosem látszik.
   */
  function confirmStepTartalom(step: ConfirmStep): { cim: string; leiras: string } {
    if (step === 'missing-fields') {
      return {
        cim: 'Hiányzó páciensadatok',
        leiras:
          'Néhány páciensadat hiányzik (nem kötelező, de a nyomtatványon üresen marad). Folytatod a véglegesítést?',
      };
    }
    if (step === 'de-fallback-names') {
      return {
        cim: 'Tételnevek nem németül',
        leiras:
          'Ez egy német nyelvű ajánlat, de néhány sor neve nem németül kerül a nyomtatványra.\n\n' +
          [
            nevListaSzoveg('Nincs német nevük az árlistában', nincsForditas),
            nevListaSzoveg('Kézzel átírt, eltér az árlistától', elterAzArlistatol),
            nevListaSzoveg('Egyedi, szabad szöveges sor — a nyelvét te írtad', egyedi),
          ]
            .filter(Boolean)
            .join('\n\n') +
          '\n\nA páciens ezt a dokumentumot írja alá. Folytatod a véglegesítést?',
      };
    }
    if (step === 'zero-price-rows') {
      const nullaOsszeg = formatMoney(0, plan.penznem, plan.nyelv);
      // A toldalék pénznemenként eltér ("Ft" -> "-os", "€" -> "-s") -- a
      // cím a terv pénznemét követi, hogy EUR-ban árazott tervnél ne "0
      // Ft-os" felirat jelenjen meg (backlog-19).
      const toldalek = plan.penznem === 'EUR' ? '-s' : '-os';
      return {
        cim: `${nullaOsszeg}${toldalek} tételek`,
        leiras:
          `A következő, névvel ellátott sorok ${nullaOsszeg} értékkel szerepelnek a tervben. ` +
          'Ha ez szándékos (pl. ingyenes kontroll), folytathatod a véglegesítést.\n\n' +
          nevListaSzoveg('Érintett sorok', nullaSorok),
      };
    }
    if (step === 'missing-leiras') {
      return {
        cim: 'Hiányzó tétel-leírások',
        leiras:
          'Néhány csomagtételre hivatkozó soron nincs leírás -- a páciens nem fogja tudni ' +
          'otthon visszaolvasni, mi van benne.\n\n' +
          nevListaSzoveg(
            'Nincs leírás',
            hianyzoLeirasok.map((h) => h.nev),
          ) +
          '\n\nFolytatod a véglegesítést leírás nélkül?',
      };
    }
    return {
      cim: 'Eltérés az árlistától',
      leiras:
        'Néhány sor ára eltér a mai árlistától -- ez lehet szándékos kedvezmény/felár, vagy ' +
        'egy azóta megváltozott árlistai ár, amit még nem frissítettél a sorban.\n\n' +
        [
          nevListaSzoveg('Elavult árlistai pillanatkép', arElteresek.elavult),
          nevListaSzoveg('Kézzel felülírt ajánlati ár', arElteresek.keziAr),
        ]
          .filter(Boolean)
          .join('\n\n') +
        '\n\nFolytatod a véglegesítést?',
    };
  }

  async function doFinalize() {
    if (!pdfInstance.blob) return;

    // Csak vadonatúj lánchoz -- egy már mentett lánc címét a "Terv adatai"
    // lap `TervCimField`-jének "Mentés" gombja azonnal kiírta. A closure itt,
    // a `markPlanSaved` (ami a `piszkozatMeta`-t, benne a `tervCim`-et is
    // nullázza) ELŐTT rögzíti az értéket.
    const ujLancCim = plan.tervId === '' ? (piszkozatTervCim ?? '').trim() : '';

    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    setCimkeHiba(null);
    try {
      // D163: a mastert véglegesítéskor újraolvassuk -- csak az info-sáv
      // frissítéséhez (D162, a `finalPlan.paciens` ettől függetlenül a
      // draft pillanatképe marad, D7). Best-effort, nem blokkolhatja a
      // mentést.
      if (patientDirForMaster) {
        try {
          const fresh = await storage.loadPatientData(patientDirForMaster);
          setMasterPaciens(fresh ? paciensTorzsadatbol(fresh) : null);
        } catch {
          // lásd fent
        }
      }
      const finalPlan = {
        ...plan,
        statusz: 'VEGLEGES' as const,
        // A most az előnézetben LÁTOTT (legfrissebb) nyilatkozat-verzió
        // pinnelődik -- lásd a fenti useEffect kommentjét.
        sablonVerzio: nyilatkozatVerzio,
        osszesitok: computeOsszesitok(plan.fazisok, plan.kedvezmenyOsszeg),
      };
      const bytes = new Uint8Array(await pdfInstance.blob.arrayBuffer());
      const ref = await storage.savePlan(finalPlan, bytes);
      const persisted = await storage.loadPlan(ref); // tervId/verzio a storage tölti ki (D4)
      if (ujLancCim) {
        // KÜLÖN try/catch, NEM a közös hibazónában: a terv ekkor MÁR a
        // lemezen van, egy itteni hiba nem jelentheti a dokinak, hogy "a
        // mentés nem sikerült" -- az újrapróbálás fölösleges v2
        // verziómappát hozna létre (D4). A cím a Korábbi tervek ceruza-
        // ikonjával pótolható, lásd a siker-képernyő amber Callout-ját.
        try {
          await storage.savePlanLabel(ref.patientDir, ref.planDir, ujLancCim);
        } catch (err) {
          setCimkeHiba(
            err instanceof Error
              ? `A terv címe nem mentődött: ${err.message}`
              : 'A terv címe váratlanul nem mentődött.',
          );
        }
      }
      // docs/03-funkcionalis-spec.md véglegesítés-lánc 4. lépése: a
      // piszkozat törlése -- enélkül a lenti setPlan azonnal visszaírná
      // piszkozatként a most fájlba mentett tervet (markPlanSaved a
      // "mentett" referenciát is frissíti, lásd AppState.tsx).
      await markPlanSaved(persisted);
      setSavedRef(ref);
    } catch (err) {
      // P0-1: korábban nem volt catch itt -- egy kvótahiba vagy a
      // localStorage szinkron dobása némán elveszett, a doki egy inaktív
      // gombot látott, a terv pedig nem mentődött (D4-et sértő, csonka
      // állapot nélkül, de a doki tudta nélkül).
      setSaveError(
        err instanceof Error
          ? err.message
          : 'A mentés váratlanul meghiúsult, próbáld meg újra.',
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function attemptFinalize() {
    if (savingRef.current) return;

    // Csak a név kötelező (a mappanévhez), a többi hiánya csak figyelmeztet,
    // nem blokkol -- docs/03-funkcionalis-spec.md "2. Terv adatai".
    if (nameMissing) {
      setNameMissingNotice(true);
      return;
    }
    setNameMissingNotice(false);
    // D68: hiányzó/nem aktív kezelőorvos -- KEMÉNY blokk, a `nameMissing`
    // mintáján, a nyelvi/jogi tartalmi hiba (uresSorok) ELŐTT, mert
    // ugyanúgy egy kattintással (Terv adatai lap) javítható.
    if (orvosProblema) {
      setOrvosNotice(true);
      return;
    }
    setOrvosNotice(false);
    if (uresSorok.length > 0) {
      setUresSorokNotice(true);
      return;
    }
    setUresSorokNotice(false);
    if (elolegTullep) {
      setElolegTullepNotice(true);
      return;
    }
    setElolegTullepNotice(false);
    const step = kovetkezoLepes(alkalmazhato, 0);
    if (step) {
      setConfirmStep(step);
      return;
    }
    void doFinalize();
  }

  function confirmStepContinue() {
    // A jelenlegi lépés UTÁN a láncban a következő ALKALMAZHATÓ dialógus
    // nyílik meg (ha van), nem a mentés fut le rögtön.
    const idx = confirmStep ? VEGLEGESITES_LEPESEK.indexOf(confirmStep) : -1;
    const step = kovetkezoLepes(alkalmazhato, idx + 1);
    if (step) {
      setConfirmStep(step);
      return;
    }
    setConfirmStep(null);
    void doFinalize();
  }

  function startNewPlan() {
    // A piszkozat itt már úgyis üres/mentett (a véglegesítés törölte, lásd
    // doFinalize) -- az /uj-terv köztes lépés (D29) mégis a szokásos utat
    // futtatja, hogy a Home gombjával egységes maradjon.
    navigate('/uj-terv');
  }

  if (savedRef) {
    return (
      <Box style={{ maxWidth: 640, margin: '40px auto', textAlign: 'center' }}>
        <Text as="p" size="4" style={{ color: t.ok }} mb="2">
          A terv elmentve ✓
        </Text>
        <Text as="p" size="2" color="gray" mb="5" style={{ fontFamily: t.mono }}>
          {savedRef.patientDir} / {savedRef.planDir} / {savedRef.versionDir}
        </Text>
        {cimkeHiba && (
          <Callout.Root color="amber" mb="5" style={{ textAlign: 'left' }}>
            <Callout.Text>
              {cimkeHiba} A terv mentése ettől függetlenül sikeres volt -- a cím a Korábbi
              tervek listáján, a ceruza-ikonnal pótolható.
            </Callout.Text>
          </Callout.Root>
        )}
        <Flex gap="3" justify="center">
          <Button onClick={startNewPlan}>Új terv indítása</Button>
          {/* backlog-31, D36: a MOST mentett páciens részletoldalára visz
              (Kezelési tervek tab), nem a globális listára -- a globális,
              több-pácienses áttekintő a DEMO oldal "Összes terv" fülén él
              (D54), másodlagos a napi munkához képest. */}
          <Button
            variant="soft"
            color="gray"
            onClick={() => navigate(`/paciensek/${encodeURIComponent(savedRef.patientDir)}`)}
          >
            Korábbi tervek
          </Button>
        </Flex>
      </Box>
    );
  }

  // P0-3: a PDF frissítés alatt (offerOnly váltás, sablonbetöltés stb.) a
  // "Letöltés" korábban a MÉG a régi, teljes (nyilatkozat+aláírás oldalas)
  // PDF-et adta, ugyanazzal a fájlnévvel -- utólag megkülönböztethetetlenül.
  const pdfStale = pdfInstance.loading;
  // P1-8: a `usePDF().error`-t korábban senki nem olvasta -- render-hiba
  // esetén a gomb élőnek látszott, kattintásra némán nem történt semmi.
  const pdfError = pdfInstance.error;
  const busy = saving || pdfStale;
  const { cim: confirmCim, leiras: confirmLeiras } = confirmStepTartalom(confirmStep);

  return (
    <Box style={{ maxWidth: 900, margin: '0 auto' }}>
      {templateError && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>A sablonok betöltése meghiúsult: {templateError}</Callout.Text>
        </Callout.Root>
      )}
      {nyilatkozatIsPlaceholder && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>
            A nyilatkozat szövege ezen a nyelven még jogi lektorálásra vár (helykitöltő szöveg) —
            emiatt a nyilatkozat és aláírás oldal nem kerülhet a nyomtatványra, a „Csak ajánlat”
            mód kényszerítve van. A Beállítások → Nyomtatványok alatt oldható fel, a
            szöveg lektorálása után.
          </Callout.Text>
        </Callout.Root>
      )}
      {sablonFallback && (
        <Callout.Root color="amber" mb="3">
          <Callout.Text>
            A tervhez tartozó sablon nem érhető el a megfelelő nyelven (hiányzik, vagy még jogi
            lektorálásra vár) — helyette a magyar szöveg jelenik meg a nyomtatványon.
          </Callout.Text>
        </Callout.Root>
      )}
      {pdfError && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>
            A PDF előállítása hibába futott: {pdfError || 'ismeretlen hiba'}. A véglegesítés emiatt
            le van tiltva.
          </Callout.Text>
        </Callout.Root>
      )}
      {saveError && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>A mentés nem sikerült: {saveError}</Callout.Text>
        </Callout.Root>
      )}
      {nameMissingNotice && nameMissing && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>A páciens neve kötelező a véglegesítéshez.</Callout.Text>
        </Callout.Root>
      )}
      {orvosNotice && orvosProblema && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>
            {orvosProblema === 'hianyzik'
              ? 'A tervhez nincs kezelőorvos rendelve. A nyomtatvány aláírás-blokkja nem maradhat kitöltetlenül.'
              : `A terv kezelőorvosa (${plan.orvos}) már nem szerepel az aktív orvosok között. Válassz aktív kezelőorvost, vagy aktiváld őt újra a Beállításokban.`}
          </Callout.Text>
          <Flex mt="2">
            <Button variant="soft" color="gray" onClick={() => navigate('/paciens')}>
              Kezelőorvos kiválasztása
            </Button>
          </Flex>
        </Callout.Root>
      )}
      {uresSorokNotice && uresSorok.length > 0 && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>
            A terv {uresSorok.length} kitöltetlen sort tartalmaz (nincs megnevezve a
            beavatkozás):{' '}
            {uresSorok
              .map((s) => `${s.fazisNev} — ${s.fogak.trim() || 'nincs fogszám megadva'}`)
              .join('; ')}
            . Válassz tételt a keresőben, vagy írd be egyedi néven a szerkesztőben, vagy
            töröld a sort.
          </Callout.Text>
          <Flex mt="2">
            <Button variant="soft" color="gray" onClick={() => navigate('/terv')}>
              Vissza a szerkesztőbe
            </Button>
          </Flex>
        </Callout.Root>
      )}
      {elolegTullepNotice && elolegTullep && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>
            Az előleg összege nagyobb, mint a fizetendő -- ez sortörlés/módosítás után is
            előfordulhat. Az előleg értéke megmaradt, rendezd a szerkesztőben, mielőtt
            véglegesítenéd a tervet.
          </Callout.Text>
          <Flex mt="2">
            <Button variant="soft" color="gray" onClick={() => navigate('/terv')}>
              Vissza a szerkesztőbe
            </Button>
          </Flex>
        </Callout.Root>
      )}
      {/* backlog-40 (6. döntés, D162): INFO-szintű, NEM blokkoló jelzés --
          a véglegesítés önmagában nem kényszerít szinkronizálást (D9/D33). */}
      {masterElteresek.length > 0 && (
        <Callout.Root color="gray" mb="3">
          <Callout.Text>
            A páciens törzsadata {masterElteresek.length} mezőben eltér a terv adataitól (
            {masterElteresek.map((m) => m.cimke).join(', ')}).
          </Callout.Text>
          <Flex mt="2">
            <Button variant="soft" color="gray" onClick={() => navigate('/paciens')}>
              Terv adatai
            </Button>
          </Flex>
        </Callout.Root>
      )}

      <Flex justify="between" align="center" mb="4" wrap="wrap" gap="3">
        <Text as="label" size="2" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Checkbox
            checked={effectiveOfferOnly}
            disabled={nyilatkozatIsPlaceholder}
            onCheckedChange={(checked) => setOfferOnly(checked === true)}
          />
          Csak ajánlat — a nyilatkozat és aláírás oldal nélkül
        </Text>
        <Flex gap="3">
          {pdfInstance.url &&
            (pdfStale ? (
              <Button variant="soft" color="gray" disabled>
                PDF frissítése…
              </Button>
            ) : (
              <Button asChild variant="soft" color="gray">
                <a
                  href={pdfInstance.url}
                  download={buildDownloadFileName(plan.paciens.nev, {
                    tervId: plan.tervId || 'uj',
                    isDraft: plan.statusz !== 'VEGLEGES',
                    suffix: effectiveOfferOnly ? 'ajanlat' : undefined,
                  })}
                >
                  Letöltés
                </a>
              </Button>
            ))}
          <Button onClick={attemptFinalize} disabled={busy || !!pdfError}>
            {saving ? 'Mentés…' : 'Véglegesítés és mentés'}
          </Button>
        </Flex>
      </Flex>

      {pdfInstance.url ? (
        <iframe
          title="Kezelési terv előnézet"
          src={pdfInstance.url}
          style={{
            width: '100%',
            height: '80vh',
            border: `1px solid ${t.uiLine}`,
            borderRadius: t.radiusLg,
            opacity: pdfStale ? 0.5 : 1,
          }}
        />
      ) : (
        // docs/07-felulet-rendszer.md: skeleton a végleges elrendezés
        // alakjában, ne pörgő spinner -- a végleges elem az iframe fenti
        // stílusával megegyező méretű, keretes doboz.
        <Skeleton>
          <Box
            style={{
              width: '100%',
              height: '80vh',
              border: `1px solid ${t.uiLine}`,
              borderRadius: t.radiusLg,
            }}
          />
        </Skeleton>
      )}

      <AlertDialog.Root
        open={confirmStep !== null}
        onOpenChange={(open) => !open && setConfirmStep(null)}
      >
        <AlertDialog.Content maxWidth="480px">
          <AlertDialog.Title>{confirmCim}</AlertDialog.Title>
          <AlertDialog.Description size="2" style={{ whiteSpace: 'pre-line' }}>
            {confirmLeiras}
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Mégse
              </Button>
            </AlertDialog.Cancel>
            {/* NEM `AlertDialog.Action` -- az beépítetten bezárja a dialógust
                minden kattintásra (`onOpenChange(false)`), ami UGYANABBAN a
                kattintás-eseményben versenyhelyzetbe kerül a
                `confirmStepContinue` lánc-váltásával (missing-fields ->
                de-fallback-names): mindkét setConfirmStep egy React-batch-
                ben fut, és a Radix belső bezárása mindig felülírja a mi
                'de-fallback-names' állításunkat null-ra -- a második
                dialógus emiatt sosem jelent meg, egyenesen véglegesített.
                Plain Button-nal az `open` prop KIZÁRÓLAG a mi
                setConfirmStep hívásainktól függ. */}
            <Button color="red" onClick={confirmStepContinue}>
              Folytatás
            </Button>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}
