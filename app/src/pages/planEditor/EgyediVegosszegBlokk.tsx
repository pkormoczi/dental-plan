// Egyedi végösszeg blokk -- kiemelve a PlanEditorPage.tsx-ből.

import { useEffect, useRef, useState } from 'react';
import { AlertDialog, Box, Button, Checkbox, Flex, Text } from '@radix-ui/themes';
import NumberField from '../../components/NumberField';
import { t } from '../../design/tokens';
import { formatMoney } from '../../domain/money';
import type { Nyelv, Penznem } from '../../domain/types';

export interface EgyediVegosszegBlokkProps {
  sorszintuOsszeg: number;
  currency: Penznem;
  nyelv: Nyelv;
  kedvezmenyOsszeg: number | null;
  onChange: (next: number | null) => void;
}

/**
 * Egyedi végösszeg (a fix-összeg tárolás elvének bővítése: az eltérés tárolódik,
 * nem a begépelt cél -- egy utólagos sormódosítás különben némán átírná). A `Summary` ÉS
 * az `ElolegBlokk` KÖZÖTT áll: az előleg a CSÖKKENTETT végösszegből számol,
 * a vizuális sorrend kövesse a számítási sorrendet.
 *
 * A doki a kívánt VÉGÖSSZEGET gépeli be, de a `Plan`-en előjeles fix
 * eltérés tárolódik (`kedvezmenyOsszeg` -- pozitív kedvezmény, negatív
 * felár). A `NumberField`-nek nincs `max` propja, és a felső
 * korlát sincs -- a cél a sorok összege fölé is állítható.
 *
 * A kapcsoló bekapcsolása KÜLÖN lokális `be` állapotot tart: a
 * `kedvezmenyOsszeg` `null` marad, amíg a doki nem commitál (blur/Enter),
 * hogy a mező üresen, azonnali fókusszal induljon, ne egy hamis `0`
 * előtöltéssel. A `0` cél-végösszeg (teljes elengedés) egyszeri
 * megerősítést kér -- a `nullaMegerositve` addig érvényes, amíg a cél `0`
 * marad, egy 0→más→0 váltás újra kérdez.
 */
