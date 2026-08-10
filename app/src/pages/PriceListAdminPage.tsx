// Árlista admin -- portolva ui/PriceListAdmin.jsx-ből.
//
// Egy tábla, két ár oszlop -- nem külön magyar és német nézet. Így egy
// pillantás megmutatja, hol hiányzik az EUR ár, és a "Nincs EUR ár" szűrő
// maga a német bevezetés munkalistája.
//
// A sor kinyitása adja a teljes szerkesztést, benne a kategória
// legördülővel -- ez a takarítás fő eszköze (a 11 árva tétel átmozgatása,
// lásd docs/06-arlista-import.md). A tétel-táblázat fölötti "Kategóriák"
// panel (docs/08-backlog.md 8. tétel) adja a másik felet: kategória
// létrehozás/átnevezés/színezés/sorrendezés/törlés, egy helyen a
// tétel-mozgatással, hogy a doki ne navigáljon oda-vissza a takarításkor.

import { Fragment, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Callout,
  Flex,
  Grid,
  Heading,
  IconButton,
  RadioCards,
  SegmentedControl,
  Select,
  Separator,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Cross2Icon,
  EyeClosedIcon,
  EyeOpenIcon,
  InfoCircledIcon,
  StarFilledIcon,
  StarIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import NumberField from '../components/NumberField';
import { t } from '../design/tokens';
import { ALAP_KATEGORIA_SZIN, KATEGORIA_PALETTA } from '../design/treatmentVisuals';
import { formatPrice } from '../domain/money';
import { nextKategoriaId, nextTetelId } from '../domain/priceListIds';
import { nevEgyezik, norm } from '../domain/search';
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
  const [catPanelOpen, setCatPanelOpen] = useState(false);
  const [openCat, setOpenCat] = useState<string | null>(null);
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

  const sortedKategoriak = useMemo(
    () => priceList.kategoriak.slice().sort((a, b) => a.sorrend - b.sorrend),
    [priceList.kategoriak],
  );

  function patchCategory(id: string, patch: Partial<Kategoria>) {
    commit({
      ...priceList,
      kategoriak: priceList.kategoriak.map((k) => (k.id === id ? { ...k, ...patch } : k)),
    });
  }

  function addCategory() {
    const id = nextKategoriaId(priceList.kategoriak);
    const maxSorrend = priceList.kategoriak.reduce((max, k) => Math.max(max, k.sorrend), 0);
    const newCategory: Kategoria = {
      id,
      nev: { hu: 'Új kategória', de: null },
      sorrend: maxSorrend + 1,
      szin: ALAP_KATEGORIA_SZIN,
    };
    commit({ ...priceList, kategoriak: [...priceList.kategoriak, newCategory] });
    setCatPanelOpen(true);
    setOpenCat(id);
  }

  /**
   * Fel/le mozgatás: a `sortedKategoriak`-beli szomszéddal cserél, majd a
   * teljes listát 1..n-re újraszámozza -- így a tömbsorrend és a `sorrend`
   * mező soha nem csúszik szét (docs/backlog-8-kategoriakezeles-terv.md 10.
   * döntés). Ez most már nemcsak a lista-/PDF-sorrendet, hanem a fogszín-
   * ütközés kimenetelét is befolyásolja (domain/toothVisual.ts
   * `resolveToothVisual`, 3. döntés).
   */
  function moveCategory(id: string, irany: -1 | 1) {
    const idx = sortedKategoriak.findIndex((k) => k.id === id);
    const cel = idx + irany;
    if (idx < 0 || cel < 0 || cel >= sortedKategoriak.length) return;
    const atrendezve = sortedKategoriak.slice();
    [atrendezve[idx], atrendezve[cel]] = [atrendezve[cel], atrendezve[idx]];
    commit({
      ...priceList,
      kategoriak: atrendezve.map((k, i) => ({ ...k, sorrend: i + 1 })),
    });
  }

  /**
   * Csak akkor törölhető, ha SEM aktív, SEM inaktív tétel nem hivatkozik rá
   * (8. döntés) -- egy `aktiv: false` tétel bármikor visszakapcsolható az
   * "Aktív" szem ikonnal, tehát egy csak aktív tételek alapján "üresnek"
   * ítélt kategória valójában nem az. Valódi törlés (nincs `aktiv` mező a
   * `Kategoria` típuson) -- semmi más nem hivatkozik rá tartalmilag.
   */
  function deleteCategory(id: string) {
    commit({ ...priceList, kategoriak: priceList.kategoriak.filter((k) => k.id !== id) });
    if (openCat === id) setOpenCat(null);
  }

  function addNewItem() {
    const id = nextTetelId(priceList.tetelek);
    const newItem: Tetel = {
      id,
      kategoriaId: sortedKategoriak[0]?.id ?? '',
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
    // Mindkét nyelven keres, ugyanaz a szabály, mint a szerkesztő
    // tétel-keresőjében (backlog-7): egy csak németül elgépelt/elnevezett
    // tétel eddig itt egyáltalán nem volt megtalálható.
    if (q && !nevEgyezik(x.nev, norm(q))) return false;
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

      <KategoriaPanel
        open={catPanelOpen}
        onOpenChange={setCatPanelOpen}
        kategoriak={sortedKategoriak}
        tetelek={priceList.tetelek}
        openCat={openCat}
        onOpenCatChange={setOpenCat}
        onPatch={patchCategory}
        onMove={moveCategory}
        onDelete={deleteCategory}
        onAdd={addCategory}
      />

      <TextField.Root
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Keresés a tételek között…"
        aria-label="Keresés a tételek között"
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

                      {/* Billentyűzettel is elérhető megnyitó -- a sor
                          egészének onClick-je csak egérrel volt elérhető,
                          Tab-bal nem lehetett a szerkesztőt megnyitni. Ez a
                          cella a "sor fejléce" (RowHeaderCell), ezért ez
                          kapja a trigger szerepet, nem a teljes sor -- így a
                          csillag/aktív gombok maradnak a natív, egymástól
                          független Tab-megállók. */}
                      <Table.RowHeaderCell
                        role="button"
                        tabIndex={0}
                        aria-expanded={open === it.id}
                        aria-controls={`tetel-szerkeszto-${it.id}`}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ' ') return;
                          e.preventDefault();
                          setOpen(open === it.id ? null : it.id);
                        }}
                        style={{
                          maxWidth: 320,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
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
                      <Table.Row id={`tetel-szerkeszto-${it.id}`}>
                        <Table.Cell colSpan={5} style={{ background: t.surfaceAlt }}>
                          <ItemEditor
                            item={it}
                            categories={sortedKategoriak}
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
                  <Flex as="span" align="center" gap="2">
                    <span
                      aria-hidden
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: k.szin ?? ALAP_KATEGORIA_SZIN,
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    {k.nev.hu}
                  </Flex>
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

/**
 * Kategória-karbantartó -- alapból csukott, összecsukható panel a
 * tétel-táblázat FÖLÖTT (docs/backlog-8-kategoriakezeles-terv.md 11.
 * döntés), a `ToothChartPanel.tsx` mintáját követve (feltételes render,
 * `aria-expanded`/`aria-controls`, nincs nyitás/csukás-animáció). Egy sor
 * kattintásra nyílik ki a `KategoriaEditor`-ra, ugyanúgy, mint a tétel-
 * táblázat sorai az `ItemEditor`-ra.
 */
function KategoriaPanel({
  open,
  onOpenChange,
  kategoriak,
  tetelek,
  openCat,
  onOpenCatChange,
  onPatch,
  onMove,
  onDelete,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Már `sorrend` szerint rendezve -- lásd `sortedKategoriak`. */
  kategoriak: Kategoria[];
  tetelek: Tetel[];
  openCat: string | null;
  onOpenCatChange: (id: string | null) => void;
  onPatch: (id: string, patch: Partial<Kategoria>) => void;
  onMove: (id: string, irany: -1 | 1) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <Box mb="4">
      <Button
        type="button"
        variant="soft"
        color="gray"
        aria-expanded={open}
        aria-controls="kategoriak-panel"
        onClick={() => onOpenChange(!open)}
      >
        {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
        Kategóriák
      </Button>

      {open && (
        <Box id="kategoriak-panel" mt="3">
          <Table.Root size="1" mb="2">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell width="24px" />
                <Table.ColumnHeaderCell>Kategória</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end">Tételek</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="60px" />
                <Table.ColumnHeaderCell width="34px" />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {kategoriak.map((k, i) => {
                const sajatTetelek = tetelek.filter((x) => x.kategoriaId === k.id);
                // Aktív ÉS inaktív tétel is számít -- egy `aktiv: false` tétel
                // bármikor visszakapcsolható, tehát egy csak aktív tételek
                // alapján "üresnek" ítélt kategória valójában nem az (8. döntés).
                const ures = sajatTetelek.length === 0;
                const inaktiv = sajatTetelek.filter((x) => !x.aktiv).length;

                return (
                  <Fragment key={k.id}>
                    <Table.Row
                      style={{ cursor: 'pointer' }}
                      onClick={() => onOpenCatChange(openCat === k.id ? null : k.id)}
                    >
                      <Table.Cell>
                        <span
                          aria-hidden
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: k.szin ?? ALAP_KATEGORIA_SZIN,
                            display: 'inline-block',
                          }}
                        />
                      </Table.Cell>
                      {/* Ugyanaz a minta, mint a tétel-táblázat sorának
                          RowHeaderCell-je -- a sor fejléce a billentyűzetes
                          trigger, a mozgatás/törlés gombok maradnak saját
                          Tab-megállók. */}
                      <Table.RowHeaderCell
                        role="button"
                        tabIndex={0}
                        aria-expanded={openCat === k.id}
                        aria-controls={`kategoria-szerkeszto-${k.id}`}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ' ') return;
                          e.preventDefault();
                          onOpenCatChange(openCat === k.id ? null : k.id);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {k.nev.hu}
                      </Table.RowHeaderCell>
                      <Table.Cell justify="end" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {sajatTetelek.length} tétel
                        {inaktiv > 0 && (
                          <Text size="1" ml="1" color="gray">
                            ({inaktiv} inaktív)
                          </Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Flex gap="1">
                          <IconButton
                            aria-label="Kategória feljebb"
                            variant="ghost"
                            color="gray"
                            size="1"
                            disabled={i === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              onMove(k.id, -1);
                            }}
                          >
                            <ArrowUpIcon />
                          </IconButton>
                          <IconButton
                            aria-label="Kategória lejjebb"
                            variant="ghost"
                            color="gray"
                            size="1"
                            disabled={i === kategoriak.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              onMove(k.id, 1);
                            }}
                          >
                            <ArrowDownIcon />
                          </IconButton>
                        </Flex>
                      </Table.Cell>
                      <Table.Cell>
                        <IconButton
                          aria-label="Kategória törlése"
                          title={
                            ures
                              ? undefined
                              : 'Előbb mozgasd át a hozzá tartozó tételeket másik kategóriába'
                          }
                          variant="ghost"
                          color="gray"
                          size="1"
                          disabled={!ures}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(k.id);
                          }}
                        >
                          <TrashIcon />
                        </IconButton>
                      </Table.Cell>
                    </Table.Row>

                    {openCat === k.id && (
                      <Table.Row id={`kategoria-szerkeszto-${k.id}`}>
                        <Table.Cell colSpan={5} style={{ background: t.surfaceAlt }}>
                          <KategoriaEditor kategoria={k} onPatch={(p) => onPatch(k.id, p)} />
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Fragment>
                );
              })}
            </Table.Body>
          </Table.Root>
          <Button type="button" size="1" variant="soft" onClick={onAdd}>
            + Új kategória
          </Button>
        </Box>
      )}
    </Box>
  );
}

