// A nyomtatvány fejléc-/lábléc-komponensei -- kiemelve a TervDocument.tsx-ből.

import { Image, Text, View } from '@react-pdf/renderer';
import { formatShortDate } from '../../domain/date';
import type { Plan, Settings } from '../../domain/types';
import type { PdfLabels } from '../labels';
import logoUrl from '../../assets/logo.png';
import { s } from './styles';

// Üres érték esetén a mező sora TELJESEN kimarad (nem `—`) -- a doki nem
// néz üres sorokat egy szerződéses dokumentumon.
export function Kv({ k, v }: { k: string; v: string }) {
  if (!v) return null;
  return (
    <View style={s.kvRow}>
      <Text style={s.kvKey}>{k}</Text>
      <Text style={s.kvValue}>{v}</Text>
    </View>
  );
}

export function MainHeader({ plan, settings, L }: { plan: Plan; settings: Settings; L: PdfLabels }) {
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

export function MiniHeader({ plan, L, fixed }: { plan: Plan; L: PdfLabels; fixed?: boolean }) {
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

export function Footer({ plan, settings, L }: { plan: Plan; settings: Settings; L: PdfLabels }) {
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
