// A generált PDF -- portolva ui/PrintPreview.jsx-ből react-pdf primitívekre.
// Lásd docs/04-nyomtatvany-spec.md a teljes specifikációért.
//
// Három folyó blokk, mindegyik szabadon túlcsordulhat több fizikai oldalra:
// A blokk (terv és ár), B blokk (fizetési feltételek + garancia, egy
// folyamban), C blokk (nyilatkozat és aláírás) -- ez utóbbi marad ki "csak
// ajánlat" módban, hogy a hazavitt példány ne legyen aláírandó szerződés.
// A garancia a B blokk része, "csak ajánlat" módban is mindig megjelenik.
//
// D21: a fix feliratok forrása a `pdf/labels.ts` (`plan.nyelv` szerint); a
// pénzösszegek ezres/tizedes elválasztója is `plan.nyelv`-től függ
// (`domain/money.ts`, 52. tétel) -- a kezelőfelület prózája (NavBar,
// szerkesztő szövegei) ettől függetlenül végig magyar marad.

import { Fragment } from 'react';
import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import { t } from '../design/tokens';
import { formatLongDate, formatShortDate } from '../domain/date';
import { formatMoney } from '../domain/money';
import { formatTeethForPrint } from '../domain/teeth';
import { buildToothVisualStates } from '../domain/toothVisual';
import { elolegOsszegek, fazisOsszeg, sorokListaOsszeg, tervVegosszeg } from '../domain/totals';
import type { Fazis, Plan, PriceList, Settings } from '../domain/types';
import { registerPdfFonts } from './fonts';
import { FOOTER_JOBB_SZELESSEG, footerExtraMagassag } from './footerLayout';
import { ALAIRAS_VAROS, pdfLabels, type PdfLabels } from './labels';
import { fillPlaceholders, parseBlocks, type MdBlock } from './markdownLite';
import { ToothChartPdf } from './ToothChartPdf';
import logoUrl from '../assets/logo.png';

registerPdfFonts();

const PAGE_MARGIN = 51; // ~18mm

// A becsült-ár csillag fix sávja az Egységár cellában, hogy a csillagos és
// nem csillagos sorok összege ugyanarra a függőleges vonalra igazodjon --
// egy egyszerű utótoldás a csillagos soroknál balra tolná a számot a
// többihez képest.
const SAVOS_JEL_SZELESSEG = 8;

