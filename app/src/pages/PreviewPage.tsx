// Előnézet és véglegesítés -- portolva ui/PrintPreview.jsx-ből, valódi
// @react-pdf/renderer kimenetre kötve (nem HTML előnézet). Lásd
// docs/03-funkcionalis-spec.md "4. Előnézet és véglegesítés".

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePDF } from '@react-pdf/renderer';
import { AlertDialog, Box, Button, Callout, Checkbox, Flex, Text } from '@radix-ui/themes';
import { t } from '../design/tokens';
import { buildToothChartSvg } from '../design/toothChartSvg';
import { fallbackSorok } from '../domain/nev';
import { computeOsszesitok } from '../domain/totals';
import { buildToothVisualStates } from '../domain/toothVisual';
import type { PlanRef } from '../domain/types';
import { TervDocument } from '../pdf/TervDocument';
import { renderToothChartPng } from '../pdf/toothChartImage';
import { useAppState } from '../state/AppState';
import { useStorage } from '../storage/StorageContext';

type ConfirmStep = 'missing-fields' | 'de-fallback-names' | null;

export default function PreviewPage() {
  const { plan, setPlan, settings, priceList, resetPlanDraft } = useAppState();
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
  const [sablonFallback, setSablonFallback] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedRef, setSavedRef] = useState<PlanRef | null>(null);
  const [nameMissingNotice, setNameMissingNotice] = useState(false);
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

  useEffect(() => {
    let cancelled = false;

    // Mindkét sablon a LEGFRISSEBB verzióban jelenik meg -- a nyilatkozat
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
    ) {
      try {
        return { ...(await load()), fellback: false };
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
        const [nyil, fiz] = await Promise.all([
          loadOrFallback(
            () => loadLatestTemplateByBase(`nyilatkozat-${plan.nyelv}`),
            () => loadLatestTemplateByBase('nyilatkozat-hu'),
          ),
          loadOrFallback(
            () => loadLatestTemplateByBase(`fizetesi-feltetelek-${plan.nyelv}`),
            () => loadLatestTemplateByBase('fizetesi-feltetelek-hu'),
          ),
        ]);
        if (!cancelled) {
          setNyilatkozatMd(nyil.body);
          setNyilatkozatVerzio(nyil.name.replace(/\.md$/, ''));
          setFizetesiFeltetelekMd(fiz.body);
          setSablonFallback(nyil.fellback || fiz.fellback);
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

  const tervDocument = (
    <TervDocument
      plan={plan}
      settings={settings}
      priceList={priceList}
      offerOnly={offerOnly}
      nyilatkozatMd={nyilatkozatMd}
      fizetesiFeltetelekMd={fizetesiFeltetelekMd}
      toothChartPng={toothChartPng}
    />
  );
  const [pdfInstance, updatePdf] = usePDF({ document: tervDocument });

  // usePDF() saját belső effektje csak a MOUNT pillanatában lévő
  // `document`-et rendereli (a @react-pdf/renderer forrásában [] a
  // dependency array) -- utána a hívónak KELL az `update` függvénnyel
  // újragenerálnia, különben a nyilatkozat/fizetési feltételek (amik a
  // fenti useEffect-ben, a mount UTÁN töltődnek be) sosem kerülnek bele,
  // és a "Csak ajánlat" kapcsoló sem hat a letöltött PDF-re. Ugyanez a
  // minta, mint a könyvtár saját `PDFViewer` komponensében.
  useEffect(() => {
    updatePdf(tervDocument);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, settings, offerOnly, nyilatkozatMd, fizetesiFeltetelekMd, toothChartPng, updatePdf]);

  const nameMissing = !plan.paciens.nev.trim();
  const otherFieldsMissing =
    !plan.paciens.szuletesiIdo ||
    !plan.paciens.lakcim ||
    !plan.paciens.telefon ||
    !plan.paciens.email ||
    !plan.paciens.taj;
  // D21/1.1: a hiányzó német tételnevek soha nem eshetnek magyarra
  // véglegesítéskor néma módon -- a doki itt látja, mely nevek érintettek,
  // mielőtt a páciens aláírja a dokumentumot.
  const hianyzoNevek = fallbackSorok(plan, priceList);

  async function doFinalize() {
    if (!pdfInstance.blob) return;

    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const finalPlan = {
        ...plan,
        statusz: 'VEGLEGES' as const,
        // A most az előnézetben LÁTOTT (legfrissebb) nyilatkozat-verzió
        // pinnelődik -- lásd a fenti useEffect kommentjét.
        sablonVerzio: nyilatkozatVerzio,
        osszesitok: computeOsszesitok(plan.fazisok),
      };
      const bytes = new Uint8Array(await pdfInstance.blob.arrayBuffer());
      const ref = await storage.savePlan(finalPlan, bytes);
      const persisted = await storage.loadPlan(ref); // tervId/verzio a storage tölti ki (D4)
      setPlan(persisted);
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
    // nem blokkol -- docs/03-funkcionalis-spec.md "2. Páciens adatlap".
    if (nameMissing) {
      setNameMissingNotice(true);
      return;
    }
    setNameMissingNotice(false);
    if (otherFieldsMissing) {
      setConfirmStep('missing-fields');
      return;
    }
    if (hianyzoNevek.length > 0) {
      setConfirmStep('de-fallback-names');
      return;
    }
    void doFinalize();
  }

  function confirmStepContinue() {
    // A hiányzó-mezők megerősítés után -- ha német nevek is hiányoznak --
    // a láncban a KÖVETKEZŐ dialógus nyílik meg, nem a mentés fut le rögtön.
    if (confirmStep === 'missing-fields' && hianyzoNevek.length > 0) {
      setConfirmStep('de-fallback-names');
      return;
    }
    setConfirmStep(null);
    void doFinalize();
  }

  function startNewPlan() {
    resetPlanDraft();
    navigate('/paciens');
  }

  if (savedRef) {
    return (
      <Box style={{ maxWidth: 640, margin: '40px auto', textAlign: 'center' }}>
        <Text as="p" size="4" style={{ color: t.ok }} mb="2">
          A terv elmentve ✓
        </Text>
        <Text as="p" size="2" color="gray" mb="5" style={{ fontFamily: t.mono }}>
          {savedRef.patientDir} / {savedRef.versionDir}
        </Text>
        <Flex gap="3" justify="center">
          <Button onClick={startNewPlan}>Új terv indítása</Button>
          <Button variant="soft" color="gray" onClick={() => navigate('/tervek')}>
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

  return (
    <Box style={{ maxWidth: 900, margin: '0 auto' }}>
      {templateError && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>A sablonok betöltése meghiúsult: {templateError}</Callout.Text>
        </Callout.Root>
      )}
      {sablonFallback && (
        <Callout.Root color="amber" mb="3">
          <Callout.Text>
            A tervhez tartozó sablon nem található a tárolóban — helyette a magyar
            nyilatkozat/fizetési feltételek szövege jelenik meg a nyomtatványon. Próbáld a
            Kezdőlapon a „Demó adat visszaállítása” gombot, vagy nyiss új tervet.
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

      <Flex justify="between" align="center" mb="4" wrap="wrap" gap="3">
        <Text as="label" size="2" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Checkbox checked={offerOnly} onCheckedChange={(checked) => setOfferOnly(checked === true)} />
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
                  download={`kezelesi-terv-${plan.tervId || 'uj'}${offerOnly ? '-ajanlat' : ''}.pdf`}
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
        <Box style={{ padding: 40, textAlign: 'center' }}>
          <Text size="2" color="gray">
            PDF előállítása…
          </Text>
        </Box>
      )}

      <AlertDialog.Root
        open={confirmStep !== null}
        onOpenChange={(open) => !open && setConfirmStep(null)}
      >
        <AlertDialog.Content maxWidth="480px">
          <AlertDialog.Title>
            {confirmStep === 'missing-fields' ? 'Hiányzó páciensadatok' : 'Hiányzó német tételnevek'}
          </AlertDialog.Title>
          <AlertDialog.Description size="2" style={{ whiteSpace: 'pre-line' }}>
            {confirmStep === 'missing-fields'
              ? 'Néhány páciensadat hiányzik (nem kötelező, de a nyomtatványon üresen marad). Folytatod a véglegesítést?'
              : `Ez egy német nyelvű ajánlat, de ${hianyzoNevek.length} tétel neve magyarul kerül a ` +
                `nyomtatványra (nincs német fordításuk):\n\n${hianyzoNevek.slice(0, 8).join('\n')}` +
                `${hianyzoNevek.length > 8 ? `\n… és további ${hianyzoNevek.length - 8}` : ''}\n\n` +
                'A páciens ezt a dokumentumot írja alá. Folytatod a véglegesítést?'}
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Mégse
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color="red" onClick={confirmStepContinue}>
                Folytatás
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}
