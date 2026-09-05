// A generált PDF -- portolva ui/PrintPreview.jsx-ből react-pdf primitívekre.
// A szerződéses szabályokhoz lásd PRODUCT.md § A nyomtatvány szerződéses
// dokumentum, a pipeline-hoz app/src/pdf/CLAUDE.md.
//
// Három folyó blokk, mindegyik szabadon túlcsordulhat több fizikai oldalra:
// A blokk (terv és ár), B blokk (fizetési feltételek + garancia, egy
// folyamban), C blokk (nyilatkozat és aláírás) -- ez utóbbi marad ki "csak
// ajánlat" módban, hogy a hazavitt példány ne legyen aláírandó szerződés.
// A garancia a B blokk része, "csak ajánlat" módban is mindig megjelenik.
//
// A fix feliratok forrása a `pdf/labels.ts` (`plan.nyelv` szerint); a
// pénzösszegek ezres/tizedes elválasztója is `plan.nyelv`-től függ
// (`domain/money.ts`, 52. tétel) -- a kezelőfelület prózája (NavBar,
// szerkesztő szövegei) ettől függetlenül végig magyar marad.

import { Document, Page, Text, View } from '@react-pdf/renderer';
import { formatLongDate } from '../domain/date';
import { formatMoney } from '../domain/money';
import { buildToothVisualStates } from '../domain/toothVisual';
import { elolegOsszegek, sorokListaOsszeg, tervVegosszeg } from '../domain/totals';
import type { Plan, PriceList, Settings } from '../domain/types';
import { registerPdfFonts } from './fonts';
import { footerExtraMagassag } from './footerLayout';
import { ALAIRAS_VAROS, pdfLabels } from './labels';
import { pdfTervCim } from './pdfCimLokalizacio';
import { fillPlaceholders, parseBlocks } from './markdownLite';
import { sablonNyomtathato } from '../domain/templates';
import { Footer, Kv, MainHeader, MiniHeader } from './tervDocument/Chrome';
import { MdBlocks } from './tervDocument/Markdown';
import { PhaseTable } from './tervDocument/PhaseTable';
import { s } from './tervDocument/styles';
import { ToothChartPdf } from './ToothChartPdf';

registerPdfFonts();

// A Fizetési feltételek/Garancia cím nem maradhat az oldal alján az első
// bekezdés nélkül -- ~2-3 sornyi szöveg (9.5pt/1.5 sorköz) kell elférjen
// alatta, különben a cím átkerül a következő oldalra. A cím ÉS a bekezdés
// EGYÜTT wrap={false}-ba zárása szándékosan elvetve: egy hosszú első
// bekezdés így is törhet oldalra, csak nem közvetlenül a cím alatt.
const SZEKCIO_CIM_MIN_PRESENCE = 36;

// Az aláírásblokk (wrap={false}) nem maradhat egyedül a következő oldalra
// ugorva, a nyilatkozat utolsó bekezdését árván hagyva az előző oldal
// alján. A react-pdf pagination-je (@react-pdf/layout `shouldBreak`) az itt
// megadott értéket az aláírásblokk tényleges aljával `Math.min`-eli -- elég,
// ha ez nagyobb az aláírásblokk valós magasságánál (kiskorú megjegyzéssel
// együtt is), nincs szükség pontos becslésre.
const ALAIRAS_MIN_PRESENCE = 240;

export interface TervDocumentProps {
  plan: Plan;
  settings: Settings;
  priceList: PriceList;
  offerOnly: boolean;
  nyilatkozatMd: string;
  fizetesiFeltetelekMd: string;
  garanciaMd: string;
  /**
   * A terv címe (`terv-cimke.json` -- `domain/tervCim.ts`
   * `megjelenitettTervCim()`), NEM a `terv.json` mezője -- egy `Plan.cim`
   * mező két forrást csinálna ugyanabból az adatból. A hívó (PreviewPage.tsx)
   * adja fel oldva: mentett lánchoz a tárolt címkét, vadonatúj lánchoz az élő
   * javaslatot. A már véglegesített PDF a véglegesítés pillanatában érvényes
   * címet fagyasztja be -- egy utólagos átcímkézés a mentett fájlt nem érinti.
   */
  tervCim: string;
  /**
   * A webbel megegyező markupból (design/toothChartSvg.ts) canvason
   * előállított raszterkép (pdf/toothChartImage.ts) -- lásd PreviewPage.tsx.
   * `null`, ha a renderelés meghiúsult vagy még nem készült el: ilyenkor a
   * fogtérkép-blokk kimarad, akárcsak ha nincs egyetlen fogszám sem a tervben.
   */
  toothChartPng: string | null;
}

