// A generált PDF -- portolva ui/PrintPreview.jsx-ből react-pdf primitívekre.
// Lásd docs/04-nyomtatvany-spec.md a teljes specifikációért.
//
// 1-2. oldal: terv és ár. 3. oldal: nyilatkozat és aláírás -- ez marad ki
// "csak ajánlat" módban, hogy a hazavitt példány ne legyen aláírandó
// szerződés.

import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import { t } from '../design/tokens';
import { formatHuDate, formatHuDateShort } from '../domain/date';
import { formatMoney } from '../domain/money';
import { parseTeeth } from '../domain/teeth';
import { fazisListaOsszeg, fazisOsszeg } from '../domain/totals';
import type { Fazis, Plan, Settings } from '../domain/types';
import { registerPdfFonts } from './fonts';
import { extractBulletLines, stripMarkdownHeading } from './markdownLite';
import { ToothChartPdf } from './ToothChartPdf';
import logoUrl from '../assets/logo.png';

registerPdfFonts();

const PAGE_MARGIN = 51; // ~18mm

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
    borderBottomColor: t.navy,
    marginBottom: 16,
  },
  mainHeaderLeft: { flexDirection: 'row' as const, alignItems: 'center' as const },
  logoMain: { width: 96, height: 24, objectFit: 'contain' as const },
  headerDivider: { width: 2, height: 26, backgroundColor: t.sky, marginHorizontal: 12 },
  headerClinicText: { fontSize: 9, color: t.textMuted, lineHeight: 1.5 },
  headerTitleBlock: { alignItems: 'flex-end' as const },
  headerTitle: { fontSize: 12.5, fontWeight: 600, color: t.navy },
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

  patientGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, marginBottom: 16 },
  kvHalf: { width: '50%', marginBottom: 2 },
  kvFull: { width: '100%', marginTop: 2 },
  kvKey: { color: t.textMuted, width: 60 },
  kvRow: { flexDirection: 'row' as const, fontSize: 9.5 },

  phaseBlock: { marginBottom: 14 },
  phaseTitle: { fontSize: 11.5, fontWeight: 600, color: t.navy, marginBottom: 5 },
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
  colEgysegar: { width: 72, textAlign: 'right' as const },
  colOsszeg: { width: 80, textAlign: 'right' as const },
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

  savosFootnote: { fontSize: 8, color: t.textMuted, marginBottom: 14, lineHeight: 1.5 },

  bottomRow: {
    flexDirection: 'row' as const,
    borderTopWidth: 1,
    borderTopColor: t.line,
    paddingTop: 12,
  },
  toothChartBlock: { flexGrow: 1 },
  toothChartLabel: { fontSize: 8, color: t.textMuted, marginBottom: 5 },
  summaryBlockNarrow: { width: 190 },
  summaryBlockFull: { width: '100%' },
  summaryLine: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  summaryLabelMuted: { fontSize: 9, color: t.textMuted },
  summaryDivider: { height: 1.5, backgroundColor: t.navy, marginVertical: 5 },
  summaryTotalLabel: { fontSize: 11, fontWeight: 600, color: t.navy },
  summaryTotalValue: { fontSize: 11, fontWeight: 600, color: t.navy },
  validityNote: { fontSize: 8, color: t.textMuted, marginTop: 6, lineHeight: 1.5 },

  h2: { fontSize: 12.5, fontWeight: 600, color: t.navy, marginBottom: 10 },
  bulletRow: { flexDirection: 'row' as const, marginBottom: 5 },
  bulletDot: { width: 12, fontSize: 9.5 },
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.5 },
  legalText: { fontSize: 8.5, lineHeight: 1.6 },

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
  footerText: { fontSize: 7.5, color: t.textFaint, lineHeight: 1.5 },
  footerTextRight: { fontSize: 7.5, color: t.textFaint, lineHeight: 1.5, textAlign: 'right' as const },
};

function Kv({ k, v, full }: { k: string; v: string; full?: boolean }) {
  return (
    <View style={full ? s.kvFull : s.kvHalf}>
      <View style={s.kvRow}>
        <Text style={s.kvKey}>{k}</Text>
        <Text>{v || '—'}</Text>
      </View>
    </View>
  );
}