const s = {
  page: {
    padding: PAGE_MARGIN,
    paddingBottom: PAGE_MARGIN + 34,
    fontFamily: 'NotoSans',
    fontSize: 10.5,
    color: t.text,
  },
  mainHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: t.brand,
    marginBottom: 16,
  },
  // flexShrink/flexGrow/flexBasis: a bal blokk (logó + rendelő adatai)
  // engedi magát összenyomni, hogy a jobb oldali cím (headerTitleBlock)
  // ne csússzon rá -- a német cím ("Behandlungsplan und
  // Kostenvoranschlag") jóval szélesebb a magyarnál, enélkül átfedte a
  // rendelő adatait. Lásd a terv "Német layout-törés" kockázatát.
  mainHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flexShrink: 1,
    flexGrow: 1,
    flexBasis: 0,
  },
  logoMain: { width: 96, height: 24, objectFit: 'contain' as const },
  headerDivider: { width: 2, height: 26, backgroundColor: t.accent, marginHorizontal: 12 },
  headerClinicBlock: { flexShrink: 1, flexGrow: 1, flexBasis: 0 },
  headerClinicText: { fontSize: 9, color: t.textMuted, lineHeight: 1.5 },
  // Fix szélesség (nem intrinsic), hogy a hosszabb német cím két sorba
  // törjön a bal blokkra csúszás helyett.
  headerTitleBlock: { alignItems: 'flex-end' as const, flexShrink: 0, width: 220 },
  headerTitle: { fontSize: 12.5, fontWeight: 600, color: t.brand, textAlign: 'right' as const },
  headerMeta: { fontSize: 9, color: t.textMuted, marginTop: 2 },

  miniHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: t.lineStrong,
    marginBottom: 18,
  },
  logoMini: { width: 62, height: 15.5, objectFit: 'contain' as const },
  miniHeaderText: { fontSize: 9, color: t.textMuted },

  // A cím + páciensadatok egy keep-together blokk a MainHeader alatt.
  titleAndPatientBlock: { marginBottom: 16 },
  planTitle: { fontSize: 14, fontWeight: 600, color: t.brand, marginBottom: 10 },
  // Két fix szemantikus oszlop (bal: Név/Született/TAJ/Lakcím, jobb:
  // Telefon/E-mail) -- nem egy sorrendfüggetlen wrap-grid, hogy a doki mindig
  // ugyanott keresse az egyes mezőket. Hiányzó mezőnél nincs rebalance: a
  // másik oszlop tartalma nem tolódik a kiürült hely felé.
  patientCols: { flexDirection: 'row' as const },
  patientColLeft: { flexGrow: 1, flexBasis: 0, paddingRight: 16 },
  patientColRight: { flexGrow: 1, flexBasis: 0 },
  kvRow: { flexDirection: 'row' as const, fontSize: 9.5, marginBottom: 2 },
  // 72, nem 60: a német címkék ("Handelsregisternummer", "Geburtsdatum")
  // hosszabbak, mint a magyarok -- lásd a terv "Német layout-törés" kockázatát.
  kvKey: { color: t.textMuted, width: 72 },
  // flexGrow+flexBasis, hogy egy hosszú érték a SAJÁT oszlopában wrapoljon,
  // ne lógjon ki és ne tolja el a másik oszlopot.
  kvValue: { flexGrow: 1, flexBasis: 0 },

  phaseBlock: { marginBottom: 14 },
  phaseTitle: { fontSize: 11.5, fontWeight: 600, color: t.brand, marginBottom: 5 },
  tableHeaderRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: t.lineStrong,
    paddingBottom: 3,
  },
  tableRow: { flexDirection: 'row' as const, paddingVertical: 3 },
  th: { fontSize: 8.5, color: t.textMuted },
  td: { fontSize: 9.5 },
  colBeavatkozas: { flexGrow: 1, flexBasis: 0 },
  colFog: { width: 78 },
  colDb: { width: 30, textAlign: 'center' as const },
  // paddingRight: a fejlécfelirat a testsor csillag-sávjához (savosJel)
  // igazodik, hogy a "Egységár" felirat a szám fölött álljon, ne a
  // csillag-sáv fölött.
  colEgysegar: { width: 72, textAlign: 'right' as const, paddingRight: SAVOS_JEL_SZELESSEG },
  colOsszeg: { width: 80, textAlign: 'right' as const },
  colEgysegarCella: { width: 72, flexDirection: 'row' as const },
  egysegarErtek: { flexGrow: 1, flexBasis: 0, textAlign: 'right' as const },
  savosJel: { width: SAVOS_JEL_SZELESSEG, textAlign: 'right' as const },
  phaseTotalRow: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    borderTopWidth: 1,
    borderTopColor: t.line,
    paddingTop: 3,
    marginTop: 2,
  },
  phaseTotalLabel: { fontSize: 9, color: t.textMuted, marginRight: 8 },
  phaseTotalValue: { fontSize: 9.5, fontWeight: 600 },
  phaseNote: { fontSize: 8.5, color: t.textMuted, marginTop: 3 },

  // Tétel-leírás sorai (docs/02-domain-modell.md § Tétel-leírás) -- a
  // `savosFootnote`/`phaseNote` mintáján, behúzva, hogy alrészletnek
  // olvasódjon, ne új tételsornak.
  leirasBlock: { marginBottom: 2 },
  leirasSor: { fontSize: 8, color: t.textMuted, marginLeft: 14, lineHeight: 1.4 },

  savosFootnote: { fontSize: 8, color: t.textMuted, marginBottom: 14, lineHeight: 1.5 },

  // A fogtérkép a páciensadatok alatt, a fázisok előtt áll -- a korábbi
  // kéthasábos (fogtérkép + összegzés egymás mellett) elrendezés megszűnt.
  toothChartBlock: { marginBottom: 16 },
  toothChartLabel: { fontSize: 8, color: t.textMuted, marginBottom: 5 },
  // Az összesítés a fázisok UTÁN, mindig teljes szélességben áll (lásd 79.
  // tétel a tartalmáért) -- a felső elválasztó a korábbi bottomRow-ról örökölt.
  summaryBlock: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: t.line,
    paddingTop: 12,
  },
  summaryLine: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  summaryLabelMuted: { fontSize: 9, color: t.textMuted },
  summaryDivider: { height: 1.5, backgroundColor: t.brand, marginVertical: 5 },
  summaryTotalLabel: { fontSize: 11, fontWeight: 600, color: t.brand },
  summaryTotalValue: { fontSize: 11, fontWeight: 600, color: t.brand },
  // Az előleg/fennmaradó sorok a Fizetendő ALATT, kisebb súllyal: a
  // szerződéses végösszeg marad a kiemelt szám, ezek abból bontanak.
  summaryEloleg: { fontSize: 9, color: t.textMuted, marginTop: 3 },
  validityNote: { fontSize: 8, color: t.textMuted, marginTop: 6, lineHeight: 1.5 },

  h2: { fontSize: 12.5, fontWeight: 600, color: t.brand, marginBottom: 10 },
  // A B blokkban (fizetési feltételek + garancia egy folyamban) a Garancia
  // cím közvetlenül az előző szakasz szövege után jön, nem friss oldal
  // tetején -- kell fölé levegő, amit korábban az oldalhatár adott.
  h2Kovetkezo: { marginTop: 18 },
  paragraph: { fontSize: 9.5, lineHeight: 1.5, marginBottom: 8 },
  legalParagraph: { fontSize: 8.5, lineHeight: 1.6, marginBottom: 8 },
  bulletRow: { flexDirection: 'row' as const, marginBottom: 5 },
  bulletDot: { width: 12, fontSize: 9.5 },
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.5 },
  legalBulletText: { flex: 1, fontSize: 8.5, lineHeight: 1.6 },

  signatureBlock: { marginTop: 40 },
  signatureDate: { fontSize: 9.5, marginBottom: 30 },
  signatureCols: { flexDirection: 'row' as const },
  signatureCol: { flex: 1, marginRight: 60 },
  signatureRoleLabel: { fontSize: 9, color: t.textMuted, marginBottom: 34 },
  signatureLine: { borderTopWidth: 1, borderTopColor: t.text, paddingTop: 4 },
  signatureName: { fontSize: 9.5 },
  guardianNote: { fontSize: 8.5, color: t.textMuted, marginTop: 34 },

  footer: {
    position: 'absolute' as const,
    left: PAGE_MARGIN,
    right: PAGE_MARGIN,
    bottom: 28,
    borderTopWidth: 1,
    borderTopColor: t.line,
    paddingTop: 8,
  },
  footerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  // A bal blokk engedi magát összenyomni (a mainHeaderLeft mintáján), a
  // jobb blokk fix szélessége a footerLayout.ts névhossz-becslésének alapja
  // -- enélkül a becslés karakter/sor számítása nem lenne értelmezhető.
  footerLeft: { flexShrink: 1, flexGrow: 1, flexBasis: 0 },
  footerRight: { width: FOOTER_JOBB_SZELESSEG },
  footerText: { fontSize: 7.5, color: t.textFaint, lineHeight: 1.5 },
  footerTextRight: { fontSize: 7.5, color: t.textFaint, lineHeight: 1.5, textAlign: 'right' as const },
  // KÜLÖN stílus, `lineHeight` NÉLKÜL: a @react-pdf/renderer 4.5.1-ben egy
  // `render` propos <Text> `lineHeight`-tal egy `fixed` ősön belül NÉMÁN
  // eltünteti az egész fixed alfát minden oldalon (a lábléc többi sora is
  // eltűnik vele) -- ez egyetlen soros szövegnél amúgy sem számítana.
  footerTextRightDynamic: { fontSize: 7.5, color: t.textFaint, textAlign: 'right' as const },
};

