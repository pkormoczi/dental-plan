// Kategória-karbantartó panel -- kiemelve a PriceListAdminPage.tsx-ből. A
// `KategoriaPanel`/`KategoriaPanelBody`/`KategoriaEditor` hármas
// SZÁNDÉKOSAN egy fájlban marad: a dirty-állapot kettévágott (`dirty` a
// `KategoriaPanel`-ben, hogy túlélje a záráskori unmountot; a draft a
// `KategoriaPanelBody`-ban, hogy záráskor eldobódjon, `useEffect`-tel
// szinkronizálva fölfelé) -- ez a protokoll csak akkor olvasható, ha egy
// fejléc-komment mindkét felét egy helyen magyarázza.

import { Fragment, useEffect, useState } from 'react';
import { Box, Button, Flex, Grid, IconButton, RadioCards, Table, Text } from '@radix-ui/themes';
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon, ChevronRightIcon, TrashIcon } from '@radix-ui/react-icons';
import { Field, FieldGroup } from '../../components/Field';
import DiscardChangesDialog, { useDiscardGuard } from '../../components/DiscardChangesDialog';
import { useNavGuard } from '../../components/NavGuardContext';
import { useDirtyDraft } from '../../components/useDirtyDraft';
import { useMentesJelzo } from '../../components/useMentesJelzo';
import { t } from '../../design/tokens';
import { ALAP_KATEGORIA_SZIN, KATEGORIA_PALETTA } from '../../design/treatmentVisuals';
import type { Kategoria, Tetel } from '../../domain/types';
import { BufferedTextField } from './BufferedFields';

/**
 * Kategória-karbantartó -- alapból csukott, összecsukható panel a
 * tétel-táblázat FÖLÖTT (docs/03-funkcionalis-spec.md § Kategóriák panel),
 * a `ToothChartPanel.tsx` mintáját követve (feltételes render,
 * `aria-expanded`/`aria-controls`, nincs nyitás/csukás-animáció). Csak
 * ennek a külső rétegnek van a becsukásig élő `dirty`-je (a
 * `KategoriaPanelBody` a draftot tartó belső réteg, ami nyitva léttől
 * mountolt) -- a `SettingsPage.tsx`/`Tabs.Content` mintáját követi: a
 * becsukás ténylegesen unmountolja a draftot, ezért kér a becsukás
 * megerősítést, ugyanúgy, mint egy explicit Mégse.
 */