/** Kinyitott kategória-sor -- a mai `ItemEditor` mintájára. */
function KategoriaEditor({
  kategoria,
  onPatch,
}: {
  kategoria: Kategoria;
  onPatch: (patch: Partial<Kategoria>) => void;
}) {
  return (
    <Box py="2">
      <Grid columns="2" gap="3" mb="3">
        <Field label="Megnevezés (magyar)">
          <TextField.Root
            value={kategoria.nev.hu}
            onChange={(e) => onPatch({ nev: { ...kategoria.nev, hu: e.target.value } })}
          />
        </Field>
        <Field label="Bezeichnung (német)">
          <TextField.Root
            value={kategoria.nev.de || ''}
            placeholder="még nincs megadva"
            onChange={(e) => onPatch({ nev: { ...kategoria.nev, de: e.target.value || null } })}
          />
        </Field>
      </Grid>

      {/* Kurált paletta, nincs szabad hex/natív color input -- két kategória
          kaphat azonos színt, a felület ezt nem jelzi (docs/backlog-8-
          kategoriakezeles-terv.md 4-5. döntés). */}
      <FieldGroup label="Szín (a fogtérképen ez jelöli a kategória kezeléseit)">
        <RadioCards.Root
          value={kategoria.szin ?? ALAP_KATEGORIA_SZIN}
          onValueChange={(v) => onPatch({ szin: v })}
          columns="8"
          gap="2"
        >
          {KATEGORIA_PALETTA.map((p) => (
            <RadioCards.Item key={p.hex} value={p.hex} aria-label={p.nev}>
              <span
                aria-hidden
                style={{ display: 'block', width: 20, height: 20, borderRadius: 4, background: p.hex }}
              />
            </RadioCards.Item>
          ))}
        </RadioCards.Root>
      </FieldGroup>

      <Text as="div" size="1" color="gray" mt="3" style={{ fontFamily: t.mono }}>
        id: {kategoria.id}
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