// Üres érték esetén a mező sora TELJESEN kimarad (nem `—`) -- a doki nem
// néz üres sorokat egy szerződéses dokumentumon.
function Kv({ k, v }: { k: string; v: string }) {
  if (!v) return null;
  return (
    <View style={s.kvRow}>
      <Text style={s.kvKey}>{k}</Text>
      <Text style={s.kvValue}>{v}</Text>
    </View>
  );
}

function MainHeader({ plan, settings, L }: { plan: Plan; settings: Settings; L: PdfLabels }) {
  return (
    <View style={s.mainHeader}>
      <View style={s.mainHeaderLeft}>
        <Image src={logoUrl} style={s.logoMain} />
        <View style={s.headerDivider} />
        <View style={s.headerClinicBlock}>
          <Text style={s.headerClinicText}>{settings.rendelo.cim}</Text>
          <Text style={s.headerClinicText}>
            {settings.rendelo.telefon} · {settings.rendelo.email}
          </Text>
        </View>
      </View>
      <View style={s.headerTitleBlock}>
        <Text style={s.headerTitle}>{L.docTitle}</Text>
        <Text style={s.headerMeta}>
          {plan.tervId} · v{plan.verzio} · {formatShortDate(plan.keltezes, plan.nyelv)}
        </Text>
      </View>
    </View>
  );
}

