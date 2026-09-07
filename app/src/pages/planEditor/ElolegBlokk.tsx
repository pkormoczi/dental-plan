// Előleg-kapcsoló blokk -- kiemelve a PlanEditorPage.tsx-ből.

import { useEffect, useRef, useState } from 'react';
import { Box, Checkbox, Flex, Text } from '@radix-ui/themes';
import ChipGroup from '../../components/ChipGroup';
import NumberField from '../../components/NumberField';
import { t } from '../../design/tokens';
import { formatMoney } from '../../domain/money';
import { elolegOsszegek, elolegSzazalekbol, elolegTullepi } from '../../domain/totals';
import type { Nyelv, Penznem } from '../../domain/types';

type ElolegMod = 'osszeg' | 'szazalek';

export interface ElolegBlokkProps {
  grand: number;
  currency: Penznem;
  nyelv: Nyelv;
  elolegOsszeg: number | null;
  onChange: (next: number | null) => void;
}

/**
 * Előleg-kapcsoló (backlog-9, abszolút összeg; a 91. tétel a
 * százalékos bevitellel bővítette). A `Summary` ALATT áll, mert az előleg a
 * végösszegből számol -- ez az a pillanat, amikor a doki amúgy is azt nézi.
 *
 * A `Plan` továbbra is egyetlen nullázható mezőt hordoz (`elolegOsszeg`,
 * `null` = nincs előleg-sor a nyomtatványon). A "bekapcsolva, de a doki még
 * nem írt be összeget" állapot viszont KIZÁRÓLAG komponens-lokális (`on`) --
 * bekapcsoláskor a mező üresen, azonnali fókusszal jelenik meg, előtöltés
 * nélkül, és amíg a doki nem commitál egy összeget, a `Plan`-en
 * marad `null`. Ez zárja ki, hogy egy "bekapcsolt, de értelmetlen" állapot
 * perzisztálódjon.
 *
 * A Ft/% módváltó (`mod`) és a %-mező piszkozata (`szazalek`) SZINTÉN
 * komponens-lokális -- a százalék csak beviteli segéd `elolegSzazalekbol()`-
 * hoz, a `Plan`-en mindig a belőle
 * számolt abszolút összeg landol.
 */