export function TervDocument({
  plan,
  settings,
  priceList,
  offerOnly,
  nyilatkozatMd,
  fizetesiFeltetelekMd,
  garanciaMd,
  tervCim,
  toothChartPng,
}: TervDocumentProps) {
  const L = pdfLabels(plan.nyelv);
  const grand = tervVegosszeg(plan.fazisok, plan.kedvezmenyOsszeg);
  const listTotal = sorokListaOsszeg(plan.fazisok);
  const hasRange = plan.fazisok.some((p) => p.sorok.some((l) => l.savos));
  const leirasokMutatasa = plan.leirasokMutatasa ?? true;
  const fogterkep = buildToothVisualStates(plan, priceList);
  const showToothChart = toothChartPng != null && (fogterkep.fogak.size > 0 || fogterkep.tejfogak.length > 0);
  // A sablonszövegben álló {{orvos}}/{{paciens}} helyőrzőket a tényleges
  // terv-adatok váltják fel, mielőtt bekezdésekre/felsorolásra bontanánk.
  // Előleg: a `Plan`-en abszolút összeg él (korábban élőben számolt
  // százalék volt); `null` = a doki nem kapcsolta be, nincs új sor.
  const elolegOsszeg = plan.elolegOsszeg ?? null;
  const eloleg = elolegOsszeg == null ? null : elolegOsszegek(grand, elolegOsszeg);
  const placeholderValues = {
    orvos: plan.orvos,
    paciens: plan.paciens.nev,
    eloleg: L.elolegKifejezes(eloleg ? formatMoney(eloleg.eloleg, plan.penznem, plan.nyelv) : null),
    // Legacy: egy régebbi demó-állapotban a fizetési feltételek törzse még a
    // {{elolegSzazalek}} helyőrzőt tartalmazhatja (v1 sablon, az abszolút
    // előleg-összeg bevezetése előtt) --
    // a `fillPlaceholders` egy ismeretlen helyőrzőt SZÓ SZERINT kiírna, ami
    // egy aláírandó PDF-en nyers `{{elolegSzazalek}}` szöveget hagyna. A
    // kikapcsolt-előleg alapértéke (50) a régi, korábban is használt
    // ELOLEG_ALAP_SZAZALEK értéke volt.
    elolegSzazalek: String(
      eloleg && grand > 0 ? Math.round((eloleg.eloleg / grand) * 100) : 50,
    ),
  };
  const fizetesiFeltetelekBlocks = parseBlocks(
    fillPlaceholders(fizetesiFeltetelekMd, placeholderValues),
  );
  const garanciaBlocks = parseBlocks(fillPlaceholders(garanciaMd, placeholderValues));
  const nyilatkozatBlocks = parseBlocks(fillPlaceholders(nyilatkozatMd, placeholderValues));
  // A B blokk (fizetési feltételek + garancia) szekciói hiányzó vagy
  // placeholder-jelölésű (jogilag még le nem zárt) szöveg esetén a
  // címükkel együtt kimaradnak -- a HU-visszaesés UTÁNI, ténylegesen
  // felhasznált szövegre vizsgálva, tehát a saját nyelvi placeholder-t is
  // lefedi, nem csak a cross-language esetet.
  const fizetesiLathato = sablonNyomtathato(fizetesiFeltetelekMd);
  const garanciaLathato = sablonNyomtathato(garanciaMd);
  const showFeltetelekPage = fizetesiLathato || garanciaLathato;

  // Dokumentum-szinten egyszer számolt, minden oldalon azonos lábléc-
  // magasság (lásd footerLayout.ts) -- nem oldalanként újraszámolt, mert a
  // lábléc jobb blokkjának mérete a teljes dokumentumon egységes kell legyen.
  const footerExtra = footerExtraMagassag(plan.paciens.nev, plan.tervId);
  const pageStyle = footerExtra > 0 ? [s.page, { paddingBottom: s.page.paddingBottom + footerExtra }] : s.page;

  return (
    <Document>
      {/* ---------- A blokk -- terv és ár ---------- */}
      <Page size="A4" style={pageStyle}>
        {/* A nagy fejléc csak a dokumentum ELSŐ fizikai oldalán jelenik meg
            (a folyamban van, nem `fixed`); minden további -- a blokk saját
            túlcsordulásából adódó -- fizikai oldal a kompakt fejlécet kapja. */}
        <View fixed render={({ pageNumber }) => (pageNumber === 1 ? null : <MiniHeader plan={plan} L={L} />)} />
        <MainHeader plan={plan} settings={settings} L={L} />

        {/* Cím + páciensadatok egy keep-together blokk. */}
        <View style={s.titleAndPatientBlock} wrap={false}>
          {tervCim.trim() && (
            <Text style={s.planTitle}>{pdfTervCim(tervCim, plan, priceList)}</Text>
          )}
          <View style={s.patientCols}>
            <View style={s.patientColLeft}>
              <Kv k={L.kvNev} v={plan.paciens.nev} />
              <Kv k={L.kvSzuletett} v={plan.paciens.szuletesiIdo} />
              <Kv k={L.kvTaj} v={plan.paciens.taj} />
              <Kv k={L.kvLakcim} v={plan.paciens.lakcim} />
            </View>
            <View style={s.patientColRight}>
              <Kv k={L.kvTelefon} v={plan.paciens.telefon} />
              <Kv k={L.kvEmail} v={plan.paciens.email} />
            </View>
          </View>
        </View>

        {/* A fogtérkép a páciensadatok alatt, a fázisok előtt áll,
            cím+rajz+jelmagyarázat egy keep-together blokként. */}
        {showToothChart && (
          <View style={s.toothChartBlock} wrap={false}>
            <Text style={s.toothChartLabel}>{L.erintettFogak}</Text>
            <ToothChartPdf pngDataUrl={toothChartPng!} allapot={fogterkep} nyelv={plan.nyelv} L={L} />
          </View>
        )}

        {plan.fazisok.map((fazis, i) => (
          <PhaseTable
            key={i}
            fazis={fazis}
            pos={i + 1}
            currency={plan.penznem}
            nyelv={plan.nyelv}
            leirasokMutatasa={leirasokMutatasa}
            L={L}
          />
        ))}

        {hasRange && <Text style={s.savosFootnote}>{L.savosFootnote}</Text>}

        <View style={s.summaryBlock}>
          <Text style={s.summaryTitle}>{L.osszesitesCim}</Text>
          {/* A "Kezelések összege" referenciasor csak akkor jelenik meg, ha
              ténylegesen eltér a fizetendőtől -- eltérés nélkül a két szám
              azonos lenne, és ugyanaz az összeg állna kétszer egymás alatt
              (backlog-12). Az eltérés IRÁNYA nem számít: a felár ugyanúgy
              megnyitja, mint a kedvezmény. Maga a kedvezmény összege
              továbbra sem jelenik meg a nyomtatványon. */}
          {grand !== listTotal && (
            <>
              <View style={s.summaryLine}>
                <Text style={s.summaryLabelMuted}>{L.kezelesekOsszesen}</Text>
                <Text style={s.summaryLabelMuted}>{formatMoney(listTotal, plan.penznem, plan.nyelv)}</Text>
              </View>
              <View style={s.summaryDivider} />
            </>
          )}
          <View style={s.summaryLine}>
            <Text style={s.summaryTotalLabel}>{L.fizetendo}</Text>
            <Text style={s.summaryTotalValue}>{formatMoney(grand, plan.penznem, plan.nyelv)}</Text>
          </View>
          {eloleg && (
            // Mindkét sor csillagot kap, ha a tervben van becsült árú
            // tétel: mindkettő ugyanabból a becsült Végösszegből számol,
            // csak az egyiket jelölni félrevezető lenne (backlog-9).
            // `fennmarado === null`: az előleg meghaladja a Végösszeget
            // -- a véglegesítés-őr ezt kemény blokkal megfogja, de a
            // Csak-ajánlat előnézet a blokk előtt is renderel, ezért itt
            // sem törhet el.
            <>
              <View style={s.summaryElolegDivider} />
              <View style={s.summaryLine}>
                <Text style={s.summaryEloleg}>
                  {L.elolegSor}
                  {hasRange && ' *'}
                </Text>
                <Text style={s.summaryEloleg}>
                  {formatMoney(eloleg.eloleg, plan.penznem, plan.nyelv)}
                </Text>
              </View>
              <View style={s.summaryLine}>
                <Text style={s.summaryFennmarado}>
                  {L.fennmaradoResz}
                  {hasRange && ' *'}
                </Text>
                <Text style={s.summaryFennmarado}>
                  {eloleg.fennmarado == null ? '—' : formatMoney(eloleg.fennmarado, plan.penznem, plan.nyelv)}
                </Text>
              </View>
            </>
          )}
          <Text style={s.validityNote}>
            {L.ervenyessegMondat(formatLongDate(plan.ervenyesIg, plan.nyelv))}
            {'\n'}
            {L.anyagkoltseg}
          </Text>
        </View>

        <Footer plan={plan} settings={settings} L={L} />
      </Page>

      {/* ---------- B blokk -- fizetési feltételek + garancia, egy folyamban ---------- */}
      {showFeltetelekPage && (
        <Page size="A4" style={pageStyle}>
          <MiniHeader plan={plan} L={L} fixed />
          {fizetesiLathato && (
            <>
              <View wrap={false} minPresenceAhead={SZEKCIO_CIM_MIN_PRESENCE}>
                <Text style={s.h2}>{L.fizetesiFeltetelekCim}</Text>
              </View>
              <MdBlocks blocks={fizetesiFeltetelekBlocks} />
            </>
          )}
          {garanciaLathato && (
            <>
              <View wrap={false} minPresenceAhead={SZEKCIO_CIM_MIN_PRESENCE}>
                <Text style={fizetesiLathato ? [s.h2, s.h2Kovetkezo] : s.h2}>{L.garanciaCim}</Text>
              </View>
              <MdBlocks blocks={garanciaBlocks} />
            </>
          )}
          <Footer plan={plan} settings={settings} L={L} />
        </Page>
      )}

      {/* ---------- C blokk -- nyilatkozat és aláírás ---------- */}
      {!offerOnly && (
        <Page size="A4" style={pageStyle}>
          <MiniHeader plan={plan} L={L} fixed />
          {/* A cím `fixed`, minden fizikai oldalon ismétlődik: az első a
              sima címet kapja, a folytatólagosak a "– folytatás" változatot.
              A két ág egysoros és azonos stílusú -- react-pdf-ben a
              `subPageNumber` csak a végleges tördelés után ismert, tehát a
              render-ág NEM okozhat magasságkülönbséget a szétvágás
              pillanatában, csak szövegcserét. */}
          <Text
            style={s.h2}
            fixed
            render={({ subPageNumber }) => (subPageNumber > 1 ? L.nyilatkozatCimFolytatas : L.nyilatkozatCim)}
          />
          <MdBlocks blocks={nyilatkozatBlocks.slice(0, -1)} legal />
          {/* Az utolsó bekezdés az aláírásblokk minPresenceAhead-jével együtt
              -- ha az aláírásblokk nem fér ki, ez a bekezdés is átkerül vele
              a következő oldalra, nem marad árván itt. */}
          <View minPresenceAhead={ALAIRAS_MIN_PRESENCE}>
            <MdBlocks blocks={nyilatkozatBlocks.slice(-1)} legal />
          </View>

          <View style={s.signatureBlock} wrap={false}>
            <Text style={s.signatureDate}>
              {L.alairasSor(ALAIRAS_VAROS, formatLongDate(plan.keltezes, plan.nyelv))}
            </Text>
            <View style={s.signatureCols}>
              <View style={s.signatureCol}>
                <Text style={s.signatureRoleLabel}>{L.megbizott}</Text>
                <View style={s.signatureLine}>
                  <Text style={s.signatureName}>{plan.orvos}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.signatureRoleLabel}>{L.megrendelo}</Text>
                <View style={s.signatureLine}>
                  <Text style={s.signatureName}>{plan.paciens.nev}</Text>
                </View>
              </View>
            </View>

            {plan.paciens.kiskoru && (
              <Text style={s.guardianNote}>
                {L.kiskoruNote}
                {plan.paciens.torvenyesKepviselo ? ` (${plan.paciens.torvenyesKepviselo})` : ''}
              </Text>
            )}
          </View>

          <Footer plan={plan} settings={settings} L={L} />
        </Page>
      )}
    </Document>
  );
}
