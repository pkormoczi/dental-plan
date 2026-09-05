// A véglegesítés-őr (`domain/veglegesitesOr.ts`) egységes
// `VeglegesitesCsekklista`-jának read-only renderelése -- kiemelve a
// `PreviewPage.tsx`-ből, hogy a két hasábos elrendezés (lásd ott) mindkét oldala
// önálló, olvasható komponens maradjon. Nincs benne üzleti logika, tisztán
// prezentációs: a súlyosság->szín és a route->gombfelirat leképezés is itt él,
// mert csak ez a komponens rendereli a csekklistát.

import { Badge, Button, Callout, Flex, Text } from '@radix-ui/themes';
import type {
  CsekklistaTetel,
  CsekklistaRoute,
  CsekklistaSulyossag,
  VeglegesitesCsekklista,
} from '../../domain/veglegesitesOr';

const SULYOSSAG_SZIN: Record<CsekklistaSulyossag, 'red' | 'amber' | 'gray'> = {
  hard: 'red',
  soft: 'amber',
  info: 'gray',
};

/**
 * Egynél több `reszletek`-alcsoportnál alcsoportonként külön jelvény-felirat
 * (pl. "Elavult árlistai pillanatkép: 2"), hogy egy összegzett szám ne
 * fedje el, hogy a sorok két eltérő okból érintettek -- lásd
 * `domain/arKoveti.ts` `arElteroSorok()`. Egyébként a `szamlalo` puszta
 * értéke egyetlen jelvényként.
 */
function jelvenyFeliratok(tetel: CsekklistaTetel): string[] {
  if (tetel.reszletek && tetel.reszletek.length > 1) {
    return tetel.reszletek.map((r) => `${r.cim}: ${r.nevek.length}`);
  }
  if (tetel.szamlalo != null) {
    return [String(tetel.szamlalo)];
  }
  return [];
}

const ROUTE_GOMB_FELIRAT: Record<CsekklistaRoute, string> = {
  '/paciens': 'Terv adatai',
  '/terv': 'Vissza a szerkesztőbe',
  '/arlista': 'Árlista',
  '/beallitasok': 'Beállítások',
  '/beallitasok?tab=nyomtatvanyok&nyelv=hu': 'Nyomtatvány szövegei',
  '/beallitasok?tab=nyomtatvanyok&nyelv=de': 'Nyomtatvány szövegei',
};

export interface VeglegesitesChecklistProps {
  csekklista: VeglegesitesCsekklista;
  /**
   * Elhagyva egyetlen tétel route-gombja sem jelenik meg -- a sikerképernyő
   * (105. tétel) ezt a csak-olvasó módot használja: a piszkozat ekkor már
   * törölve van, egy "Vissza a szerkesztőbe" gomb nem a most mentett
   * verzióba, hanem egy üres piszkozatba vinne.
   */
  onNavigate?: (route: CsekklistaRoute) => void;
  /**
   * A 'nyelvi-review' tétel guided-review indító gombja -- a hívó adja meg
   * (kell hozzá a `NyelviReviewContext` és az első cél), `undefined` esetén a
   * tétel a saját route-gombja nélkül (ha van) vagy gomb nélkül jelenik meg.
   */
  nyelviReviewAction?: { label: string; onClick: () => void };
}

/** A véglegesítés-őr checklist paneljének olvasható listája -- lásd a fájl fejlécét. */
export function VeglegesitesChecklist({
  csekklista,
  onNavigate,
  nyelviReviewAction,
}: VeglegesitesChecklistProps) {
  if (csekklista.tetelek.length === 0) {
    return (
      <Callout.Root color="gray">
        <Callout.Text>
          Nincs figyelmeztetés vagy hiányzó adat — a terv véglegesíthető.
        </Callout.Text>
      </Callout.Root>
    );
  }

  return (
    <Flex direction="column" gap="2">
      {csekklista.tetelek.map((tetel) => (
        <Callout.Root key={tetel.id} color={SULYOSSAG_SZIN[tetel.sulyossag]}>
          <Callout.Text>
            {tetel.cim}
            {jelvenyFeliratok(tetel).map((felirat) => (
              <Badge
                key={felirat}
                color={SULYOSSAG_SZIN[tetel.sulyossag]}
                variant="soft"
                size="1"
                ml="2"
                aria-hidden="true"
              >
                {felirat}
              </Badge>
            ))}
            {/* `as="span"` + `display: block`, nem `as="p"`: a szülő a Radix
                `Callout.Text`, ami maga egy `<p>` (az `asChild`-ja hard-kódolva
                `false`, tehát nem kerülhető meg) -- egy `<p>` itt érvénytelen DOM. */}
            {tetel.reszletek?.map((reszlet) => (
              <Text as="span" key={reszlet.cim} size="1" mt="1" style={{ display: 'block' }}>
                {reszlet.cim}: {reszlet.nevek.slice(0, 8).join('; ')}
                {reszlet.nevek.length > 8 ? ` … és további ${reszlet.nevek.length - 8}` : ''}
              </Text>
            ))}
          </Callout.Text>
          {((tetel.route && onNavigate) || (tetel.id === 'nyelvi-review' && nyelviReviewAction)) && (
            <Flex mt="2" gap="2">
              {tetel.route && onNavigate && (
                <Button variant="soft" color="gray" onClick={() => onNavigate(tetel.route!)}>
                  {ROUTE_GOMB_FELIRAT[tetel.route]}
                </Button>
              )}
              {/* 65. tétel: a guided review indítása -- a session-t a
                  `NyelviReviewContext` tartja, a `NyelviReviewBar.tsx` viszi
                  a szerkesztőbe a dokit. */}
              {tetel.id === 'nyelvi-review' && nyelviReviewAction && (
                <Button variant="soft" color="gray" onClick={nyelviReviewAction.onClick}>
                  {nyelviReviewAction.label}
                </Button>
              )}
            </Flex>
          )}
        </Callout.Root>
      ))}
    </Flex>
  );
}