export default function ElolegBlokk({ grand, currency, nyelv, elolegOsszeg, onChange }: ElolegBlokkProps) {
  const [on, setOn] = useState(() => elolegOsszeg != null);
  // Az `autoFocus` a doki MOZDULATÁHOZ kötődik (pipa bekapcsolása, Ft/%
  // módváltás), nem a mező puszta megjelenéséhez: egy betöltött előlegű
  // piszkozat megnyitásakor (F5, "Vissza a szerkesztőbe") a mező már az első
  // renderben ott van, és a kurzornak ott kell maradnia, ahol a doki hagyta.
  const [fokuszKerve, setFokuszKerve] = useState(false);
  const [mod, setMod] = useState<ElolegMod>('osszeg');
  const [szazalek, setSzazalek] = useState<number | null>(null);
  // Van-e ÉRVÉNYES, commitált érték a mezőben -- ezt nézi a kötelező-mező
  // hiba (csak blur/véglegesítési kísérlet után), NEM a prop-ot: az
  // `onChange` a szülő state-jét frissíti, ami csak a KÖVETKEZŐ renderben ér
  // vissza propként. Ugyanígy nem lehet React state sem: az `onCommit`-tal
  // egy tickben lefutó NumberField `onBlur` a JELENLEGI render zárványát
  // látja, egy `setState` hatása is csak a KÖVETKEZŐ renderben érne vissza
  // -- ezért ref, nem state.
  const helyesErtekRef = useRef(elolegOsszeg != null);
  const [hibaLatszik, setHibaLatszik] = useState(false);
  // A LEGUTÓBB, ebből a komponensből kiküldött összeg -- megkülönbözteti a
  // saját `onChange` visszapattanását (a mód NEM vált vissza, lásd lent) egy
  // valódi külső prop-változástól (terv betöltése/másolása).
  const utoljaraKuldottRef = useRef(elolegOsszeg);

  // Külső prop-változást követ (pl. terv betöltése/másolása) -- a doki épp
  // folyamatban lévő, még nem commitált gépelését a NumberField saját
  // `focused`-őre már megvédi, ez csak a kapcsoló ki/be és a mód állapotát.
  useEffect(() => {
    setOn(elolegOsszeg != null);
    helyesErtekRef.current = elolegOsszeg != null;
    if (elolegOsszeg !== utoljaraKuldottRef.current) {
      setMod('osszeg');
      setSzazalek(null);
      // Külső prop-változásból eredő megjelenés nem a doki mozdulata.
      setFokuszKerve(false);
    }
  }, [elolegOsszeg]);

  function kuld(next: number | null) {
    utoljaraKuldottRef.current = next;
    onChange(next);
  }

  const tullepi = on && elolegOsszeg != null && elolegTullepi(grand, elolegOsszeg);
  const osszegek = on && elolegOsszeg != null ? elolegOsszegek(grand, elolegOsszeg) : null;

  return (
    <Box mt="3">
      <Text as="label" size="2" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Checkbox
          checked={on}
          onCheckedChange={(checked) => {
            if (checked === true) {
              setOn(true);
              setFokuszKerve(true);
              helyesErtekRef.current = false;
              setHibaLatszik(false);
              return;
            }
            setOn(false);
            setMod('osszeg');
            setSzazalek(null);
            helyesErtekRef.current = false;
            setHibaLatszik(false);
            kuld(null);
          }}
        />
        Ez a terv fogtechnikai munkát tartalmaz — előleg feltüntetése
      </Text>

      {on && (
        <Box mt="2">
          <Flex justify="between" align="center" gap="3">
            <Text size="2" color="gray">
              Előleg
            </Text>
            <Flex align="center" gap="2">
              {grand > 0 && (
                <ChipGroup
                  value={mod}
                  onChange={(v) => {
                    setMod(v);
                    setFokuszKerve(true);
                    if (v === 'szazalek') setSzazalek(null);
                  }}
                  options={[
                    ['osszeg', currency === 'EUR' ? '€' : 'Ft'],
                    ['szazalek', '%'],
                  ]}
                  ariaLabel="Előleg megadása"
                />
              )}
              <Box style={{ width: 120 }}>
                {mod === 'szazalek' && grand > 0 ? (
                  <NumberField
                    // Külön `key` a két ágon -- enélkül React ugyanazt a
                    // `NumberField`-példányt (és mögötte az `<input>` DOM-
                    // node-ot) frissítené módváltáskor, az `autoFocus` pedig
                    // csak ÚJ node létrejöttekor tüzel.
                    key="szazalek"
                    id="eloleg-szazalek"
                    value={szazalek}
                    penz={false}
                    min={0}
                    autoFocus={fokuszKerve}
                    aria-label="Előleg százaléka"
                    textAlign="right"
                    onCommit={(v) => {
                      // A NumberField `min={0}`-ja már kizárja a negatívot,
                      // a felső 100-as korlát itt szorít -- a felkerekítés
                      // (elolegSzazalekbol) ettől MÉG a fizetendő fölé is
                      // vihet, azt a MEGLÉVŐ `tullepi` ág fogja meg.
                      const clamped = Math.min(100, v);
                      const ujOsszeg = elolegSzazalekbol(grand, clamped);
                      // 0% -- ugyanaz a canonical disable, mint a 0 Ft (lásd az
                      // összeg-módú ág lent): egy "0 összegű előleg" nem
                      // értelmes állapot.
                      if (ujOsszeg === 0) {
                        setOn(false);
                        setMod('osszeg');
                        setSzazalek(null);
                        helyesErtekRef.current = false;
                        setHibaLatszik(false);
                        kuld(null);
                        return;
                      }
                      setSzazalek(clamped);
                      helyesErtekRef.current = true;
                      setHibaLatszik(false);
                      kuld(ujOsszeg);
                    }}
                    onBlur={() => setHibaLatszik(!helyesErtekRef.current)}
                  />
                ) : (
                  <NumberField
                    key="osszeg"
                    id="eloleg-osszeg"
                    value={elolegOsszeg}
                    penz
                    unit={currency}
                    min={0}
                    autoFocus={fokuszKerve}
                    aria-label="Előleg összege"
                    textAlign="right"
                    onCommit={(v) => {
                      // Explicit 0 -- canonical disable: a kapcsoló
                      // automatikusan kikapcsol, a mező eltűnik ("0
                      // összegű előleg" nem értelmes állapot).
                      if (v === 0) {
                        setOn(false);
                        helyesErtekRef.current = false;
                        setHibaLatszik(false);
                        kuld(null);
                        return;
                      }
                      helyesErtekRef.current = true;
                      setHibaLatszik(false);
                      kuld(Math.max(0, Math.round(v)));
                    }}
                    onBlur={() => setHibaLatszik(!helyesErtekRef.current)}
                  />
                )}
              </Box>
            </Flex>
          </Flex>
          {grand === 0 && (
            <Text as="div" size="1" color="gray" mt="1">
              Százalékos megadás kezelési sorok felvétele után.
            </Text>
          )}
          {mod === 'szazalek' && grand > 0 && elolegOsszeg != null && (
            <Flex justify="between" align="baseline" mt="1">
              <Text size="2" color="gray">
                Előleg összege
              </Text>
              <Text size="2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(elolegOsszeg, currency, nyelv)}
              </Text>
            </Flex>
          )}
          {hibaLatszik && (
            <Text as="div" size="1" mt="1" style={{ color: t.danger }}>
              {mod === 'szazalek' && grand > 0
                ? 'Add meg az előleg százalékát.'
                : 'Add meg az előleg összegét.'}
            </Text>
          )}
          {tullepi && (
            <Text as="div" size="1" mt="1" style={{ color: t.danger }}>
              Az előleg nagyobb, mint a fizetendő. A véglegesítéshez csökkentsd az összeget, vagy
              módosítsd a sorokat.
            </Text>
          )}
          <Flex justify="between" align="baseline" mt="1">
            <Text size="2" color="gray">
              Fennmaradó rész
            </Text>
            <Text size="2" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {osszegek?.fennmarado == null ? '—' : formatMoney(osszegek.fennmarado, currency, nyelv)}
            </Text>
          </Flex>
        </Box>
      )}
    </Box>
  );
}
