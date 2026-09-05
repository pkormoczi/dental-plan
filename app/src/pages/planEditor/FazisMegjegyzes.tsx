// Fázismegjegyzés progresszív elrejtése -- kiemelve a PlanEditorPage.tsx-ből.

import { useEffect, useState } from 'react';
import { Badge, Box, Button, Flex, IconButton, TextField } from '@radix-ui/themes';
import { CheckIcon } from '@radix-ui/react-icons';
import type { Nyelv } from '../../domain/types';
import { fazisMegjegyzesId } from './elemIdk';

export interface FazisMegjegyzesProps {
  pi: number;
  value: string;
  onChange: (v: string) => void;
  /** backlog-65 -- a mező nyelvi mismatch-e. */
  nyelvMismatch: boolean;
  authoredNyelv: Nyelv | undefined;
  onReview: () => void;
  /** 65. tétel: a guided review kényszerítve nyitja a sávot -- lásd `LineRow` `forceLeirasOpen`-jét. */
  forceOpen: boolean;
  /** Igaz, ha a megjegyzés egy másolt tervből öröklődött és még nincs szerkesztve -- `domain/orokoltJelzesek.ts` `orokoltMegjegyzesu()`. */
  orokolt: boolean;
}

/**
 * Fázismegjegyzés progresszív elrejtése -- a `LineRow` „+ leírás"
 * mintáját követi (`leirasNyitva`), alapból nyitva, ha már van tartalma.
 * A megjegyzés MINDIG nyomtatódik, függetlenül a „Tétel-leírások
 * nyomtatása" kapcsolótól -- ez a mező nem a `Tetel.leiras` snapshotja.
 */
export default function FazisMegjegyzes({
  pi,
  value,
  onChange,
  nyelvMismatch,
  authoredNyelv,
  onReview,
  forceOpen,
  orokolt,
}: FazisMegjegyzesProps) {
  const [nyitva, setNyitva] = useState(Boolean(value.trim()));
  useEffect(() => {
    if (forceOpen) setNyitva(true);
  }, [forceOpen]);
  return (
    <Box mt="3">
      <Button
        type="button"
        size="1"
        variant="ghost"
        color={nyelvMismatch ? 'amber' : 'gray'}
        aria-expanded={nyitva}
        title={nyelvMismatch ? 'A megjegyzés nyelve ellenőrzésre vár' : undefined}
        onClick={() => setNyitva((v) => !v)}
      >
        {value.trim() ? 'Megjegyzés' : '+ megjegyzés'}
      </Button>
      {nyitva && (
        <Flex align="center" gap="1" mt="1">
          <Box flexGrow="1">
            <TextField.Root
              id={fazisMegjegyzesId(pi)}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Megjegyzés a fázishoz (megjelenik a nyomtatványon)"
            />
          </Box>
          {orokolt && (
            <Badge color="gray" variant="soft" size="1">
              örökölt
            </Badge>
          )}
          {nyelvMismatch && (
            <>
              <Badge color="amber" variant="soft" size="1">
                {authoredNyelv === 'de' ? 'DE szöveg' : 'HU szöveg'}
              </Badge>
              <IconButton
                type="button"
                variant="ghost"
                color="gray"
                size="1"
                aria-label="Nyelv ellenőrizve"
                title="Nyelv ellenőrizve — a szöveg megfelel ezen a nyelven"
                onClick={onReview}
              >
                <CheckIcon />
              </IconButton>
            </>
          )}
        </Flex>
      )}
    </Box>
  );
}
