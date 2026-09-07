// A "pénzügyi összesítés" slot tartalma a Terv részletei nézeten.
// A Végösszeg és az előleg a mentett
// `plan.osszesitok`-ból jön, nem a `tervVegosszeg()` újraszámolásából: egy
// lezárt dokumentumnak az aláírt papírral kell egyeznie, nem a mai kódból
// újraszámolt értékkel. A referenciasor a mentett SOROKBÓL számol -- azok is
// a pillanatkép részei, és a nyomtatvánnyal kell egyeznie; a kettő eltérését
// az `osszesitokElter` callout mutatja ki.
// A feliratok a nyomtatvány szókincsét követik (`pdf/labels.ts`), nem a
// szerkesztőét -- ez a lap egy lezárt dokumentum nézete.

import { Box, Callout, Flex, Text } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import Section from '../../components/Section';
import { t } from '../../design/tokens';
import { formatMoney } from '../../domain/money';
import { elolegOsszegek, osszesitokElter, sorokOsszeg } from '../../domain/totals';
import type { Plan } from '../../domain/types';

export default function PenzugyiOsszesites({ plan }: { plan: Plan }) {
  const { osszesitok } = plan;
  const penz = (ertek: number) => formatMoney(ertek, plan.penznem, plan.nyelv);

  // Ez a függvény eddig KIZÁRÓLAG piszkozat-betöltéskor futott -- egy
  // véglegesített verzió puszta megtekintésekor semmi nem ellenőrizte, hogy
  // a mentett összesítő egyezik-e a mentett sorokkal.
  const ujraszamolt = osszesitokElter(osszesitok, plan.fazisok, plan.kedvezmenyOsszeg);

  const elolegOsszeg = plan.elolegOsszeg ?? null;
  // A STORED `fizetendo` a bemenet, sosem az újraszámolt `tervVegosszeg()`.
  const fizetes = elolegOsszeg == null ? null : elolegOsszegek(osszesitok.fizetendo, elolegOsszeg);

  const kezelesekReferencia = sorokOsszeg(plan.fazisok);

  const becsultDb = plan.fazisok.reduce((n, f) => n + f.sorok.filter((s) => s.savos).length, 0);

  return (
    <Section title="Pénzügyi összesítés">
      {/* Ugyanaz a szabály, mint a nyomtatványon: a referencia a mentett sorok
          összege, és csak LEFELÉ nyílik (felár-irányban nem) -- a nézet úgy
          olvasódjon, mint a dokumentum, referencia felül, alatta a Végösszeg. */}
      {kezelesekReferencia > osszesitok.fizetendo && (
        <>
          <Flex justify="between" align="baseline" gap="4">
            <Text size="2" style={{ color: t.uiTextMuted }}>
              Kezelések összege
            </Text>
            <Text size="2" style={{ color: t.uiTextMuted, fontVariantNumeric: 'tabular-nums' }}>
              {penz(kezelesekReferencia)}
            </Text>
          </Flex>
          <Box my="2" style={{ borderTop: `1px solid ${t.uiLine}` }} />
        </>
      )}

      <Flex justify="between" align="baseline" gap="4">
        <Text size="3" color="gray">
          Végösszeg
        </Text>
        <Text size="6" weight="bold" style={{ color: t.brand, fontVariantNumeric: 'tabular-nums' }}>
          {penz(osszesitok.fizetendo)}
        </Text>
      </Flex>

      {/* Közvetlenül a Végösszeg alatt, a "Fizetés" alcsoport ELŐTT: az
          előleg és a fennmaradó rész ebből a (becsült) összegből számol,
          tehát a bizonytalanságot előbb kell kimondani, mint a belőle
          származtatott számokat. Puszta ténymegállapítás, nem navigáció --
          nem kattintható. */}
      {becsultDb > 0 && (
        <Text as="p" size="1" mt="2" style={{ color: t.uiTextMuted }}>
          {becsultDb} tétel ára becsült — a végleges összeg a kezelés során derül ki.
        </Text>
      )}

      {fizetes && (
        <Box mt="4">
          <Text as="p" size="2" weight="medium" mb="2" style={{ color: t.uiTextMuted }}>
            Fizetés
          </Text>
          <Flex justify="between" align="baseline" gap="4">
            <Text size="2" style={{ color: t.uiTextMuted }}>
              Előleg
            </Text>
            <Text size="2" style={{ color: t.uiTextMuted, fontVariantNumeric: 'tabular-nums' }}>
              {penz(fizetes.eloleg)}
            </Text>
          </Flex>
          <Flex justify="between" align="baseline" gap="4" mt="1">
            <Text size="3">Fennmaradó rész</Text>
            <Text size="3" weight="medium" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {/* `null`: az előleg meghaladja a fizetendőt -- a véglegesítés-őr
                  ezt kemény blokkal fogja meg, de egy régebbi, a blokk előtt
                  született fájlon ez a nézet sem törhet el. */}
              {fizetes.fennmarado == null ? '—' : penz(fizetes.fennmarado)}
            </Text>
          </Flex>
        </Box>
      )}

      {ujraszamolt && (
        <Callout.Root color="gray" size="1" mt="3">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            A mentett összesítő nem egyezik a mentett sorokból újraszámolt értékkel (újraszámolva:{' '}
            <Text weight="bold">{penz(ujraszamolt.fizetendo)}</Text>). A fent látható, fájlban lévő
            érték az igazság — az aláírt papírral ennek kell egyeznie.
          </Callout.Text>
        </Callout.Root>
      )}
    </Section>
  );
}
