// Egy fázis fejléce + sortáblája a terv szerkesztőn -- kiemelve a
// PlanEditorPage.tsx-ből. Az `UndoRow` szándékosan ebben a fájlban marad
// (nem önálló fájlban): egy `<Table.Row colSpan={7}>`, ami kizárólag ennek
// a komponensnek a táblatörzsében érvényes, önállóan használva félrevezető
// lenne.

import { Fragment, useEffect, useRef, useState, type RefObject } from 'react';
import { Badge, Box, Button, Flex, IconButton, Table, Text, TextField } from '@radix-ui/themes';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { t } from '../../design/tokens';
import { arFrissites } from '../../domain/arKoveti';
import { formatMoney } from '../../domain/money';
import { resolveNev, sorFallback } from '../../domain/nev';
import { nyelviMismatch } from '../../domain/nyelviReview';
import { orokoltMegjegyzesu } from '../../domain/orokoltJelzesek';
import type { Fazis, Kategoria, Nyelv, Penznem, Sor, Tetel } from '../../domain/types';
import type { FogterkepAllapot } from '../../domain/toothVisual';
import { fazisKeresoId, fazisNevId, fazisPanelId, type FokuszCel } from './elemIdk';
import FazisMegjegyzes from './FazisMegjegyzes';
import ItemPicker from './ItemPicker';
import LineRow from './LineRow';

export interface PhaseSectionProps {
  pi: number;
  phase: Fazis;
  currency: Penznem;
  nyelv: Nyelv;
  available: Tetel[];
  kategoriak: Kategoria[];
  frequent: Tetel[];
  tetelekById: Map<string, Tetel>;
  fogterkep: FogterkepAllapot;
  /** 65. tétel: a guided review kényszerített-nyitás jelzése -- lásd `LineRow`/`FazisMegjegyzes`. */
  fokuszCel: FokuszCel;
  total: number;
  canDelete: boolean;
  autoFokusz: boolean;
  open: boolean;
  onToggleOpen: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAdd: (item: Tetel) => void;
  onAddEgyedi: (nev: string) => void;
  onPatchLine: (li: number, patch: Partial<Sor>) => void;
  onRequestArFrissites: (li: number) => void;
  onRemoveLine: (li: number) => void;
  onRestoreLine: (li: number, sor: Sor) => void;
  onRename: (v: string) => void;
  onNote: (v: string) => void;
  onReviewMegnevezes: () => void;
  onReviewMegjegyzes: () => void;
  onDelete: () => void;
}