function MainHeader({ plan, settings }: { plan: Plan; settings: Settings }) {
  return (
    <View style={s.mainHeader}>
      <View style={s.mainHeaderLeft}>
        <Image src={logoUrl} style={s.logoMain} />
        <View style={s.headerDivider} />
        <View>
          <Text style={s.headerClinicText}>{settings.rendelo.cim}</Text>
          <Text style={s.headerClinicText}>
            {settings.rendelo.telefon} · {settings.rendelo.email}
          </Text>
        </View>
      </View>
      <View style={s.headerTitleBlock}>
        <Text style={s.headerTitle}>Kezelési terv és árajánlat</Text>
        <Text style={s.headerMeta}>
          {plan.tervId} · v{plan.verzio} · {formatHuDateShort(plan.keltezes)}
        </Text>
      </View>
    </View>
  );
}

function MiniHeader({ plan }: { plan: Plan }) {
  return (
    <View style={s.miniHeader}>
      <Image src={logoUrl} style={s.logoMini} />
      <Text style={s.miniHeaderText}>Kezelési terv · {plan.paciens.nev}</Text>
    </View>
  );
}

function PhaseTable({ fazis, currency }: { fazis: Fazis; currency: Plan['penznem'] }) {
  return (
    <View style={s.phaseBlock}>
      <Text style={s.phaseTitle}>{fazis.megnevezes}</Text>
      <View style={s.tableHeaderRow}>
        <Text style={[s.th, s.colBeavatkozas]}>Beavatkozás</Text>
        <Text style={[s.th, s.colFog]}>Fog</Text>
        <Text style={[s.th, s.colDb]}>Db</Text>
        <Text style={[s.th, s.colEgysegar]}>Egységár</Text>
        <Text style={[s.th, s.colOsszeg]}>Összeg</Text>
      </View>
      {fazis.sorok.map((sor, i) => (
        <View key={i} style={s.tableRow}>
          <Text style={[s.td, s.colBeavatkozas]}>
            {sor.nevSnapshot}
            {sor.savos ? ' *' : ''}
          </Text>
          <Text style={[s.td, s.colFog]}>{sor.fogak}</Text>
          <Text style={[s.td, s.colDb]}>{sor.mennyiseg}</Text>
          <Text style={[s.td, s.colEgysegar]}>{formatMoney(sor.tenylegesEgysegar, currency)}</Text>
          <Text style={[s.td, s.colOsszeg]}>
            {formatMoney(sor.tenylegesEgysegar * sor.mennyiseg, currency)}
          </Text>
        </View>
      ))}
      <View style={s.phaseTotalRow}>
        <Text style={s.phaseTotalLabel}>Fázis összesen</Text>
        <Text style={s.phaseTotalValue}>{formatMoney(fazisOsszeg(fazis), currency)}</Text>
      </View>
      {fazis.megjegyzes ? <Text style={s.phaseNote}>Megjegyzés: {fazis.megjegyzes}</Text> : null}
    </View>
  );
}

function Footer({
  plan,
  settings,
  page,
  pages,
}: {
  plan: Plan;
  settings: Settings;
  page: number;
  pages: number;
}) {
  return (
    <View style={s.footer} fixed>
      <View style={s.footerRow}>
        <View>
          <Text style={s.footerText}>
            {settings.rendelo.nev} · {settings.rendelo.cim}
          </Text>
          <Text style={s.footerText}>
            Adószám: {settings.rendelo.adoszam || '—'} · Cégjegyzékszám:{' '}
            {settings.rendelo.cegjegyzekszam || '—'}
          </Text>
        </View>
        <View>
          <Text style={s.footerTextRight}>
            {plan.paciens.nev} · {plan.tervId}
          </Text>
          <Text style={s.footerTextRight}>
            árlista {formatHuDateShort(plan.arlistaVerzio)} · {page} / {pages}
          </Text>
        </View>
      </View>
    </View>
  );
}

export interface TervDocumentProps {
  plan: Plan;
  settings: Settings;
  offerOnly: boolean;
  nyilatkozatMd: string;
  fizetesiFeltetelekMd: string;
}

