// Előnézet és véglegesítés -- portolva ui/PrintPreview.jsx-ből, valódi
// @react-pdf/renderer kimenetre kötve (nem HTML előnézet). Lásd
// docs/03-funkcionalis-spec.md "4. Előnézet és véglegesítés".

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePDF } from '@react-pdf/renderer';
import { Box, Button, Callout, Checkbox, Flex, Skeleton, Text } from '@radix-ui/themes';
import { useNyelviReview } from '../components/NyelviReviewContext';
import { t } from '../design/tokens';
import { buildToothChartSvg } from '../design/toothChartSvg';
import { aktivOrvosok } from '../domain/orvosok';
import { paciensTorzsadatbol } from '../domain/paciensAdatok';
import { isPlaceholderTemplate } from '../domain/templates';
import { computeOsszesitok } from '../domain/totals';
import { buildToothVisualStates } from '../domain/toothVisual';
import { feloldPatientDir } from '../domain/torzsadatBetoltes';
import type { Paciens, PlanRef } from '../domain/types';
import { nyelviMismatchek } from '../domain/nyelviReview';
import { vanKemenyBlokk, veglegesitesDiagnozis } from '../domain/veglegesitesOr';
import { TervDocument } from '../pdf/TervDocument';
import { renderToothChartPng } from '../pdf/toothChartImage';
import { VeglegesitesChecklist } from './previewPage/VeglegesitesChecklist';
import { useAppState } from '../state/AppState';
import { buildDownloadFileName } from '../storage/paths';
import { useStorage } from '../storage/StorageContext';