export default function PhaseSection({
  pi,
  phase,
  currency,
  nyelv,
  available,
  kategoriak,
  frequent,
  tetelekById,
  fogterkep,
  fokuszCel,
  total,
  canDelete,
  autoFokusz,
  open,
  onToggleOpen,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onAdd,
  onAddEgyedi,
  onPatchLine,
  onRequestArFrissites,
  onRemoveLine,
  onRestoreLine,
  onRename,
  onNote,
  onReviewMegnevezes,
  onReviewMegjegyzes,
  onDelete,
}: PhaseSectionProps) {
  // Sortörléskor a maradék sorok indexe (li) eltolódik -- index-kulcs
  // mellett egy remount nélkül ugyanaz a DOM-csomópont (és benne a
  // LineRow lokális `keresoMod` állapota vagy egy soron belüli ItemPicker
  // gépelt szövege) átvándorolna egy MÁSIK sorra. Ugyanaz a minta, mint a
  // fázistörlésnél a fazisResetToken (lásd fent).
  const [sorResetToken, setSorResetToken] = useState(0);
  // Tisztán UI-réteg felirat, nem pénzösszeg-formázás -- nem indokol közös
  // domain segédfüggvényt.
  const penznemJel = currency === 'EUR' ? '€' : 'Ft';

  // backlog-65 -- lásd `LineRow`
  // hasonló konstansait.
  const megnevezesNyelvMismatch = nyelviMismatch(phase.megnevezesNyelv, nyelv);
  const megjegyzesNyelvMismatch = nyelviMismatch(phase.megjegyzesNyelv, nyelv);

  // Sortörlés Undo-sávja: a törölt sor + eredeti indexe rövid ideig
  // helyi state-ben, NEM egy általános undo-stack -- a `LineRow` DOM-eleme
  // eltűnik a törléssel, ezért ennek itt, a szülőjében kell élnie, hogy a
  // sáv túlélje. Egy újabb sortörlés lecseréli (nem halmozza) a korábbit.
  const [pendingUndo, setPendingUndo] = useState<{ index: number; sor: Sor } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (pendingUndo) undoButtonRef.current?.focus();
  }, [pendingUndo]);

  useEffect(
    () => () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    },
    [],
  );

  function removeWithUndo(li: number, sor: Sor) {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    onRemoveLine(li);
    setSorResetToken((n) => n + 1);
    setPendingUndo({ index: li, sor });
    // Nincs előírás a pontos időtartamra -- ennyi idő elég a sáv
    // észrevételéhez/elolvasásához, anélkül, hogy tartósan helyet foglalna.
    undoTimerRef.current = setTimeout(() => setPendingUndo(null), 8000);
  }

  function undoRemove() {
    if (!pendingUndo) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    onRestoreLine(pendingUndo.index, pendingUndo.sor);
    setSorResetToken((n) => n + 1);
    setPendingUndo(null);
  }

  return (
    <Box>
      <Flex justify="between" align="center" mb="3" gap="3">
        <Flex align="center" gap="2" flexGrow="1" style={{ minWidth: 0 }}>
          <IconButton
            type="button"
            variant="ghost"
            color="gray"
            size="1"
            aria-expanded={open}
            aria-controls={fazisPanelId(pi)}
            aria-label={open ? 'Fázis összecsukása' : 'Fázis kinyitása'}
            onClick={onToggleOpen}
          >
            {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </IconButton>
          <TextField.Root
            id={fazisNevId(pi)}
            value={phase.megnevezes}
            onChange={(e) => onRename(e.target.value)}
            style={{ maxWidth: 360, fontWeight: 600, color: t.brand }}
          />
          {megnevezesNyelvMismatch && (
            <>
              <Badge color="amber" variant="soft" size="1">
                {phase.megnevezesNyelv?.authoredInLanguage === 'de' ? 'DE szöveg' : 'HU szöveg'}
              </Badge>
              <IconButton
                type="button"
                variant="ghost"
                color="gray"
                size="1"
                aria-label="Nyelv ellenőrizve"
                title="Nyelv ellenőrizve — a szöveg megfelel ezen a nyelven"
                onClick={onReviewMegnevezes}
              >
                <CheckIcon />
              </IconButton>
            </>
          )}
          {/* Csukott fejléc-összegzés: név/darabszám/összeg -- nyitva
              a törzs ugyanezt (táblázat + lábléc) részletesen mutatja. */}
          {!open && (
            <Text size="2" color="gray" style={{ whiteSpace: 'nowrap' }}>
              {phase.sorok.length} tétel · {formatMoney(total, currency, nyelv)}
            </Text>
          )}
        </Flex>
        {/* ↑ ↓ 🗑 közvetlenül a fejlécen, három látható gomb -- a "legfeljebb
            két látható gomb egy adatsoron" szabály kivétele (a fázisfejléc
            szekciófejléc, nem lista-jellegű adatsor; az Árlista admin
            kategória-sora, PriceListAdminPage.tsx, ugyanezt teszi). */}
        <Flex gap="1" align="center">
          <IconButton
            type="button"
            aria-label="Fázis feljebb"
            variant="ghost"
            color="gray"
            size="1"
            disabled={!canMoveUp}
            onClick={onMoveUp}
          >
            <ArrowUpIcon />
          </IconButton>
          <IconButton
            type="button"
            aria-label="Fázis lejjebb"
            variant="ghost"
            color="gray"
            size="1"
            disabled={!canMoveDown}
            onClick={onMoveDown}
          >
            <ArrowDownIcon />
          </IconButton>
          {canDelete && (
            <IconButton
              type="button"
              aria-label="Fázis törlése"
              variant="ghost"
              color="gray"
              size="1"
              onClick={onDelete}
            >
              <TrashIcon />
            </IconButton>
          )}
        </Flex>
      </Flex>

      {open && (
        <Box id={fazisPanelId(pi)}>
          {(phase.sorok.length > 0 || pendingUndo) && (
            <Table.Root size="1" mb="3">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Beavatkozás</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="132px">Fog</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="88px" justify="center">
                    Db
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="104px" justify="end">
                    Listaár ({penznemJel})
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="148px" justify="end">
                    Ajánlati ár ({penznemJel})
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="112px" justify="end">
                    Összeg ({penznemJel})
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="32px" />
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {phase.sorok.map((l, li) => (
                  <Fragment key={`${sorResetToken}-${li}`}>
                    {pendingUndo?.index === li && (
                      <UndoRow nev={pendingUndo.sor.nevSnapshot} buttonRef={undoButtonRef} onUndo={undoRemove} />
                    )}
                    <LineRow
                      pi={pi}
                      li={li}
                      line={l}
                      currency={currency}
                      nyelv={nyelv}
                      available={available}
                      kategoriak={kategoriak}
                      fogterkep={fogterkep}
                      fallback={sorFallback(l, nyelv, tetelekById)}
                      tetel={tetelekById.get(l.tetelId)}
                      arFrissitesJavaslat={arFrissites(l, currency, tetelekById)}
                      // 65. tétel: a guided review a leírás-sávot
                      // kényszerítve nyitja, ha ez a sor a jelenlegi cél.
                      forceLeirasOpen={
                        fokuszCel?.mit === 'leiras' && fokuszCel.pi === pi && fokuszCel.li === li
                      }
                      onPatch={(p) => onPatchLine(li, p)}
                      onRequestArFrissites={() => onRequestArFrissites(li)}
                      onRemove={() => removeWithUndo(li, l)}
                    />
                  </Fragment>
                ))}
                {pendingUndo?.index === phase.sorok.length && (
                  <UndoRow nev={pendingUndo.sor.nevSnapshot} buttonRef={undoButtonRef} onUndo={undoRemove} />
                )}
              </Table.Body>
            </Table.Root>
          )}

          <ItemPicker
            id={fazisKeresoId(pi)}
            available={available}
            kategoriak={kategoriak}
            currency={currency}
            nyelv={nyelv}
            onPick={onAdd}
            onPickEgyedi={onAddEgyedi}
            autoFocus={autoFokusz}
          />

          {frequent.length > 0 && (
            <Flex gap="2" wrap="wrap" mt="2">
              {frequent.map((f) => (
                <Button
                  key={f.id}
                  type="button"
                  size="1"
                  variant="soft"
                  color="gray"
                  onClick={() => onAdd(f)}
                >
                  + {resolveNev(f.nev, nyelv).szoveg}
                </Button>
              ))}
            </Flex>
          )}

          <FazisMegjegyzes
            pi={pi}
            value={phase.megjegyzes}
            onChange={onNote}
            nyelvMismatch={megjegyzesNyelvMismatch}
            authoredNyelv={phase.megjegyzesNyelv?.authoredInLanguage}
            onReview={onReviewMegjegyzes}
            forceOpen={fokuszCel?.mit === 'fazisMegjegyzes' && fokuszCel.pi === pi}
            orokolt={orokoltMegjegyzesu(phase)}
          />

          <Flex
            justify="end"
            mt="3"
            pt="2"
            style={{ borderTop: `1px solid ${t.uiLine}` }}
          >
            <Text size="2" style={{ fontVariantNumeric: 'tabular-nums' }}>
              Fázis összesen: <Text weight="bold">{formatMoney(total, currency, nyelv)}</Text>
            </Text>
          </Flex>
        </Box>
      )}
    </Box>
  );
}

/** A sortörlés inline Undo-sávja -- lásd `PhaseSection` `removeWithUndo`/`undoRemove`. */
function UndoRow({
  nev,
  buttonRef,
  onUndo,
}: {
  nev: string;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onUndo: () => void;
}) {
  return (
    <Table.Row style={{ backgroundColor: t.accentWash }}>
      <Table.Cell colSpan={7}>
        <Flex align="center" justify="between" gap="3">
          <Text size="2" color="gray">
            Sor törölve{nev.trim() ? `: ${nev}` : ''}
          </Text>
          <Button type="button" size="1" variant="soft" color="gray" ref={buttonRef} onClick={onUndo}>
            Visszavonás
          </Button>
        </Flex>
      </Table.Cell>
    </Table.Row>
  );
}
