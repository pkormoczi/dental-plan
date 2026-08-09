// Kezelési terv szerkesztő -- a legfontosabb képernyő, portolva
// ui/PlanEditor.jsx-ből. A billentyűzetes ciklus a lényeg, ez veri meg az
// Excelt: gépel -> nyíl -> Enter -> a kereső kiürül és visszakapja a
// fókuszt -> gépel tovább, egérhasználat nélkül. Lásd CLAUDE.md
// "A UX kritikus pontja".

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Callout,
  Flex,
  Heading,
  IconButton,
  Separator,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes';
import { Cross1Icon } from '@radix-ui/react-icons';
import HuChip from '../components/HuChip';
import NumberField from '../components/NumberField';
import ToothChartPanel from '../components/ToothChartPanel';
import ToothPickerPopover from '../components/ToothPickerPopover';
import { t } from '../design/tokens';
import { basePrice, formatMoney } from '../domain/money';
import { resolveNev } from '../domain/nev';
import { parseTeeth } from '../domain/teeth';
import { buildToothVisualStates, type FogterkepAllapot } from '../domain/toothVisual';
import { fazisListaOsszeg, fazisOsszeg } from '../domain/totals';
import type { Fazis, Nyelv, Penznem, Plan, Sor, Tetel } from '../domain/types';
import { useAppState } from '../state/AppState';
import ItemPicker from './planEditor/ItemPicker';