export default function KategoriaPanel({
  open,
  onOpenChange,
  kategoriak,
  tetelek,
  onAdd,
  onDelete,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Már `sorrend` szerint rendezve -- lásd `sortedKategoriak`. */
  kategoriak: Kategoria[];
  tetelek: Tetel[];
  onAdd: () => Kategoria;
  onDelete: (id: string) => void;
  onSave: (next: Kategoria[]) => Promise<boolean>;
}) {
  const [dirty, setDirty] = useState(false);
  const guard = useDiscardGuard(dirty);
  // A docs/07-felulet-rendszer.md § Komponensek mintája: ugyanez a dirty
  // jelző a NavBar-navigációt is védi.
  useNavGuard(dirty);

  function requestClose() {
    guard.request(() => {
      setDirty(false);
      onOpenChange(false);
    });
  }

  return (
    <Box mb="4">
      <Button
        type="button"
        variant="soft"
        color="gray"
        aria-expanded={open}
        aria-controls="kategoriak-panel"
        onClick={() => (open ? requestClose() : onOpenChange(true))}
      >
        {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
        Kategóriák
      </Button>

      {open && (
        <KategoriaPanelBody
          kategoriak={kategoriak}
          tetelek={tetelek}
          onAdd={onAdd}
          onDelete={onDelete}
          onSave={onSave}
          onDirtyChange={setDirty}
        />
      )}

      <DiscardChangesDialog
        open={guard.pending}
        onOpenChange={(o) => !o && guard.cancel()}
        onConfirm={guard.confirm}
        title="Nem mentett módosítás"
        description="A Kategóriák panelen nem mentett módosításod van. Ha becsukod, ez elvész — csak a Mentés gomb rögzíti. Biztosan folytatod?"
        confirmLabel="Becsukás, módosítás elvetésével"
      />
    </Box>
  );
}

/**
 * A Kategóriák panel pufferelt tartalma -- csak nyitva mountolt, a
 * `RendeloTab.tsx` mintáján: `useDirtyDraft` tartja a névre/színre/
 * sorrendre vonatkozó piszkozatot, a Mentés/Mégse gombpár azonnali (nincs
 * hozzá külön megerősítés, mert a `KategoriaPanel` külső rétege már véd a
 * panel becsukásától/NavBar-navigációtól). A kategória létrehozása/törlése
 * ETTŐL FÜGGETLENÜL azonnal ír a törzsadatba (lásd a lap `addCategory`/
 * `deleteCategory`-jának kommentjét) -- a draftot csak TÜKRÖZI, hogy a
 * doki folyamatban lévő szerkesztése ne vesszen el és a lista se essen
 * szét a mentetlen piszkozat alól.
 */
function KategoriaPanelBody({
  kategoriak,
  tetelek,
  onAdd,
  onDelete,
  onSave,
  onDirtyChange,
}: {
  kategoriak: Kategoria[];
  tetelek: Tetel[];
  onAdd: () => Kategoria;
  onDelete: (id: string) => void;
  onSave: (next: Kategoria[]) => Promise<boolean>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { draft, setDraft, dirty, reset } = useDirtyDraft<Kategoria[]>(kategoriak);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const jelzo = useMentesJelzo();

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  function patchDraft(
    id: string,
    patch: Partial<Kategoria> | ((prev: Kategoria) => Partial<Kategoria>),
  ) {
    setDraft((prev) =>
      prev.map((k) => (k.id === id ? { ...k, ...(typeof patch === 'function' ? patch(k) : patch) } : k)),
    );
  }

  function moveDraft(id: string, irany: -1 | 1) {
    setDraft((prev) => {
      const idx = prev.findIndex((k) => k.id === id);
      const cel = idx + irany;
      if (idx < 0 || cel < 0 || cel >= prev.length) return prev;
      const next = prev.slice();
      [next[idx], next[cel]] = [next[cel], next[idx]];
      return next;
    });
  }

  function handleAdd() {
    const created = onAdd();
    setDraft((prev) => [...prev, created]);
    setOpenCat(created.id);
  }

  function handleDelete(id: string) {
    onDelete(id);
    setDraft((prev) => prev.filter((k) => k.id !== id));
    if (openCat === id) setOpenCat(null);
  }

  async function handleSave() {
    // A tömbsorrend a megjelenítési/fogszín-ütközési sorrend (lásd
    // docs/07-felulet-rendszer.md § Szín, forma, sűrűség és
    // domain/toothVisual.ts `resolveToothVisual`) -- a `sorrend` mező csak
    // ennek a lemezre írt tükre, ezért itt, mentéskor számozódik újra.
    const next = draft.map((k, i) => ({ ...k, sorrend: i + 1 }));
    await jelzo.futtat(async () => {
      const ok = await onSave(next);
      if (ok) setDraft(next);
      return ok;
    });
  }

  return (
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
          {draft.map((k, i) => {
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
                  onClick={() => setOpenCat(openCat === k.id ? null : k.id)}
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
                      setOpenCat(openCat === k.id ? null : k.id);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {k.nev.hu}
                    {!k.nev.de && (
                      <Text size="1" ml="2" color="gray">
                        nincs DE név
                      </Text>
                    )}
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
                          moveDraft(k.id, -1);
                        }}
                      >
                        <ArrowUpIcon />
                      </IconButton>
                      <IconButton
                        aria-label="Kategória lejjebb"
                        variant="ghost"
                        color="gray"
                        size="1"
                        disabled={i === draft.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveDraft(k.id, 1);
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
                        handleDelete(k.id);
                      }}
                    >
                      <TrashIcon />
                    </IconButton>
                  </Table.Cell>
                </Table.Row>

                {openCat === k.id && (
                  <Table.Row id={`kategoria-szerkeszto-${k.id}`}>
                    <Table.Cell colSpan={5} style={{ background: t.surfaceAlt }}>
                      <KategoriaEditor kategoria={k} onPatch={(p) => patchDraft(k.id, p)} />
                    </Table.Cell>
                  </Table.Row>
                )}
              </Fragment>
            );
          })}
        </Table.Body>
      </Table.Root>

      <Flex justify="between" align="center">
        <Button type="button" size="1" variant="soft" onClick={handleAdd}>
          + Új kategória
        </Button>
        <Flex align="center" gap="3">
          {dirty && !jelzo.saved && (
            <Text size="1" color="gray">
              Nem mentett módosítás
            </Text>
          )}
          <Button
            type="button"
            size="1"
            variant="soft"
            color="gray"
            onClick={reset}
            disabled={jelzo.saving || !dirty}
          >
            Mégse
          </Button>
          <Button size="1" onClick={() => void handleSave()} disabled={jelzo.saving || !dirty}>
            {jelzo.felirat('Mentés')}
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
}

/** Kinyitott kategória-sor -- a mai `ItemEditor` mintájára. */
function KategoriaEditor({
  kategoria,
  onPatch,
}: {
  kategoria: Kategoria;
  onPatch: (patch: Partial<Kategoria> | ((prev: Kategoria) => Partial<Kategoria>)) => void;
}) {
  return (
    <Box py="2">
      <Grid columns="2" gap="3" mb="3">
        <Field label="Megnevezés (magyar)">
          <BufferedTextField
            value={kategoria.nev.hu}
            onChange={(v) => onPatch((prev) => ({ nev: { ...prev.nev, hu: v } }))}
          />
        </Field>
        <Field label="Bezeichnung (német)">
          <BufferedTextField
            value={kategoria.nev.de || ''}
            placeholder="még nincs megadva"
            onChange={(v) => onPatch((prev) => ({ nev: { ...prev.nev, de: v || null } }))}
          />
        </Field>
      </Grid>

      {/* Kurált paletta, nincs szabad hex/natív color input -- két kategória
          kaphat azonos színt, a felület ezt nem jelzi. */}
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
