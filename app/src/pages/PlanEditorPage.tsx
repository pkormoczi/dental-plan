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
import NumberField from '../components/NumberField';
import { t } from '../design/tokens';
import { formatMoney, formatPrice } from '../domain/money';
import { resolveNev } from '../domain/nev';
import { norm } from '../domain/search';
import { parseTeeth } from '../domain/teeth';
import { fazisListaOsszeg, fazisOsszeg } from '../domain/totals';
import type { Fazis, Nyelv, Penznem, Plan, Sor, Tetel } from '../domain/types';
import { useAppState } from '../state/AppState';

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
    const ar = item.ar[currency];
    if (!ar) return; // available már kiszűrte, de a típusnak ez kell
    const base = ar.tipus === 'SAVOS' ? ar.min : ar.ertek;
    updatePlan((draft) => {
      draft.fazisok[phaseIdx].sorok.push({
        tetelId: item.id,
        nevSnapshot: resolveNev(item.nev, nyelv).szoveg,
        savos: ar.tipus === 'SAVOS',
        fogak: '',
        mennyiseg: 1,
        listaEgysegar: base,
        tenylegesEgysegar: base,
      });
    });
  }

  function patchLine(pi: number, li: number, patch: Partial<Sor>) {
    updatePlan((draft) => {
      Object.assign(draft.fazisok[pi].sorok[li], patch);
    });
  }

  const grand = plan.fazisok.reduce((s, p) => s + fazisOsszeg(p), 0);
  const listTotal = plan.fazisok.reduce((s, p) => s + fazisListaOsszeg(p), 0);

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

      {plan.fazisok.map((p, pi) => (
        <Box key={`${fazisResetToken}-${pi}`} mb="6">
          {pi > 0 && <Separator size="4" mb="6" />}
          <PhaseSection
            phase={p}
            currency={currency}
            nyelv={nyelv}
            available={available}
            catName={catName}
            frequent={frequent}
            fallbackTetelIds={fallbackTetelIds}
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

      <Summary grand={grand} listTotal={listTotal} currency={currency} />
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
  phase,
  currency,
  nyelv,
  available,
  catName,
  frequent,
  fallbackTetelIds,
  total,
  canDelete,
  onAdd,
  onPatchLine,
  onRemoveLine,
  onRename,
  onNote,
  onDelete,
}: {
  phase: Fazis;
  currency: Penznem;
  nyelv: Nyelv;
  available: Tetel[];
  catName: (id: string) => string;
  frequent: Tetel[];
  fallbackTetelIds: Set<string>;
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
              <Table.ColumnHeaderCell width="92px">Fog</Table.ColumnHeaderCell>
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
                line={l}
                currency={currency}
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
  line,
  currency,
  fallback,
  onPatch,
  onRemove,
}: {
  line: Sor;
  currency: Penznem;
  fallback: boolean;
  onPatch: (patch: Partial<Sor>) => void;
  onRemove: () => void;
}) {
  const teeth = parseTeeth(line.fogak);
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
      </Table.Cell>

      <Table.Cell>
        <TextField.Root
          value={line.fogak}
          placeholder="16, 17, 26"
          onChange={(e) => onPatch({ fogak: e.target.value })}
          style={{ textAlign: 'center' }}
        />
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

/** Csak keresés, nincs kategória böngésző (D19). Ékezetfüggetlen. */
function ItemPicker({
  available,
  catName,
  currency,
  nyelv,
  onPick,
}: {
  available: Tetel[];
  catName: (id: string) => string;
  currency: Penznem;
  nyelv: Nyelv;
  onPick: (item: Tetel) => void;
}) {
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLInputElement>(null);

  // A kereső mindkét nyelven keres, mindig -- a doki magyar, magyarul gépel
  // akkor is, ha német ajánlatot állít össze. Csak a megjelenített és
  // snapshotolt név nyelvfüggő (lásd domain/nev.ts).
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const nq = norm(q);
    return available
      .filter((x) => norm(x.nev.hu).includes(nq) || norm(x.nev.de).includes(nq))
      .slice(0, 12);
  }, [q, available]);

  useEffect(() => setHi(0), [q]);

  function commit(item: Tetel) {
    onPick(item);
    setQ('');
    requestAnimationFrame(() => ref.current?.focus());
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Escape-nek akkor is ki kell ürítenie a keresőt, ha épp nincs találat
    // (pl. a "Nincs találat" doboz látszik) -- docs/07-felulet-rendszer.md
    // "Escape zár dialógust és keresőt".
    if (e.key === 'Escape') {
      setQ('');
      return;
    }
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHi((h) => (h + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit(results[hi]);
    }
  }

  let lastCat: string | null = null;

  return (
    <Box style={{ position: 'relative', marginTop: 8 }}>
      <TextField.Root
        ref={ref}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Tétel keresése…  (ékezet nélkül is: eszt, koron, gyoker)"
      />
      {results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 40,
            zIndex: 30,
            background: t.surface,
            border: `1px solid ${t.controlBorder}`,
            borderRadius: t.radiusLg,
            padding: 4,
            maxHeight: 280,
            overflowY: 'auto',
            boxShadow: t.shadowLg,
          }}
        >
          {results.map((r, i) => {
            const category = catName(r.kategoriaId);
            const header = category !== lastCat ? ((lastCat = category), category) : null;
            const rn = resolveNev(r.nev, nyelv);
            return (
              <div key={r.id}>
                {header && (
                  <div style={{ fontSize: 11, color: t.uiTextFaint, padding: '6px 10px 2px' }}>
                    {header}
                  </div>
                )}
                <div
                  onMouseEnter={() => setHi(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(r);
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '7px 10px',
                    fontSize: 13,
                    cursor: 'pointer',
                    borderRadius: t.radius,
                    background: i === hi ? t.accentWash : 'transparent',
                    boxShadow: i === hi ? `inset 3px 0 0 ${t.accent}` : 'none',
                  }}
                >
                  <span>
                    {rn.szoveg}
                    {rn.fallback && <HuChip />}
                  </span>
                  <span
                    style={{
                      color: t.uiTextFaint,
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatPrice(r.ar[currency], currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {results.length === 0 && q.trim() && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 40,
            zIndex: 30,
            background: available.length === 0 ? t.warnBg : t.surface,
            border: `1px solid ${available.length === 0 ? t.warn : t.controlBorder}`,
            borderRadius: t.radiusLg,
            padding: '10px 12px',
            fontSize: 12.5,
            color: available.length === 0 ? t.warn : t.uiTextFaint,
          }}
        >
          {available.length === 0
            ? `Nincs találat. Ebben a pénznemben (${currency}) egyetlen aktív tétel sincs beárazva — az Árlistán tölthetők ki.`
            : 'Nincs találat.'}
        </div>
      )}
    </Box>
  );
}

function HuChip() {
  return (
    <Badge color="amber" variant="soft" size="1" ml="2">
      HU
    </Badge>
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
    <Box mt="6">
      <Separator size="4" />
      <Flex justify="between" align="baseline" mt="3">
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
    </Box>
  );
}
