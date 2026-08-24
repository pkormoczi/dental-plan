// A generált PDF stílusai -- kiemelve a TervDocument.tsx-ből. Egy fájl
// marad, nem blokkonként (A/B/C) szétvágva: 16 kulcs (page, miniHeader*,
// footer*, h2, bulletRow/bulletDot/numberMarker/bold) mindhárom blokk
// között megosztott, a szétvágás vagy duplikálná őket, vagy egy negyedik
// "közös" fájlt szülne. A kulcsok az eredeti sorrendben maradnak, csak
// blokk-hovatartozás szerint kommentelve: A blokk (terv és ár, ~51 kulcs),
// B blokk (fizetési feltételek + garancia, 3 kulcs), C blokk (nyilatkozat
// + aláírás, 10 kulcs), közös (16 kulcs).

import { t } from '../../design/tokens';
import { FOOTER_JOBB_SZELESSEG } from '../footerLayout';

export const PAGE_MARGIN = 51; // ~18mm

// A becsült-ár csillag fix sávja az Egységár cellában, hogy a csillagos és
// nem csillagos sorok összege ugyanarra a függőleges vonalra igazodjon --
// egy egyszerű utótoldás a csillagos soroknál balra tolná a számot a
// többihez képest.
export const SAVOS_JEL_SZELESSEG = 8;

export const s = {
  // ===== Közös (mindhárom blokk) =====
  page: {
    padding: PAGE_MARGIN,
    paddingBottom: PAGE_MARGIN + 34,
    fontFamily: 'NotoSans',
    fontSize: 10.5,
    color: t.text,
  },
  // ===== A blokk (terv és ár) =====
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

  // ===== Közös (mindhárom blokk) =====
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

  // ===== A blokk (terv és ár) =====
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
  // Az összesítés a fázisok UTÁN, mindig teljes szélességben áll (lásd
  // docs/04-nyomtatvany-spec.md § "Összegzés") -- a felső elválasztó a
  // korábbi bottomRow-ról örökölt.
  summaryBlock: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: t.line,
    paddingTop: 12,
  },
  summaryTitle: { fontSize: 11.5, fontWeight: 600, color: t.brand, marginBottom: 6 },
  summaryLine: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  summaryLabelMuted: { fontSize: 9, color: t.textMuted },
  summaryDivider: { height: 1.5, backgroundColor: t.brand, marginVertical: 5 },
  summaryTotalLabel: { fontSize: 11, fontWeight: 600, color: t.brand },
  summaryTotalValue: { fontSize: 11, fontWeight: 600, color: t.brand },
  // Finom elválasztó a Végösszeg és az Előleg/Fennmaradó rész között --
  // gyengébb, mint a summaryDivider fölötte, hogy a hierarchia ne boruljon.
  summaryElolegDivider: { height: 1, backgroundColor: t.line, marginTop: 6, marginBottom: 4 },
  // Három vizuális szint: Végösszeg (summaryTotal*) > Fennmaradó rész
  // (summaryFennmarado) > Előleg (summaryEloleg) -- a fennmaradó rész az,
  // amit a páciensnek ténylegesen még fizetnie kell, ezért erősebb, mint a
  // már letudott előleg, de gyengébb, mint a szerződéses végösszeg.
  summaryFennmarado: { fontSize: 9.5, fontWeight: 600, color: t.text, marginTop: 3 },
  summaryEloleg: { fontSize: 9, color: t.textMuted, marginTop: 3 },
  validityNote: { fontSize: 8, color: t.textMuted, marginTop: 6, lineHeight: 1.5 },

  // ===== Közös (mindhárom blokk, a h2/bulletRow/bulletDot/numberMarker/bold MdBlocks/MdInline-on át) =====
  h2: { fontSize: 12.5, fontWeight: 600, color: t.brand, marginBottom: 10 },
  // ===== B blokk (fizetési feltételek + garancia) =====
  // A B blokkban (fizetési feltételek + garancia egy folyamban) a Garancia
  // cím közvetlenül az előző szakasz szövege után jön, nem friss oldal
  // tetején -- kell fölé levegő, amit korábban az oldalhatár adott.
  h2Kovetkezo: { marginTop: 18 },
  paragraph: { fontSize: 9.5, lineHeight: 1.5, marginBottom: 8 },
  // ===== C blokk (nyilatkozat + aláírás) =====
  legalParagraph: { fontSize: 8.5, lineHeight: 1.6, marginBottom: 8 },
  // ===== Közös =====
  bulletRow: { flexDirection: 'row' as const, marginBottom: 5 },
  bulletDot: { width: 12, fontSize: 9.5 },
  // ===== B blokk =====
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.5 },
  // ===== C blokk =====
  legalBulletText: { flex: 1, fontSize: 8.5, lineHeight: 1.6 },
  // ===== Közös =====
  // Szélesebb, mint a bulletDot -- a kétjegyű sorszám ("10.") is elférjen.
  numberMarker: { width: 18, fontSize: 9.5 },
  // 600, nem 700/'bold' -- a pdf/fonts.ts a NotoSans 400 és 600 vágatát
  // regisztrálja, 700-ra nincs betöltött font (a h2 is 600-at használ).
  bold: { fontWeight: 600 },

  // ===== C blokk (nyilatkozat + aláírás) =====
  signatureBlock: { marginTop: 40 },
  signatureDate: { fontSize: 9.5, marginBottom: 30 },
  signatureCols: { flexDirection: 'row' as const },
  signatureCol: { flex: 1, marginRight: 60 },
  signatureRoleLabel: { fontSize: 9, color: t.textMuted, marginBottom: 34 },
  signatureLine: { borderTopWidth: 1, borderTopColor: t.text, paddingTop: 4 },
  signatureName: { fontSize: 9.5 },
  guardianNote: { fontSize: 8.5, color: t.textMuted, marginTop: 34 },

  // ===== Közös (mindhárom blokk) =====
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