export default function EgyediVegosszegBlokk({
  sorszintuOsszeg,
  currency,
  nyelv,
  kedvezmenyOsszeg,
  onChange,
}: EgyediVegosszegBlokkProps) {
  const [be, setBe] = useState(kedvezmenyOsszeg != null);
  // CSAK bekapcsolni szabad innen -- ha a doki kikapcsolja, a kapcsoló
  // állapota `onChange(null)`-on át, a propon keresztül jön vissza.
  useEffect(() => {
    if (kedvezmenyOsszeg != null) setBe(true);
  }, [kedvezmenyOsszeg]);

  // A tényleges (0-ra padlózott) Fizetendő -- ez a mező kiinduló/megjelenő
  // értéke, nem a nyers `kedvezmenyOsszeg - sorszintuOsszeg` levonás, ami
  // negatívba fordulhatna kedvezmény-ágon a sorok utólagos törlésekor.
  // `null`, amíg a doki még nem commitált -- ez adja az üres mezőt.
  const celVegosszeg = kedvezmenyOsszeg == null ? null : Math.max(0, sorszintuOsszeg - kedvezmenyOsszeg);
  const tulLog = kedvezmenyOsszeg != null && kedvezmenyOsszeg > sorszintuOsszeg;

  const [hiba, setHiba] = useState(false);
  const [nullaMegerositve, setNullaMegerositve] = useState(celVegosszeg === 0);
  useEffect(() => {
    if (celVegosszeg !== 0) setNullaMegerositve(false);
  }, [celVegosszeg]);
  const [pendingZero, setPendingZero] = useState<{ kedvezmeny: number } | null>(null);

  // Van-e ÉRVÉNYES, commitált érték a mezőben -- ezt nézi a kötelező-mező
  // hiba (csak blur után), NEM a `kedvezmenyOsszeg` propot és NEM
  // `hiba`-val azonos módon state-et: a NumberField saját `onBlur`-ja
  // ugyanabban a tickben fut le, mint ami a commitot kiváltja, egy
  // `setState` hatása csak a KÖVETKEZŐ renderben érne vissza (lásd
  // ElolegBlokk blur-utáni-hiba kommentje) -- ref kell, hogy a blur-kor friss legyen.
  const helyesErtekRef = useRef(kedvezmenyOsszeg != null);

  function commitCel(v: number) {
    setHiba(false);
    const target = Math.max(0, Math.round(v));
    const nextKedvezmeny = sorszintuOsszeg - target;
    helyesErtekRef.current = true;
    if (target === 0 && !nullaMegerositve) {
      setPendingZero({ kedvezmeny: nextKedvezmeny });
      return;
    }
    onChange(nextKedvezmeny);
  }

  return (
    <Box mt="3">
      <Text as="label" size="2" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Checkbox
          checked={be}
          onCheckedChange={(checked) => {
            if (checked === true) {
              setBe(true);
              helyesErtekRef.current = false;
            } else {
              setBe(false);
              setHiba(false);
              setPendingZero(null);
              helyesErtekRef.current = false;
              onChange(null);
            }
          }}
        />
        Egyedi végösszeg beállítása
      </Text>

      {be && (
        <Box mt="2">
          <Flex justify="between" align="center" gap="3">
            <Text size="2" color="gray">
              Egyedi végösszeg
            </Text>
            <Box style={{ width: 120 }}>
              <NumberField
                value={celVegosszeg}
                penz
                min={0}
                unit={currency}
                aria-label="Egyedi végösszeg"
                textAlign="right"
                // Csak friss bekapcsoláskor (még nincs commitált érték) --
                // egy betöltött terven ez a mező már ki van töltve, ott nem
                // szabad elvinni a fókuszt.
                autoFocus={kedvezmenyOsszeg == null}
                onCommit={commitCel}
                // A kötelező-mező hiba csak blur/véglegesítési kísérlet
                // UTÁN jelenik meg, nem azonnal a kapcsoló bekapcsolásakor.
                onBlur={() => setHiba(!helyesErtekRef.current)}
              />
            </Box>
          </Flex>
          {kedvezmenyOsszeg != null && (
            <Text as="div" size="2" color="gray" mt="1" style={{ textAlign: 'right' }}>
              {kedvezmenyOsszeg > 0 && `→ ${formatMoney(kedvezmenyOsszeg, currency, nyelv)} kedvezmény`}
              {kedvezmenyOsszeg < 0 && `→ ${formatMoney(-kedvezmenyOsszeg, currency, nyelv)} felár`}
              {kedvezmenyOsszeg === 0 && '→ nincs eltérés a tételek összegétől'}
            </Text>
          )}
          {tulLog && (
            <Text as="div" size="1" mt="1" style={{ color: t.warn }}>
              A beállított kedvezmény nagyobb, mint a tételek összege — a fizetendő 0. Írd be
              újra az egyedi végösszeget.
            </Text>
          )}
          {hiba && (
            <Text as="div" size="1" mt="1" style={{ color: t.danger }}>
              Add meg az egyedi végösszeget, vagy kapcsold ki a jelölőt.
            </Text>
          )}
        </Box>
      )}

      <AlertDialog.Root
        open={pendingZero !== null}
        onOpenChange={(open) => !open && setPendingZero(null)}
      >
        <AlertDialog.Content maxWidth="440px">
          <AlertDialog.Title>Egyedi végösszeg: {formatMoney(0, currency, nyelv)}</AlertDialog.Title>
          <AlertDialog.Description size="2">
            A beállított egyedi végösszeg {formatMoney(0, currency, nyelv)} — ez a tételek teljes
            elengedését jelenti. Biztosan ezt szeretnéd?
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Mégse
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                onClick={() => {
                  if (pendingZero) {
                    onChange(pendingZero.kedvezmeny);
                    setNullaMegerositve(true);
                  }
                  setPendingZero(null);
                }}
              >
                Megerősítem
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}
