// Egy fázis táblázata a nyomtatványon -- kiemelve a TervDocument.tsx-ből.

import { Fragment } from 'react';
import { Text, View } from '@react-pdf/renderer';
import { formatMoney } from '../../domain/money';
import { formatTeethForPrint } from '../../domain/teeth';
import { fazisOsszeg } from '../../domain/totals';
import type { Fazis, Plan } from '../../domain/types';
import type { PdfLabels } from '../labels';
import { pdfFazisNev } from '../pdfCimLokalizacio';
import { s } from './styles';

export function PhaseTable({
  fazis,
  pos,
  currency,
  nyelv,
  leirasokMutatasa,
  L,
}: {
  fazis: Fazis;
  /** 1-alapú pozíció a tervben -- a generált fázisnév-minta (pdfCimLokalizacio.ts) ehhez kötött. */
  pos: number;
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
        <Text style={s.phaseTitle}>{pdfFazisNev(fazis.megnevezes, pos, nyelv)}</Text>
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
