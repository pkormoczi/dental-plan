// Irányított nyelvi review nem-modális sávja -- 65. tétel (a feloldás
// szabálya: lásd app/src/domain/CLAUDE.md). A `TervWorkflowShell.tsx`-ben mountolva, a
// `NyelviReviewContext.tsx` `aktiv` jelzésekor jelenik meg. A "még N
// ellenőrizendő" szám és a következő cél MINDIG a JELENLEGI piszkozatból
// élőben számolódik (`nyelviMismatchek()`) -- ez a komponens a
// forrása, mert ennek van `plan`-hozzáférése, a Contextnek nincs.

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Flex, Text } from '@radix-ui/themes';
import { t } from '../design/tokens';
import { nyelviMismatchek, type ReviewCel } from '../domain/nyelviReview';
import { useAppState } from '../state/AppState';
import { useNyelviReview } from './NyelviReviewContext';

function celKulcs(cel: ReviewCel): string {
  return `${cel.mezo}|${cel.fazisIndex}|${cel.sorIndex ?? ''}`;
}

export default function NyelviReviewBar() {
  const nyelviReview = useNyelviReview();
  const { plan } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  // Session-belüli, EXPLICIT kihagyás -- külön a "feloldva" ténytől: egy
  // kihagyott, de továbbra is mismatch-es szöveg nem tűnik el a
  // `nyelviMismatchek()`-ből, csak a sáv "következő" javaslatából ugrik
  // tovább rajta. Session-újraindításkor törlődik.
  const [kihagyva, setKihagyva] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!nyelviReview.aktiv) setKihagyva(new Set());
  }, [nyelviReview.aktiv]);

  const mismatches = nyelviMismatchek(plan);
  const kovetkezo = mismatches.find((m) => !kihagyva.has(celKulcs(m.cel))) ?? null;
  const jelenlegiKulcs = nyelviReview.cel ? celKulcs(nyelviReview.cel) : null;
  const jelenlegiMegVan = jelenlegiKulcs != null && mismatches.some((m) => celKulcs(m.cel) === jelenlegiKulcs);

  // Auto-advance -- ha a session aktív, de nincs (még/már) érvényes
  // cél (a jelenlegi "Nyelv ellenőrizve"-vel feloldódott, vagy a session
  // most indult cél nélkül), a következő élő mismatch-re lép; ha nincs
  // több, a session magától leáll.
  useEffect(() => {
    if (!nyelviReview.aktiv || jelenlegiMegVan) return;
    if (kovetkezo) nyelviReview.ugras(kovetkezo.cel);
    else nyelviReview.leallit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nyelviReview.aktiv, jelenlegiMegVan, kovetkezo?.cel]);

  // A cél mindig a szerkesztőben él -- ha a doki máshol van (pl. az
  // Előnézeten indította a review-t), a sáv odaviszi.
  useEffect(() => {
    if (nyelviReview.aktiv && nyelviReview.cel && location.pathname !== '/terv') {
      navigate('/terv');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nyelviReview.aktiv, jelenlegiKulcs, location.pathname]);

  if (!nyelviReview.aktiv) return null;

  function kihagy() {
    if (!nyelviReview.cel) return;
    const ujKihagyva = new Set(kihagyva).add(celKulcs(nyelviReview.cel));
    setKihagyva(ujKihagyva);
    const kov = mismatches.find((m) => !ujKihagyva.has(celKulcs(m.cel)));
    if (kov) nyelviReview.ugras(kov.cel);
    else nyelviReview.leallit();
  }

  return (
    <Flex
      align="center"
      justify="between"
      gap="3"
      py="2"
      px="3"
      mb="4"
      wrap="wrap"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1,
        background: t.accentWash,
        border: `1px solid ${t.uiLine}`,
        borderRadius: t.radius,
      }}
    >
      <Text size="2" weight="medium">
        Nyelvi ellenőrzés — még {mismatches.length} ellenőrizendő
      </Text>
      <Flex gap="2">
        <Button
          type="button"
          size="1"
          variant="soft"
          color="gray"
          onClick={nyelviReview.vissza}
          disabled={nyelviReview.elozmeny.length === 0}
        >
          Vissza
        </Button>
        <Button type="button" size="1" variant="soft" color="gray" onClick={kihagy} disabled={!nyelviReview.cel}>
          Kihagyás
        </Button>
        <Button type="button" size="1" variant="soft" color="gray" onClick={nyelviReview.leallit}>
          Befejezés
        </Button>
      </Flex>
    </Flex>
  );
}