/** `matchMedia` jsdom alatt nincs implementálva (vitest) -- óvatos lekérdezés. */
function csokkentettMozgas(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Egy árlista-tétel felvételéhez/kitöltéséhez tartozó soradatok -- közös az
 * új sor felvitelénél (`addLine`) és egy a fogtérképről létrehozott, tétel
 * nélküli sor utólagos kitöltésénél (`LineRow` beágyazott `ItemPicker`-je),
 * hogy az árazási logika (SAVOS -> min) egy helyen éljen
 * (docs/08-backlog.md "basePrice() újraírva" tétel zárása).
 */
function sorMezokTetelbol(
  item: Tetel,
  currency: Penznem,
  nyelv: Nyelv,
): Pick<Sor, 'tetelId' | 'nevSnapshot' | 'savos' | 'listaEgysegar' | 'tenylegesEgysegar'> | null {
  const ar = item.ar[currency];
  if (!ar) return null; // a hívó (available/ItemPicker) már kiszűrte, de a típusnak ez kell
  const base = basePrice(ar);
  return {
    tetelId: item.id,
    nevSnapshot: resolveNev(item.nev, nyelv).szoveg,
    savos: ar.tipus === 'SAVOS',
    listaEgysegar: base,
    tenylegesEgysegar: base,
  };
}

export default function PlanEditorPage() {
  const { plan, setPlan, priceList, loadedOsszesitokDiff } = useAppState();
  const navigate = useNavigate();
  const currency = plan.penznem;
  const nyelv = plan.nyelv;
  // P1-7: index-kulcs helyett -- fázistörléskor a maradék PhaseSection-ok
  // pozíciója (pi) eltolódik, és egy sima `key={pi}` React-remount nélkül
  // ugyanazt a DOM-csomópontot (és benne az ItemPicker lokális kereső-
  // állapotát: a gépelt szöveget) tartaná meg egy MÁSIK fázison. A token
  // növelése törléskor mindent remountol, a keresőmező sosem "vándorol" át.
  const [fazisResetToken, setFazisResetToken] = useState(0);
  // Melyik fázisba kerüljön az új sor, ha a doki kezeletlen fogra kattint a
  // fogtérképen -- csak akkor látszik a választó, ha >1 fázis van (lásd
  // lent). Renderléskor mindig `Math.min`-nel szorítva a fázisok
  // számához, hogy egy törölt fázis ne hagyjon lógó indexet.
  const [celFazisIndex, setCelFazisIndex] = useState(0);
  const celFazisIndexClamped = Math.min(celFazisIndex, plan.fazisok.length - 1);
  // A fogtérkép-kattintás után hova kell fókuszálni/görgetni -- egy
  // useEffect dolgozza fel renderelés UTÁN (lásd lent), mert egy most
  // felvett sor DOM-eleme csak a következő renderben létezik.
  const [fokuszCel, setFokuszCel] = useState<{
    pi: number;
    li: number;
    mit: 'fogak' | 'kereso';
  } | null>(null);
  // Ismételt kattintás ugyanarra a (már kezelt) fogra a következő érintett
  // sorra lép, körbeérve -- ref, mert a körbejárás nem igényel újrarenderelést
  // önmagában, csak a fókuszváltás (lásd fokuszCel).
  const ciklusRef = useRef<{ fdi: string; index: number } | null>(null);

  useEffect(() => {
    if (!fokuszCel) return;
    const id =
      fokuszCel.mit === 'fogak' ? `fog-${fokuszCel.pi}-${fokuszCel.li}` : `kereso-${fokuszCel.pi}-${fokuszCel.li}`;
    const el = document.getElementById(id);
    el?.scrollIntoView({ block: 'nearest', behavior: csokkentettMozgas() ? 'auto' : 'smooth' });
    (el as HTMLInputElement | null)?.focus();
    setFokuszCel(null);
  }, [fokuszCel]);

  const catName = (id: string): string => {
    const kat = priceList.kategoriak.find((k) => k.id === id);
    return kat ? resolveNev(kat.nev, nyelv).szoveg : 'Egyéb';
  };

  const available = useMemo(
    () => priceList.tetelek.filter((x) => x.aktiv && x.ar[currency]),
    [priceList, currency],
  );
  const frequent = useMemo(() => available.filter((x) => x.gyakori), [available]);

  // D21/1.1: melyik tétel neve esne vissza magyarra ezen a nyelven -- a
  // kereső HU jelölésének és a felvett soroknak a forrása. `hu` tervnél
  // sosem eshet vissza (resolveNev mindig nev.hu-t ad), ezért üres halmaz.
  const fallbackTetelIds = useMemo(() => {
    if (nyelv === 'hu') return new Set<string>();
    return new Set(priceList.tetelek.filter((x) => !x.nev.de).map((x) => x.id));
  }, [priceList, nyelv]);

  function updatePlan(fn: (draft: Plan) => void) {
    setPlan((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }

  function addLine(phaseIdx: number, item: Tetel) {
    const mezok = sorMezokTetelbol(item, currency, nyelv);
    if (!mezok) return; // available már kiszűrte, de a típusnak ez kell
    updatePlan((draft) => {
      draft.fazisok[phaseIdx].sorok.push({ ...mezok, fogak: '', mennyiseg: 1 });
    });
  }

  function patchLine(pi: number, li: number, patch: Partial<Sor>) {
    updatePlan((draft) => {
      Object.assign(draft.fazisok[pi].sorok[li], patch);
    });
  }

  const grand = plan.fazisok.reduce((s, p) => s + fazisOsszeg(p), 0);
  const listTotal = plan.fazisok.reduce((s, p) => s + fazisListaOsszeg(p), 0);
  const fogterkep = useMemo(() => buildToothVisualStates(plan, priceList), [plan, priceList]);

  /**
   * A fogtérkép beviteli logikája: ha a fog már érintett, ugrás a sorára
   * (ismételt kattintásra a következő érintettre, körbe); ha nem, tétel
   * nélküli új sor a kiválasztott fázisban, a fog már beírva, fókusz a
   * soron belüli keresőn.
   */
  function onToothClick(fdi: string) {
    const cimek = fogterkep.fogak.get(fdi)?.kezelesek ?? [];
    if (cimek.length === 0) {
      const pi = celFazisIndexClamped;
      const ujIndex = plan.fazisok[pi].sorok.length;
      updatePlan((draft) => {
        draft.fazisok[pi].sorok.push({
          tetelId: '',
          nevSnapshot: '',
          savos: false,
          fogak: fdi,
          mennyiseg: 1,
          listaEgysegar: 0,
          tenylegesEgysegar: 0,
        });
      });
      ciklusRef.current = null;
      setFokuszCel({ pi, li: ujIndex, mit: 'kereso' });
      return;
    }
    const elozo = ciklusRef.current;
    const idx = elozo && elozo.fdi === fdi ? (elozo.index + 1) % cimek.length : 0;
    ciklusRef.current = { fdi, index: idx };
    const cel = cimek[idx];
    setFokuszCel({
      pi: cel.fazisIndex,
      li: cel.sorIndex,
      mit: cel.sor.tetelId ? 'fogak' : 'kereso',
    });
  }

  return (
    <Box style={{ maxWidth: 900, margin: '0 auto' }}>
      <Header
        patientName={plan.paciens.nev}
        statusz={plan.statusz}
        onPreview={() => navigate('/elonezet')}
      />

      {loadedOsszesitokDiff && (
        <Callout.Root color="amber" mb="4">
          <Callout.Text>
            A betöltött terv mentett összesítője nem egyezik az itt újraszámolt értékkel —
            mentett fizetendő: <Text weight="bold">{formatMoney(plan.osszesitok.fizetendo, currency)}</Text>,
            újraszámolva: <Text weight="bold">{formatMoney(loadedOsszesitokDiff.fizetendo, currency)}</Text>.
            A fájlban lévő (mentett) érték az igazság — az aláírt papírral kell egyeznie —, ezt nem
            írjuk felül automatikusan.
          </Callout.Text>
        </Callout.Root>
      )}

      {/* A beavatkozás lista fölött, alapból csukva -- kattintásra nyílik
          (lásd components/ToothChartPanel.tsx). Korábban az oldal alján,
          mindig nyitva állt; a doki kérésére show-hide módra váltott. */}
      <ToothChartPanel
        allapot={fogterkep}
        onToothClick={onToothClick}
        fazisok={plan.fazisok}
        celFazisIndex={celFazisIndexClamped}
        onCelFazisChange={setCelFazisIndex}
      />
      <Separator size="4" mb="6" mt="4" />

      {plan.fazisok.map((p, pi) => (
        <Box key={`${fazisResetToken}-${pi}`} mb="6">
          {pi > 0 && <Separator size="4" mb="6" />}
          <PhaseSection
            pi={pi}
            phase={p}
            currency={currency}
            nyelv={nyelv}
            available={available}
            catName={catName}
            frequent={frequent}
            fallbackTetelIds={fallbackTetelIds}
            fogterkep={fogterkep}
            canDelete={plan.fazisok.length > 1}
            total={fazisOsszeg(p)}
            onAdd={(item) => addLine(pi, item)}
            onPatchLine={(li, patch) => patchLine(pi, li, patch)}
            onRemoveLine={(li) =>
              updatePlan((draft) => {
                draft.fazisok[pi].sorok.splice(li, 1);
              })
            }
            onRename={(v) =>
              updatePlan((draft) => {
                draft.fazisok[pi].megnevezes = v;
              })
            }
            onNote={(v) =>
              updatePlan((draft) => {
                draft.fazisok[pi].megjegyzes = v;
              })
            }
            onDelete={() => {
              updatePlan((draft) => {
                draft.fazisok.splice(pi, 1);
              });
              setFazisResetToken((n) => n + 1);
            }}
          />
        </Box>
      ))}

      <Button
        variant="soft"
        color="gray"
        onClick={() =>
          updatePlan((draft) => {
            draft.fazisok.push({
              sorszam: draft.fazisok.length + 1,
              megnevezes: `${draft.fazisok.length + 1}. kezelés`,
              megjegyzes: '',
              sorok: [],
            });
          })
        }
      >
        + Új kezelési fázis
      </Button>

      <Box mt="6">
        <Separator size="4" />
        <Flex mt="4" justify="end">
          <Box style={{ flex: '0 1 320px' }}>
            <Summary grand={grand} listTotal={listTotal} currency={currency} />
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}

function Header({
  patientName,
  statusz,
  onPreview,
}: {
  patientName: string;
  statusz: Plan['statusz'];
  onPreview: () => void;
}) {
  return (
    <Flex justify="between" align="center" mb="4">
      <Box>
        <Heading size="5" style={{ color: t.brand }}>
          Kezelési terv
        </Heading>
        <Text as="div" size="2" color="gray">
          {patientName || 'Új páciens'} · {statusz === 'VEGLEGES' ? 'véglegesítve' : 'piszkozat'}
        </Text>
      </Box>
      <Button onClick={onPreview}>Előnézet</Button>
    </Flex>
  );
}

function PhaseSection({
  pi,
  phase,
  currency,
  nyelv,
  available,
  catName,
  frequent,
  fallbackTetelIds,
  fogterkep,
  total,
  canDelete,
  onAdd,
  onPatchLine,
  onRemoveLine,
  onRename,
  onNote,
  onDelete,
}: {
  pi: number;
  phase: Fazis;
  currency: Penznem;
  nyelv: Nyelv;
  available: Tetel[];
  catName: (id: string) => string;
  frequent: Tetel[];
  fallbackTetelIds: Set<string>;
  fogterkep: FogterkepAllapot;
  total: number;
  canDelete: boolean;
  onAdd: (item: Tetel) => void;
  onPatchLine: (li: number, patch: Partial<Sor>) => void;
  onRemoveLine: (li: number) => void;
  onRename: (v: string) => void;
  onNote: (v: string) => void;
  onDelete: () => void;
}) {
  return (
    <Box>
      <Flex justify="between" align="center" mb="3" gap="3">
        <TextField.Root
          value={phase.megnevezes}
          onChange={(e) => onRename(e.target.value)}
          style={{ maxWidth: 360, fontWeight: 600, color: t.brand }}
        />
        {canDelete && (
          <Button variant="soft" color="gray" onClick={onDelete}>
            Fázis törlése
          </Button>
        )}
      </Flex>

      {phase.sorok.length > 0 && (
        <Table.Root size="1" mb="3">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Beavatkozás</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="132px">Fog</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="56px" justify="center">
                Db
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="104px" justify="end">
                Listaár
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="112px" justify="end">
                Tényleges
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="112px" justify="end">
                Összeg
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="32px" />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {phase.sorok.map((l, li) => (
              <LineRow
                key={li}
                pi={pi}
                li={li}
                line={l}
                currency={currency}
                nyelv={nyelv}
                available={available}
                catName={catName}
                fogterkep={fogterkep}
                fallback={fallbackTetelIds.has(l.tetelId)}
                onPatch={(p) => onPatchLine(li, p)}
                onRemove={() => onRemoveLine(li)}
              />
            ))}
          </Table.Body>
        </Table.Root>
      )}

      <ItemPicker
        available={available}
        catName={catName}
        currency={currency}
        nyelv={nyelv}
        onPick={onAdd}
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

      <TextField.Root
        value={phase.megjegyzes}
        onChange={(e) => onNote(e.target.value)}
        placeholder="Megjegyzés a fázishoz (megjelenik a nyomtatványon)"
        mt="3"
      />

      <Flex
        justify="end"
        mt="3"
        pt="2"
        style={{ borderTop: `1px solid ${t.uiLine}` }}
      >
        <Text size="2" style={{ fontVariantNumeric: 'tabular-nums' }}>
          Fázis összesen: <Text weight="bold">{formatMoney(total, currency)}</Text>
        </Text>
      </Flex>
    </Box>
  );
}

function LineRow({
  pi,
  li,
  line,
  currency,
  nyelv,
  available,
  catName,
  fogterkep,
  fallback,
  onPatch,
  onRemove,
}: {
  pi: number;
  li: number;
  line: Sor;
  currency: Penznem;
  nyelv: Nyelv;
  available: Tetel[];
  catName: (id: string) => string;
  fogterkep: FogterkepAllapot;
  fallback: boolean;
  onPatch: (patch: Partial<Sor>) => void;
  onRemove: () => void;
}) {
  const uj = line.tetelId === ''; // fogtérkép-kattintással létrehozott, még tétel nélküli sor
  const teeth = parseTeeth(line.fogak);
  // Nem blokkoló: a mező szándékosan szabad szöveges marad (pl. „jobb
  // felső" jegyzet -- docs/03-funkcionalis-spec.md "Soronkénti
  // fogválasztó"), csak vizuálisan jelezzük, ha a tartalom nem érvényes
  // FDI-lista (kvadráns 1-4/tejfog 5-8 + fog 1-8/1-5, lásd domain/teeth.ts).
  const invalidFormat = line.fogak.trim() !== '' && !teeth.valid;
  // A darabszám mezőbe gépelt, még nem committált érték -- a NumberField
  // csak blur/Enterre írja a törzsadatot (P1-4), de ez a figyelmeztetés
  // gépelés közben is éljen, ne csak commit után.
  const [mennyisegDraft, setMennyisegDraft] = useState(line.mennyiseg);
  useEffect(() => setMennyisegDraft(line.mennyiseg), [line.mennyiseg]);
  const mismatch = teeth.valid && teeth.teeth.length !== mennyisegDraft;
  // P2-4: `listaEgysegar === 0` (vagy egy jövőbeli NaN/Infinity) esetén ez a
  // képlet korábban "−Infinity%"-ot adott -- most ha az osztó nem egy
  // pozitív véges szám, nincs kedvezmény-jelvény.
  const discount =
    Number.isFinite(line.listaEgysegar) &&
    line.listaEgysegar > 0 &&
    line.tenylegesEgysegar < line.listaEgysegar
      ? Math.round((1 - line.tenylegesEgysegar / line.listaEgysegar) * 100)
      : 0;

  return (
    <Table.Row>
      <Table.Cell>
        {uj ? (
          <ItemPicker
            available={available}
            catName={catName}
            currency={currency}
            nyelv={nyelv}
            floating="portal"
            autoFocus
            clearOnPick={false}
            id={`kereso-${pi}-${li}`}
            onPick={(item) => {
              const mezok = sorMezokTetelbol(item, currency, nyelv);
              if (mezok) onPatch(mezok);
            }}
          />
        ) : (
          <Text size="2">
            {line.nevSnapshot}
            {line.savos && (
              <Text size="1" ml="2" style={{ color: t.warn }}>
                sávos
              </Text>
            )}
            {fallback && <HuChip />}
            {discount > 0 && (
              <Badge color="green" variant="soft" ml="2" size="1">
                −{discount}%
              </Badge>
            )}
          </Text>
        )}
      </Table.Cell>

      <Table.Cell>
        <Flex align="center" gap="1">
          <Box flexGrow="1">
            <TextField.Root
              id={`fog-${pi}-${li}`}
              value={line.fogak}
              placeholder="16, 17, 26"
              onChange={(e) => onPatch({ fogak: e.target.value })}
              aria-invalid={invalidFormat || undefined}
              style={{ textAlign: 'center', borderColor: invalidFormat ? t.danger : t.controlBorder }}
            />
          </Box>
          <ToothPickerPopover
            fogak={line.fogak}
            allapot={fogterkep}
            onChange={(fogak) => onPatch({ fogak })}
          />
        </Flex>
        {invalidFormat && (
          <Text as="div" size="1" mt="1" style={{ color: t.danger }}>
            Nem érvényes FDI fogszám (pl. 16, 17, 26) -- a kvadráns 1-4, a fog a kvadránsban 1-8 lehet.
          </Text>
        )}
        {mismatch && (
          <Text as="div" size="1" mt="1" style={{ color: t.warn }}>
            {teeth.teeth.length} fog van felsorolva, a darabszám {mennyisegDraft}. Szándékos?
          </Text>
        )}
      </Table.Cell>

      <Table.Cell>
        <NumberField
          value={line.mennyiseg}
          min={1}
          onCommit={(v) => onPatch({ mennyiseg: v })}
          onDraftChange={(v) => setMennyisegDraft(v ?? line.mennyiseg)}
          textAlign="center"
          aria-label="Darabszám"
        />
      </Table.Cell>

      <Table.Cell justify="end" style={{ fontVariantNumeric: 'tabular-nums', color: t.uiTextFaint }}>
        {formatMoney(line.listaEgysegar, currency)}
      </Table.Cell>

      <Table.Cell justify="end">
        <NumberField
          value={line.tenylegesEgysegar}
          min={0}
          onCommit={(v) => onPatch({ tenylegesEgysegar: v })}
          textAlign="right"
          style={{ borderColor: discount || line.savos ? t.brand : t.controlBorder }}
          aria-label="Tényleges egységár"
        />
      </Table.Cell>

      <Table.Cell justify="end" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatMoney(line.tenylegesEgysegar * line.mennyiseg, currency)}
      </Table.Cell>

      <Table.Cell>
        <IconButton
          type="button"
          aria-label="Sor törlése"
          variant="ghost"
          color="gray"
          size="1"
          onClick={onRemove}
        >
          <Cross1Icon />
        </IconButton>
      </Table.Cell>
    </Table.Row>
  );
}

function Summary({
  grand,
  listTotal,
  currency,
}: {
  grand: number;
  listTotal: number;
  currency: Penznem;
}) {
  const discount = listTotal - grand;
  return (
    <Flex justify="between" align="baseline" gap="4">
      <Text size="3" color="gray">
        Mindösszesen
      </Text>
      <Box style={{ textAlign: 'right' }}>
        <Text
          as="div"
          size="6"
          weight="bold"
          style={{ color: t.brand, fontVariantNumeric: 'tabular-nums' }}
        >
          {formatMoney(grand, currency)}
        </Text>
        {discount > 0 && (
          // Csak a szerkesztőben látszik. A nyomtatványon NEM (D9).
          <Text as="div" size="2" style={{ color: t.ok }}>
            Kedvezmény: {formatMoney(discount, currency)}
          </Text>
        )}
      </Box>
    </Flex>
  );
}
