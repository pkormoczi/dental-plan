// D79: a véglegesítés-őr (D76, `domain/veglegesitesOr.ts`) egységes
// `VeglegesitesCsekklista`-jának read-only renderelése -- kiemelve a
// `PreviewPage.tsx`-ből, hogy a két hasábos elrendezés (lásd ott) mindkét oldala
// önálló, olvasható komponens maradjon. Nincs benne üzleti logika, tisztán
// prezentációs: a súlyosság->szín és a route->gombfelirat leképezés is itt él,
// mert csak ez a komponens rendereli a csekklistát.

import { Button, Callout, Flex, Text } from '@radix-ui/themes';
import type {
  CsekklistaRoute,
  CsekklistaSulyossag,
  VeglegesitesCsekklista,
} from '../../domain/veglegesitesOr';

const SULYOSSAG_SZIN: Record<CsekklistaSulyossag, 'red' | 'amber' | 'gray'> = {
  hard: 'red',
  soft: 'amber',
  info: 'gray',
};

const ROUTE_GOMB_FELIRAT: Record<CsekklistaRoute, string> = {
  '/paciens': 'Terv adatai',
  '/terv': 'Vissza a szerkesztőbe',
  '/arlista': 'Árlista',
  '/beallitasok': 'Beállítások',
};

export interface VeglegesitesChecklistProps {
  csekklista: VeglegesitesCsekklista;
  onNavigate: (route: CsekklistaRoute) => void;
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
            {tetel.reszletek?.map((reszlet) => (
              <Text as="p" key={reszlet.cim} size="1" mt="1">
                {reszlet.cim} ({reszlet.nevek.length}): {reszlet.nevek.slice(0, 8).join('; ')}
                {reszlet.nevek.length > 8 ? ` … és további ${reszlet.nevek.length - 8}` : ''}
              </Text>
            ))}
          </Callout.Text>
          {(tetel.route || (tetel.id === 'nyelvi-review' && nyelviReviewAction)) && (
            <Flex mt="2" gap="2">
              {tetel.route && (
                <Button variant="soft" color="gray" onClick={() => onNavigate(tetel.route!)}>
                  {ROUTE_GOMB_FELIRAT[tetel.route]}
                </Button>
              )}
              {/* 65. tétel (D72): a guided review indítása -- a session-t a
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
