// Árlista admin -- portolva ui/PriceListAdmin.jsx-ből.
//
// Egy tábla, két ár oszlop -- nem külön magyar és német nézet. Így egy
// pillantás megmutatja, hol hiányzik az EUR ár, és a "Nincs EUR ár" szűrő
// maga a német bevezetés munkalistája.
//
// A sor kinyitása adja a teljes szerkesztést, benne a kategória
// legördülővel -- ez a takarítás fő eszköze (a 11 árva tétel átmozgatása,
// lásd docs/06-arlista-import.md). Kategória hozzáadás/átnevezés NINCS a
// prototípusban sem -- csak a meglévők közötti mozgatás.

import { Fragment, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Callout,
  Flex,
  Grid,
  Heading,
  IconButton,
  SegmentedControl,
  Select,
  Separator,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes';
import {
  Cross2Icon,
  EyeClosedIcon,
  EyeOpenIcon,
  InfoCircledIcon,
  StarFilledIcon,
  StarIcon,
} from '@radix-ui/react-icons';
import NumberField from '../components/NumberField';
import { t } from '../design/tokens';
import { formatPrice } from '../domain/money';
import { nextTetelId } from '../domain/priceListIds';
import { norm } from '../domain/search';
import type { Ar, Kategoria, PriceList, Tetel } from '../domain/types';
import { useAppState } from '../state/AppState';

type FilterKey = 'all' | 'noeur' | 'range' | 'off' | 'fav';

const FILTERS: Array<[FilterKey, string]> = [
  ['all', 'Mind'],
  ['noeur', 'Nincs EUR ár'],
  ['range', 'Sávos ár'],
  ['off', 'Inaktív'],
  ['fav', 'Gyakori'],
];

export default function PriceListAdminPage() {
  const { priceList, savePriceList } = useAppState();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [open, setOpen] = useState<string | null>(null);
  // P0-8-hoz hasonlóan (SettingsPage) -- a `savePriceList` korábban `void`-olva
  // volt, egy sikertelen mentés (pl. kvótahiba) némán elveszett.
  const [saveError, setSaveError] = useState<string | null>(null);

  function commit(next: PriceList) {
    savePriceList({ ...next, modositva: new Date().toISOString().slice(0, 10) })
      .then(() => setSaveError(null))
      .catch((err: unknown) => {
        setSaveError(err instanceof Error ? err.message : 'A mentés váratlanul meghiúsult.');
      });
  }

  function patchItem(id: string, patch: Partial<Tetel>) {
    commit({
      ...priceList,
      tetelek: priceList.tetelek.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    });
  }

  function addNewItem() {
    const id = nextTetelId(priceList.tetelek);
    const newItem: Tetel = {
      id,
      kategoriaId: priceList.kategoriak[0]?.id ?? '',
      sorrend: priceList.tetelek.length + 1,
      aktiv: true,
      gyakori: false,
      nev: { hu: 'Új tétel', de: null },
      ar: { HUF: { tipus: 'FIX', ertek: 0 }, EUR: null },
    };
    commit({ ...priceList, tetelek: [...priceList.tetelek, newItem] });
    setFilter('all');
    setQ('');
    setOpen(id);
  }

  const keep = (x: Tetel): boolean => {
    // P0-7: a nyitott sort MINDIG megtartjuk, akkor is, ha egy időközbeni
    // szerkesztés (pl. az első EUR-számjegy begépelése a "Nincs EUR ár"
    // szűrő alatt) kiejtené a szűrőből -- enélkül a sor (és vele az
    // ItemEditor) eltűnt a doki keze alól, mielőtt végigírta volna a
    // számot. A blur-re commitáló NumberField (lásd lent) már önmagában is
    // sokat segít, de ez a védelem a commit UTÁNI állapotra is vonatkozik.
    if (x.id === open) return true;
    if (q && !norm(x.nev.hu).includes(norm(q))) return false;
    if (filter === 'noeur') return !x.ar.EUR;
    if (filter === 'range') return x.ar.HUF?.tipus === 'SAVOS' || x.ar.EUR?.tipus === 'SAVOS';
    if (filter === 'off') return !x.aktiv;
    if (filter === 'fav') return x.gyakori;
    return true;
  };

  const grouped = useMemo(() => {
    return priceList.kategoriak
      .slice()
      .sort((a, b) => a.sorrend - b.sorrend)
      .map((k) => ({
        cat: k,
        items: priceList.tetelek.filter((x) => x.kategoriaId === k.id && keep(x)),
      }))
      .filter((g) => g.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceList, q, filter, open]);

  const missingEur = priceList.tetelek.filter((x) => !x.ar.EUR).length;
  const shown = grouped.reduce((s, g) => s + g.items.length, 0);

  return (
    <Box style={{ maxWidth: 940, margin: '0 auto' }}>
      <Flex justify="between" align="baseline" mb="4">
        <Heading size="5" style={{ color: t.brand }}>
          Árlista
        </Heading>
        <Text size="2" color="gray" style={{ fontFamily: t.mono }}>
          verzió {priceList.arlistaVerzio}
        </Text>
      </Flex>

      <TextField.Root
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Keresés a tételek között…"
        mb="3"
      />

      <SegmentedControl.Root
        value={filter}
        onValueChange={(v) => setFilter(v as FilterKey)}
        size="1"
        mb="4"
      >
        {FILTERS.map(([k, label]) => (
          <SegmentedControl.Item key={k} value={k}>
            {label}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl.Root>

      {saveError && (
        <Callout.Root color="red" mb="4">
          <Callout.Text>A mentés nem sikerült: {saveError}</Callout.Text>
        </Callout.Root>
      )}

      {grouped.length === 0 ? (
        <Callout.Root color="gray" mb="4">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            {q.trim()
              ? `Nincs találat erre: „${q}”. Próbálj más névre keresni, vagy válts szűrőt.`
              : 'Ebben a szűrőben nincs tétel. Válts szűrőt, vagy add hozzá az elsőt a „+ Új tétel” gombbal.'}
          </Callout.Text>
        </Callout.Root>
      ) : (
        <Table.Root size="1" mb="4">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell width="32px" />
              <Table.ColumnHeaderCell>Megnevezés</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell justify="end">Ár (HUF)</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell justify="end">Ár (EUR)</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="34px" />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {grouped.map(({ cat, items }) => (
              <Fragment key={cat.id}>
                <Table.Row>
                  <Table.Cell colSpan={5} pt="4">
                    <Flex justify="between" align="baseline">
                      <Text size="2" weight="bold" style={{ color: t.brand }}>
                        {cat.nev.hu}
                      </Text>
                      <Text size="1" color="gray">
                        {items.length} tétel
                      </Text>
                    </Flex>
                  </Table.Cell>
                </Table.Row>

                {items.map((it) => (
                  <Fragment key={it.id}>
                    <Table.Row
                      style={{ cursor: 'pointer', opacity: it.aktiv ? 1 : 0.5 }}
                      onClick={() => setOpen(open === it.id ? null : it.id)}
                    >
                      <Table.Cell>
                        <IconButton
                          aria-label="Gyakori tétel"
                          variant="ghost"
                          color="gray"
                          size="1"
                          onClick={(e) => {
                            e.stopPropagation();
                            patchItem(it.id, { gyakori: !it.gyakori });
                          }}
                          style={{ color: it.gyakori ? t.warn : t.uiTextFaint }}
                        >
                          {it.gyakori ? <StarFilledIcon /> : <StarIcon />}
                        </IconButton>
                      </Table.Cell>

                      <Table.RowHeaderCell
                        style={{
                          maxWidth: 320,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {it.nev.hu}
                        {it.ar.HUF?.tipus === 'SAVOS' && (
                          <Text size="1" ml="2" style={{ color: t.warn }}>
                            sávos
                          </Text>
                        )}
                        {!it.nev.de && (
                          <Text size="1" ml="2" color="gray">
                            nincs DE név
                          </Text>
                        )}
                      </Table.RowHeaderCell>

                      <Table.Cell justify="end" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatPrice(it.ar.HUF, 'HUF')}
                      </Table.Cell>

                      <Table.Cell
                        justify="end"
                        style={{
                          fontVariantNumeric: 'tabular-nums',
                          color: it.ar.EUR ? undefined : t.warn,
                        }}
                      >
                        {it.ar.EUR ? formatPrice(it.ar.EUR, 'EUR') : '—'}
                      </Table.Cell>

                      <Table.Cell>
                        <IconButton
                          aria-label="Aktív"
                          variant="ghost"
                          color="gray"
                          size="1"
                          onClick={(e) => {
                            e.stopPropagation();
                            patchItem(it.id, { aktiv: !it.aktiv });
                          }}
                        >
                          {it.aktiv ? <EyeOpenIcon /> : <EyeClosedIcon />}
                        </IconButton>
                      </Table.Cell>
                    </Table.Row>

                    {open === it.id && (
                      <Table.Row>
                        <Table.Cell colSpan={5} style={{ background: t.surfaceAlt }}>
                          <ItemEditor
                            item={it}
                            categories={priceList.kategoriak}
                            onPatch={(p) => patchItem(it.id, p)}
                          />
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      <Separator size="4" />
      <Flex justify="between" align="center" mt="3">
        <Text size="2" color="gray">
          {shown} / {priceList.tetelek.length} tétel látszik · {missingEur} tételnél hiányzik az
          EUR ár
        </Text>
        <Button onClick={addNewItem}>+ Új tétel</Button>
      </Flex>
    </Box>
  );
}

/** Kinyitott sor -- itt van minden mező, köztük a kategória-mozgatás. */
function ItemEditor({
  item,
  categories,
  onPatch,
}: {
  item: Tetel;
  categories: Kategoria[];
  onPatch: (patch: Partial<Tetel>) => void;
}) {
  const hufAr = item.ar.HUF ?? null;
  const eurAr = item.ar.EUR ?? null;
  const savos = hufAr?.tipus === 'SAVOS';

  /**
   * P0-2 (D15): eddig csak a HUF-ot váltotta -- az EUR ár szerkezetileg
   * mindig FIX maradt, tehát egy sávos tétel német (EUR) ajánlatán a doki
   * tudta nélkül eltűnt a `*` jelölés és a sávos lábjegyzet. Mostantól a
   * két pénznem együtt vált, hogy a szerkezetük soha ne csússzon szét. Ha a
   * tételnek nincs EUR ára (`eurAr == null`), az marad -- a váltás nem hoz
   * létre új EUR árat a semmiből.
   */
  function toggleType() {
    const toSavos = !savos;
    const nextHuf: Ar = toSavos
      ? {
          tipus: 'SAVOS',
          min: hufAr?.tipus === 'FIX' ? hufAr.ertek : 0,
          max: hufAr?.tipus === 'FIX' ? hufAr.ertek : 0,
        }
      : { tipus: 'FIX', ertek: hufAr?.tipus === 'SAVOS' ? hufAr.min : 0 };

    const nextEur: Ar | null =
      eurAr == null
        ? null
        : toSavos
          ? {
              tipus: 'SAVOS',
              min: eurAr.tipus === 'FIX' ? eurAr.ertek : eurAr.min,
              max: eurAr.tipus === 'FIX' ? eurAr.ertek : eurAr.max,
            }
          : { tipus: 'FIX', ertek: eurAr.tipus === 'SAVOS' ? eurAr.min : eurAr.ertek };

    onPatch({ ar: { ...item.ar, HUF: nextHuf, EUR: nextEur } });
  }

  function setFixPrice(ertek: number) {
    onPatch({ ar: { ...item.ar, HUF: { tipus: 'FIX', ertek } } });
  }

  function setSavosPrice(patch: Partial<{ min: number; max: number }>) {
    const base = hufAr?.tipus === 'SAVOS' ? hufAr : { tipus: 'SAVOS' as const, min: 0, max: 0 };
    onPatch({ ar: { ...item.ar, HUF: { ...base, ...patch } } });
  }

  function setEurFix(ertek: number) {
    onPatch({ ar: { ...item.ar, EUR: { tipus: 'FIX', ertek } } });
  }

  function setEurSavos(patch: Partial<{ min: number; max: number }>) {
    const base = eurAr?.tipus === 'SAVOS' ? eurAr : { tipus: 'SAVOS' as const, min: 0, max: 0 };
    onPatch({ ar: { ...item.ar, EUR: { ...base, ...patch } } });
  }

  function clearEur() {
    onPatch({ ar: { ...item.ar, EUR: null } });
  }

  return (
    <Box py="2">
      <Grid columns="2" gap="3" mb="3">
        <Field label="Megnevezés (magyar)">
          <TextField.Root
            value={item.nev.hu}
            onChange={(e) => onPatch({ nev: { ...item.nev, hu: e.target.value } })}
          />
        </Field>
        <Field label="Bezeichnung (német)">
          <TextField.Root
            value={item.nev.de || ''}
            placeholder="még nincs megadva"
            onChange={(e) => onPatch({ nev: { ...item.nev, de: e.target.value || null } })}
          />
        </Field>
      </Grid>

      <Grid columns="2" gap="3">
        <Field label="Kategória">
          <Select.Root
            value={item.kategoriaId}
            onValueChange={(v) => onPatch({ kategoriaId: v })}
          >
            <Select.Trigger style={{ width: '100%' }} />
            <Select.Content>
              {categories.map((k) => (
                <Select.Item key={k.id} value={k.id}>
                  {k.nev.hu}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Field>

        {/* FieldGroup (plain div), NEM Field/<label> -- egy <label> ami egy
            <button>-t fog körbe, a gomb SAJÁT szövege helyett a label
            szövegét adná az accessible name-nek (ugyanaz a csapda, amit a
            SettingsPage ChipGroup-kommentje is jelez a nyelvválasztónál). */}
        <FieldGroup label="Ártípus (mindkét pénznemre hat)">
          <Button type="button" variant="soft" color="gray" style={{ width: '100%' }} onClick={toggleType}>
            {savos ? 'Sávos → fix' : 'Fix → sávos'}
          </Button>
        </FieldGroup>
      </Grid>

      <Grid columns="2" gap="3" mt="3">
        {savos && hufAr?.tipus === 'SAVOS' ? (
          <>
            <Field label="HUF ár — tól">
              <NumberField value={hufAr.min} min={0} onCommit={(v) => setSavosPrice({ min: v })} />
            </Field>
            <Field label="HUF ár — ig">
              <NumberField value={hufAr.max} min={0} onCommit={(v) => setSavosPrice({ max: v })} />
            </Field>
          </>
        ) : (
          <Field label="HUF ár">
            <NumberField
              value={hufAr?.tipus === 'FIX' ? hufAr.ertek : 0}
              min={0}
              onCommit={setFixPrice}
            />
          </Field>
        )}
      </Grid>

      <Grid columns="2" gap="3" mt="3">
        {eurAr == null ? (
          <FieldGroup label="EUR ár">
            <Button
              type="button"
              variant="soft"
              color="gray"
              style={{ width: '100%' }}
              onClick={() => setEurFix(0)}
            >
              + EUR ár hozzáadása
            </Button>
          </FieldGroup>
        ) : savos && eurAr.tipus === 'SAVOS' ? (
          <>
            <Field label="EUR ár — tól (€)">
              <NumberField
                value={eurAr.min}
                unit="EUR"
                min={0}
                onCommit={(v) => setEurSavos({ min: v })}
              />
            </Field>
            <Field label="EUR ár — ig (€)">
              <NumberField
                value={eurAr.max}
                unit="EUR"
                min={0}
                onCommit={(v) => setEurSavos({ max: v })}
              />
            </Field>
          </>
        ) : (
          <Flex gap="2" align="end">
            {/* A törlés gombot SZÁNDÉKOSAN a Field/<label>-en KÍVÜL tesszük --
                egy <label> ami két "labelable" elemet (NumberField + button)
                is befog, kétértelmű accessible name-et adna (ugyanaz a
                probléma, mint amit a SettingsPage ChipGroup-kommentje már
                jelez a nyelvválasztónál). */}
            <Box style={{ flex: 1 }}>
              <Field label="EUR ár (€)">
                <NumberField
                  value={eurAr.tipus === 'FIX' ? eurAr.ertek : 0}
                  unit="EUR"
                  min={0}
                  onCommit={setEurFix}
                />
              </Field>
            </Box>
            <IconButton
              type="button"
              aria-label="EUR ár törlése"
              variant="ghost"
              color="gray"
              onClick={clearEur}
            >
              <Cross2Icon />
            </IconButton>
          </Flex>
        )}
      </Grid>

      <Text as="div" size="1" color="gray" mt="3" style={{ fontFamily: t.mono }}>
        id: {item.id} — soha nem használjuk újra, a régi tervek erre hivatkoznak
      </Text>
    </Box>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <Text as="div" size="1" color="gray" mb="1">
        {label}
      </Text>
      {children}
    </label>
  );
}

/**
 * `Field` <label>-alternatívája gombokhoz -- egy <label> ami egy <button>-t
 * fog körbe implicit módon "asszociálná" a gombbal, és az accessible name
 * számításnál a LABEL szövege nyerne a gomb saját szövege felett (ezt egy
 * teszt buktatta le: `getByRole('button', {name: '...'})` a label szövegét
 * találta, nem a gomb feliratát). Vizuálisan azonos a `Field`-del, csak
 * `<div>`-et használ `<label>` helyett.
 */
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Text as="div" size="1" color="gray" mb="1">
        {label}
      </Text>
      {children}
    </Box>
  );
}