export default function PreviewPage() {
  const { plan, setPlan, settings, priceList, markPlanSaved, piszkozatPatientDir, piszkozatTervCim } =
    useAppState();
  const { storage, loadLatestTemplateByBase } = useStorage();
  const navigate = useNavigate();

  // A doki nyers kézi választása -- a `Plan` mezője (docs/02-domain-modell.md
  // § Csak ajánlat mód, D75), nem helyi state, hogy navigáció oda-vissza és
  // az autosave is megőrizze.
  const offerOnly = plan.csakAjanlat === true;
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
  // backlog-69 (D74): a piszkozat best-effort törlésének (markPlanSaved)
  // hibája -- KÜLÖN a `saveError`-tól, ugyanazon okból, mint a `cimkeHiba`:
  // a terv MÁR a lemezen van, ez legfeljebb egy elmaradt takarítás, nem
  // mentési hiba. Csak a siker-képernyőn jelenik meg, amber színnel.
  const [piszkozatTorlesHiba, setPiszkozatTorlesHiba] = useState<string | null>(null);
  // A webbel megegyező forrásból (design/toothChartSvg) canvason renderelt
  // fogtérkép-PNG a nyomtatványhoz -- lásd pdf/toothChartImage.ts. `null`,
  // amíg el nem készül, vagy ha a rajzolás meghiúsul (pl. jsdom teszt) --
  // ilyenkor a TervDocument a fogtérkép-blokkot egyszerűen kihagyja.
  const [toothChartPng, setToothChartPng] = useState<string | null>(null);
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
  // a nyilatkozat és aláírás blokk garantáltan kimarad -- a doki nem
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

  const nyelviReview = useNyelviReview();

  // A csekklista a `nyilatkozatIsPlaceholder`-t (fent) csak TÉNYKÉNT kapja
  // meg (D73) -- a kényszerített offer-only mód (`effectiveOfferOnly`,
  // szintén fent) és a D23 jogi zár ettől függetlenül, a hívó szintjén él.
  const csekklista = veglegesitesDiagnozis(
    plan,
    priceList,
    plan.leirasokMutatasa ?? true,
    masterPaciens,
    aktivOrvosok(settings),
    { sablonFallback, nyilatkozatPlaceholder: nyilatkozatIsPlaceholder },
  );

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
    setPiszkozatTorlesHiba(null);
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
        // Az EFFEKTÍV érték mentődik, nem a nyers `plan.csakAjanlat` --
        // placeholder-nyilatkozat miatt kényszerített esetben is a
        // ténylegesen kiadott PDF-et kell tükröznie (a nyilatkozat blokk
        // ekkor is kimarad), különben a verziósor D558 jelvénye hazudna.
        csakAjanlat: effectiveOfferOnly,
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
      // "mentett" referenciát is frissíti, lásd AppState.tsx). KÜLÖN
      // try/catch, NEM a közös hibazónában (D74, a `savePlanLabel` fenti
      // blokkjának mintáján): a terv ekkor MÁR tartósan a lemezen van, a
      // takarítás hibája nem jelentheti a dokinak, hogy "a mentés nem
      // sikerült" -- markPlanSaved minden szinkron state-frissítést a
      // `drafts.clear()` ELŐTT elvégez, tehát egy hibázó törlés után is a
      // memóriabeli állapot már helyes (`vanMentetlenPiszkozat` false).
      try {
        await markPlanSaved(persisted);
      } catch (err) {
        setPiszkozatTorlesHiba(
          err instanceof Error
            ? err.message
            : 'A piszkozat törlése váratlanul nem sikerült.',
        );
      }
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
    // D73: a szekvenciális megerősítő-lánc megszűnt -- a hard blokkok a
    // csekklisten (fent, MINDIG láthatóan) jelennek meg, és a gomb
    // `disabled`-je (lent) már eleve letiltja a kattintást, amíg van ilyen.
    // A puha tételek nem kérnek "Folytatás"-t, a doki már látta őket a
    // gombnyomás ELŐTT.
    if (savingRef.current || vanKemenyBlokk(csekklista)) return;
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
        {piszkozatTorlesHiba && (
          <Callout.Root color="amber" mb="5" style={{ textAlign: 'left' }}>
            <Callout.Text>
              A piszkozat automatikus törlése nem sikerült: {piszkozatTorlesHiba} A terv
              mentése ettől függetlenül sikeres volt -- a Kezdőlapon még megjelenhet egy
              elavult piszkozat-kártya, ott elvethető.
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
  // A `usePDF()` deklarált típusa `error: string | null`, de a könyvtár
  // futásidőben a nyers `Error` objektumot adja (@react-pdf/renderer
  // usePDF hook, onRenderFailed) -- a nyers érték JSX-gyerekként
  // renderelve összeomlana ("Objects are not valid as a React child").
  const pdfErrorMessage =
    pdfError == null
      ? null
      : (pdfError as unknown) instanceof Error
        ? (pdfError as unknown as Error).message
        : String(pdfError);
  const busy = saving || pdfStale;
  // A "Nyelvi ellenőrzésre váró szövegek" checklist-tétel guided-review
  // gombjának célja -- a lista tartalma megegyezik a `csekklista`
  // `nyelvi-review` tételének forrásával (domain/veglegesitesOr.ts), külön
  // hívva, mert csak az ELSŐ cél kell ide, a domain modellbe React-callback
  // nem kerül.
  const nyelviMismatchLista = nyelviMismatchek(plan);

  return (
    <Box style={{ maxWidth: 1100, margin: '0 auto' }}>
      {templateError && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>A sablonok betöltése meghiúsult: {templateError}</Callout.Text>
        </Callout.Root>
      )}
      {pdfError && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>
            A PDF előállítása hibába futott: {pdfErrorMessage || 'ismeretlen hiba'}. A
            véglegesítés emiatt le van tiltva.
          </Callout.Text>
          <Flex mt="2">
            <Button variant="soft" color="gray" onClick={() => updatePdf(tervDocument)}>
              Újrapróbálás
            </Button>
          </Flex>
        </Callout.Root>
      )}
      {saveError && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>A mentés nem sikerült: {saveError}</Callout.Text>
        </Callout.Root>
      )}

      {/* D79: egyoszlopos, minden breakpointon -- a checklist MINDIG a PDF
          FÖLÉ kerül ("ezt olvasd el előbb" sorrend, a validációs állapotot
          előbb kell látni, mint magát a dokumentumot). A "Csak ajánlat"
          kapcsoló és a Letöltés/Véglegesítés gombsor a checklist ALATT, de
          a PDF FÖLÖTT áll: a doki fentről lefelé végigolvassa a
          checklistet, utána ott a kapcsoló és a gomb, mielőtt a hosszú
          PDF-iframe-hez érne. */}
      <Flex direction="column" gap="4">
        <VeglegesitesChecklist
          csekklista={csekklista}
          onNavigate={navigate}
          nyelviReviewAction={
            nyelviMismatchLista.length > 0
              ? {
                  label: 'Irányított ellenőrzés',
                  onClick: () => nyelviReview.indit(nyelviMismatchLista[0].cel),
                }
              : undefined
          }
        />

        <Flex justify="between" align="center" gap="3" wrap="wrap">
          <Text as="label" size="2" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Checkbox
              checked={effectiveOfferOnly}
              disabled={nyilatkozatIsPlaceholder}
              onCheckedChange={(checked) =>
                setPlan((prev) => ({ ...prev, csakAjanlat: checked === true }))
              }
            />
            Csak ajánlat — a nyilatkozat és aláírás oldal nélkül
          </Text>
          <Flex gap="3" wrap="wrap">
            {pdfInstance.url &&
              (pdfError ? (
                // A könyvtár hibán át megőrzi az utolsó sikeres `url`-t
                // (lásd a `pdfError` Callout fölötti kommentet) --
                // letöltés nélküle egy a képernyőn látott tervvel már
                // nem egyező PDF-et adna.
                <Button variant="soft" color="gray" disabled>
                  Elavult PDF
                </Button>
              ) : pdfStale ? (
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
            <Button
              onClick={attemptFinalize}
              disabled={busy || !!pdfError || vanKemenyBlokk(csekklista)}
            >
              {saving ? 'Mentés…' : 'Véglegesítés és mentés'}
            </Button>
          </Flex>
        </Flex>

        <Box>
          {pdfInstance.url ? (
            <iframe
              title="Kezelési terv előnézet"
              src={pdfInstance.url}
              style={{
                width: '100%',
                height: '80vh',
                border: `1px solid ${t.uiLine}`,
                borderRadius: t.radiusLg,
                opacity: pdfStale || pdfError ? 0.5 : 1,
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
        </Box>
      </Flex>
    </Box>
  );
}