function MiniHeader({ plan, L, fixed }: { plan: Plan; L: PdfLabels; fixed?: boolean }) {
  return (
    <View style={s.miniHeader} fixed={fixed}>
      <Image src={logoUrl} style={s.logoMini} />
      <Text style={s.miniHeaderText}>
        {L.miniHeaderPrefix}
        {plan.paciens.nev}
      </Text>
    </View>
  );
}

function PhaseTable({
  fazis,
  currency,
  nyelv,
  leirasokMutatasa,
  L,
}: {
  fazis: Fazis;
  currency: Plan['penznem'];
  nyelv: Plan['nyelv'];
  /** docs/02-domain-modell.md § Tétel-leírás -- `plan.leirasokMutatasa`. */
  leirasokMutatasa: boolean;
  L: PdfLabels;
}) {
  return (
    <View style={s.phaseBlock}>
      {/* wrap={false} + minPresenceAhead: a cím + fejléc nem maradhat árván
          az oldal alján tartalom nélkül -- legalább egy tételsor magassága
          kell elférjen alatta, különben az egész blokk átkerül a következő
          oldalra. */}
      <View wrap={false} minPresenceAhead={20}>
        <Text style={s.phaseTitle}>{fazis.megnevezes}</Text>
        <View style={s.tableHeaderRow}>
          <Text style={[s.th, s.colBeavatkozas]}>{L.thBeavatkozas}</Text>
          <Text style={[s.th, s.colFog]}>{L.thFog}</Text>
          <Text style={[s.th, s.colDb]}>{L.thDb}</Text>
          <Text style={[s.th, s.colEgysegar]}>{L.thEgysegar}</Text>
          <Text style={[s.th, s.colOsszeg]}>{L.thOsszeg}</Text>
        </View>
      </View>
      {fazis.sorok.map((sor, i) => {
        const leiras = leirasokMutatasa ? (sor.leirasSnapshot ?? '').trim() : '';
        return (
          <Fragment key={i}>
            {/* wrap={false} csak az alapsoron: név/fog/db/ár mindig egyben
                marad, a HOZZÁ tartozó leírás (alább) önálló, törhető elem --
                egy extrém hosszú leírás így oldalra törhet ahelyett, hogy
                kilógna az oldalról vagy egy üres oldalt hagyna maga előtt. */}
            <View style={s.tableRow} wrap={false}>
              <Text style={[s.td, s.colBeavatkozas]}>{sor.nevSnapshot}</Text>
              <Text style={[s.td, s.colFog]}>
                {sor.fogak.trim() ? formatTeethForPrint(sor.fogak) : '—'}
              </Text>
              <Text style={[s.td, s.colDb]}>{sor.mennyiseg}</Text>
              <View style={[s.td, s.colEgysegarCella]}>
                <Text style={s.egysegarErtek}>{formatMoney(sor.tenylegesEgysegar, currency, nyelv)}</Text>
                <Text style={s.savosJel}>{sor.savos ? '*' : ''}</Text>
              </View>
              <Text style={[s.td, s.colOsszeg]}>
                {formatMoney(sor.tenylegesEgysegar * sor.mennyiseg, currency, nyelv)}
              </Text>
            </View>
            {leiras && (
              <View style={s.leirasBlock}>
                {leiras.split('\n').map((leirasSor, j) => (
                  <Text key={j} style={s.leirasSor}>
                    {leirasSor}
                  </Text>
                ))}
              </View>
            )}
          </Fragment>
        );
      })}
      {/* wrap={false}: a fázis-zárás (összeg + megjegyzés) nem szakadhat
          szét oldaltörésnél. */}
      <View wrap={false}>
        <View style={s.phaseTotalRow}>
          <Text style={s.phaseTotalLabel}>{L.fazisOsszesen}</Text>
          <Text style={s.phaseTotalValue}>{formatMoney(fazisOsszeg(fazis), currency, nyelv)}</Text>
        </View>
        {fazis.megjegyzes ? (
          <Text style={s.phaseNote}>
            {L.megjegyzesPrefix}
            {fazis.megjegyzes}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Footer({ plan, settings, L }: { plan: Plan; settings: Settings; L: PdfLabels }) {
  return (
    <View style={s.footer} fixed>
      <View style={s.footerRow}>
        <View style={s.footerLeft}>
          <Text style={s.footerText}>
            {settings.rendelo.nev} · {settings.rendelo.cim}
          </Text>
          <Text style={s.footerText}>
            {L.adoszam} {settings.rendelo.adoszam || '—'} · {L.cegjegyzekszam}{' '}
            {settings.rendelo.cegjegyzekszam || '—'}
          </Text>
        </View>
        <View style={s.footerRight}>
          <Text style={s.footerTextRight}>
            {plan.paciens.nev} · {plan.tervId}
          </Text>
          {/* Az oldalszám a tényleges renderelt oldalszámból jön (nem a
              szerkesztő komponens `pages`-becsléséből) -- egy hosszú,
              szerkeszthető nyilatkozat több fizikai oldalra is átfolyhat,
              ilyenkor egy fix "4/4" hazudna. */}
          <Text
            style={s.footerTextRightDynamic}
            render={({ pageNumber, totalPages }) =>
              `${L.arlistaPrefix}${formatShortDate(plan.arlistaVerzio, plan.nyelv)} · ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </View>
    </View>
  );
}

function MdBlocks({ blocks, legal }: { blocks: MdBlock[]; legal?: boolean }) {
  const paragraphStyle = legal ? s.legalParagraph : s.paragraph;
  const bulletTextStyle = legal ? s.legalBulletText : s.bulletText;
  return (
    <>
      {blocks.map((block, i) =>
        block.kind === 'ul' ? (
          <View key={i}>
            {block.items.map((item, j) => (
              <View key={j} style={s.bulletRow}>
                <Text style={s.bulletDot}>•</Text>
                <Text style={bulletTextStyle}>{item}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text key={i} style={paragraphStyle}>
            {block.text}
          </Text>
        ),
      )}
    </>
  );
}

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
  // Előleg (D66): a `Plan`-en abszolút összeg él (korábban élőben számolt
  // százalék volt); `null` = a doki nem kapcsolta be, nincs új sor.
  const elolegOsszeg = plan.elolegOsszeg ?? null;
  const eloleg = elolegOsszeg == null ? null : elolegOsszegek(grand, elolegOsszeg);
  const placeholderValues = {
    orvos: plan.orvos,
    paciens: plan.paciens.nev,
    eloleg: L.elolegKifejezes(eloleg ? formatMoney(eloleg.eloleg, plan.penznem, plan.nyelv) : null),
    // Legacy: egy régebbi demó-állapotban a fizetési feltételek törzse még a
    // {{elolegSzazalek}} helyőrzőt tartalmazhatja (v1 sablon, D66 előtt) --
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
          {tervCim.trim() && <Text style={s.planTitle}>{tervCim}</Text>}
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
            currency={plan.penznem}
            nyelv={plan.nyelv}
            leirasokMutatasa={leirasokMutatasa}
            L={L}
          />
        ))}

        {hasRange && <Text style={s.savosFootnote}>{L.savosFootnote}</Text>}

        <View style={s.summaryBlock}>
          {/* A "Kezelések összesen" referenciasor csak akkor jelenik meg, ha
              ténylegesen eltér a fizetendőtől -- eltérés nélkül a két szám
              azonos lenne, és ugyanaz az összeg állna kétszer egymás alatt
              (backlog-12). Az eltérés IRÁNYA nem számít: a felár ugyanúgy
              megnyitja, mint a kedvezmény. Maga a kedvezmény összege
              továbbra sem jelenik meg a nyomtatványon (D9). */}
          {grand !== listTotal && (
            <>
              <View style={s.summaryLine}>
                <Text style={s.summaryLabelMuted}>{L.kezelesekOsszesen}</Text>
                <Text>{formatMoney(listTotal, plan.penznem, plan.nyelv)}</Text>
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
            // tétel: mindkettő ugyanabból a becsült Fizetendőből számol,
            // csak az egyiket jelölni félrevezető lenne (backlog-9).
            // `fennmarado === null`: az előleg meghaladja a Fizetendőt
            // (D66) -- a véglegesítés-őr ezt kemény blokkal megfogja, de a
            // Csak-ajánlat előnézet a blokk előtt is renderel, ezért itt
            // sem törhet el.
            <>
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
                <Text style={s.summaryEloleg}>
                  {L.fennmaradoResz}
                  {hasRange && ' *'}
                </Text>
                <Text style={s.summaryEloleg}>
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
      <Page size="A4" style={pageStyle}>
        <MiniHeader plan={plan} L={L} fixed />
        <Text style={s.h2}>{L.fizetesiFeltetelekCim}</Text>
        <MdBlocks blocks={fizetesiFeltetelekBlocks} />
        <Text style={[s.h2, s.h2Kovetkezo]}>{L.garanciaCim}</Text>
        <MdBlocks blocks={garanciaBlocks} />
        <Footer plan={plan} settings={settings} L={L} />
      </Page>

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
          <MdBlocks blocks={nyilatkozatBlocks} legal />

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