export function TervDocument({
  plan,
  settings,
  offerOnly,
  nyilatkozatMd,
  fizetesiFeltetelekMd,
}: TervDocumentProps) {
  const pages = offerOnly ? 2 : 3;
  const grand = plan.fazisok.reduce((sum, p) => sum + fazisOsszeg(p), 0);
  const listTotal = plan.fazisok.reduce((sum, p) => sum + fazisListaOsszeg(p), 0);
  const hasRange = plan.fazisok.some((p) => p.sorok.some((l) => l.savos));
  const teeth = plan.fazisok.flatMap((p) => p.sorok.flatMap((l) => parseTeeth(l.fogak).teeth));
  const bulletLines = extractBulletLines(fizetesiFeltetelekMd);
  const nyilatkozatBody = stripMarkdownHeading(nyilatkozatMd);

  return (
    <Document>
      {/* ---------- 1. oldal ---------- */}
      <Page size="A4" style={s.page}>
        <MainHeader plan={plan} settings={settings} />

        <View style={s.patientGrid}>
          <Kv k="Név" v={plan.paciens.nev} />
          <Kv k="Telefon" v={plan.paciens.telefon} />
          <Kv k="Született" v={plan.paciens.szuletesiIdo} />
          <Kv k="E-mail" v={plan.paciens.email} />
          <Kv k="TAJ" v={plan.paciens.taj} />
          <View style={s.kvHalf} />
          <Kv k="Lakcím" v={plan.paciens.lakcim} full />
        </View>

        {plan.fazisok.map((fazis, i) => (
          <PhaseTable key={i} fazis={fazis} currency={plan.penznem} />
        ))}

        {hasRange && (
          <Text style={s.savosFootnote}>
            * A csillaggal jelölt tételek ára a kezelés során derül ki véglegesen, a megadott ár
            becslés.
          </Text>
        )}

        <View style={s.bottomRow}>
          {teeth.length > 0 && (
            <View style={s.toothChartBlock}>
              <Text style={s.toothChartLabel}>Érintett fogak</Text>
              <ToothChartPdf teeth={teeth} />
            </View>
          )}
          <View style={teeth.length > 0 ? s.summaryBlockNarrow : s.summaryBlockFull}>
            <View style={s.summaryLine}>
              <Text style={s.summaryLabelMuted}>Kezelések összesen</Text>
              <Text>{formatMoney(listTotal, plan.penznem)}</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryLine}>
              <Text style={s.summaryTotalLabel}>Fizetendő</Text>
              <Text style={s.summaryTotalValue}>{formatMoney(grand, plan.penznem)}</Text>
            </View>
            <Text style={s.validityNote}>
              Az ajánlat {formatHuDate(plan.ervenyesIg)}-ig érvényes.{'\n'}
              Az árak tartalmazzák az anyagköltséget.
            </Text>
          </View>
        </View>

        <Footer plan={plan} settings={settings} page={1} pages={pages} />
      </Page>

      {/* ---------- 2. oldal -- fizetési feltételek ---------- */}
      <Page size="A4" style={s.page}>
        <MiniHeader plan={plan} />
        <Text style={s.h2}>Fizetési feltételek</Text>
        {bulletLines.map((line, i) => (
          <View key={i} style={s.bulletRow}>
            <Text style={s.bulletDot}>•</Text>
            <Text style={s.bulletText}>{line}</Text>
          </View>
        ))}
        <Footer plan={plan} settings={settings} page={2} pages={pages} />
      </Page>

      {/* ---------- 3. oldal -- nyilatkozat és aláírás ---------- */}
      {!offerOnly && (
        <Page size="A4" style={s.page}>
          <MiniHeader plan={plan} />
          <Text style={s.h2}>Nyilatkozat</Text>
          <Text style={s.legalText}>{nyilatkozatBody}</Text>

          <View style={s.signatureBlock}>
            <Text style={s.signatureDate}>Budapest, {formatHuDate(plan.keltezes)}</Text>
            <View style={s.signatureCols}>
              <View style={s.signatureCol}>
                <Text style={s.signatureRoleLabel}>Megbízott:</Text>
                <View style={s.signatureLine}>
                  <Text style={s.signatureName}>{plan.orvos}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.signatureRoleLabel}>Megrendelő:</Text>
                <View style={s.signatureLine}>
                  <Text style={s.signatureName}>{plan.paciens.nev}</Text>
                </View>
              </View>
            </View>

            {plan.paciens.kiskoru && (
              <Text style={s.guardianNote}>
                Cselekvőképesség hiányában, vagy korlátozott cselekvőképesség esetén a beteg
                helyett CSAK a törvényes képviselő írhatja alá.
                {plan.paciens.torvenyesKepviselo ? ` (${plan.paciens.torvenyesKepviselo})` : ''}
              </Text>
            )}
          </View>

          <Footer plan={plan} settings={settings} page={3} pages={pages} />
        </Page>
      )}
    </Document>
  );
}
