// Beállítások -- docs/03-funkcionalis-spec.md "7. Beállítások". A
// gyökérmappa-kijelölés a FileSystemStorage-hoz kötött 2. fázis feladata
// (lásd CLAUDE.md), a sablonszövegek (nyilatkozat/fizetési feltételek/
// garancia) szerkesztője viszont már itt, a mockupban is elérhető.

import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Callout,
  Card,
  Checkbox,
  Flex,
  Grid,
  Heading,
  Link as RadixLink,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes';
import ChipGroup from '../components/ChipGroup';
import DiscardChangesDialog, { useDiscardGuard } from '../components/DiscardChangesDialog';
import { useDirtyDraft } from '../components/useDirtyDraft';
import { lefedettseg } from '../domain/coverage';
import { isPlaceholderTemplate } from '../domain/templates';
import type { Nyelv } from '../domain/types';
import { t } from '../design/tokens';
import { stripMarkdownHeading } from '../pdf/markdownLite';
import { PREFIX } from '../storage/DemoStorage';
import { TEMPLATE_HEADINGS } from '../storage/seed/templates';
import { useStorage } from '../storage/StorageContext';
import { useAppState } from '../state/AppState';

type TemplateSlotKey = 'nyilatkozat' | 'fizetesi-feltetelek' | 'garancia';

const TEMPLATE_SLOTS: Array<{ key: TemplateSlotKey; label: string; rows: number }> = [
  { key: 'nyilatkozat', label: 'Nyilatkozat', rows: 14 },
  { key: 'fizetesi-feltetelek', label: 'Fizetési feltételek', rows: 9 },
  { key: 'garancia', label: 'Garancia', rows: 9 },
];

function templateBase(key: TemplateSlotKey, nyelv: Nyelv): string {
  return `${key}-${nyelv}`;
}

// Ad hoc localStorage-cache a sablonszerkesztő piszkozatához --
// docs/03-funkcionalis-spec.md § 7. Beállítások: NEM a `DraftStorage`
// bővítése (az kizárólag `Plan`-ra típusozott, egyetlen felelősséggel),
// hanem egy önálló, base-kulcsolt JSON objektum. A
// `dp:` prefix (`DemoStorage.ts` `PREFIX`-je) miatt a "Minden adat
// törlése"/"Demó adat visszaállítása" prefix-seprése ezt is elviszi, külön
// kód nélkül.
const TEMPLATE_DRAFT_CACHE_KEY = `${PREFIX}sablon-piszkozat`;

function readTemplateDraftCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TEMPLATE_DRAFT_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeTemplateDraftCache(cache: Record<string, string>): void {
  try {
    localStorage.setItem(TEMPLATE_DRAFT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Alacsony tét (csak szövegbevitel elvesztésének kockázata, nincs
    // páciensadat) -- egy kvótahiba itt nem kap külön UI-hibát, a
    // szerkesztés a komponens state-jében eddig is megmaradt.
  }
}

function updateTemplateDraftCache(base: string, value: string): void {
  const cache = readTemplateDraftCache();
  cache[base] = value;
  writeTemplateDraftCache(cache);
}

function clearTemplateDraftCacheEntry(base: string): void {
  const cache = readTemplateDraftCache();
  if (!(base in cache)) return;
  delete cache[base];
  writeTemplateDraftCache(cache);
}

export default function SettingsPage() {
  const { settings, saveSettings, priceList } = useAppState();
  const { storage, loadLatestTemplateByBase } = useStorage();
  // aktivOsszes/deNevvel függetlenek a pénznemtől -- csak az `arazott`
  // mezőhöz kell külön az EUR nézet (lásd domain/coverage.ts).
  const cov = lefedettseg(priceList, 'HUF');
  const eurArazott = lefedettseg(priceList, 'EUR').arazott;
  const [orvosokText, setOrvosokText] = useState(settings.orvosok.join('\n'));
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // A nyomtatvány szövegei (nyilatkozat, fizetési feltételek) -- ezek NEM a
  // `settings` részei, hanem verziózott sablonfájlok (lásd
  // storage/seed/templates.ts fejlécét): egy aláírt terv `sablonVerzio`-ja
  // pinneli, melyik szöveget írta alá a páciens (D4), ezért a szerkesztés
  // itt mindig ÚJ verziófájlt hoz létre, a régit nem írja felül.
  const [templateLang, setTemplateLang] = useState<Nyelv>('hu');
  // A tárolóból betöltött szöveg base-enként ("igazság") és a jelenleg
  // rá mutató verziófájl neve -- a mai draftDirty (useDirtyDraft) ehhez a
  // "saved" oldalhoz hasonlítja a szerkesztőmezők piszkozatát.
  const [templateNames, setTemplateNames] = useState<Record<string, string>>({});
  const [savedTemplateTexts, setSavedTemplateTexts] = useState<Record<string, string>>({});
  const {
    draft: templateDrafts,
    setDraft: setTemplateDrafts,
    dirty: templatesDirty,
    reset: resetTemplateDrafts,
  } = useDirtyDraft<Record<string, string>>(savedTemplateTexts);
  const cancelTemplatesGuard = useDiscardGuard(templatesDirty);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateLoadError, setTemplateLoadError] = useState<string | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSaveError, setTemplateSaveError] = useState<string | null>(null);
  const [templateSaved, setTemplateSaved] = useState(false);
  // Melyik alapneveket töltöttük már be -- így a német engedélyezésekor
  // csak a HIÁNYZÓ (de) sablonokat kérjük le, a magyar oldalon esetleg már
  // megkezdett, nem mentett szerkesztés nem vész el egy újratöltéssel.
  const loadedTemplateBasesRef = useRef<Set<string>>(new Set());
  // Dupla-kattintás elleni in-flight zár, ugyanaz a minta, mint a
  // `PreviewPage.tsx` `savingRef`-je -- a `templateSaving` state önmagában
  // nem elég, mert egy második kattintás a render ELŐTT is megtörténhet.
  const templateSavingRef = useRef(false);

  useEffect(() => {
    if (!settings.nemetEngedelyezve && templateLang === 'de') setTemplateLang('hu');
  }, [settings.nemetEngedelyezve, templateLang]);

  useEffect(() => {
    let cancelled = false;
    const nyelvek: Nyelv[] = settings.nemetEngedelyezve ? ['hu', 'de'] : ['hu'];
    const bases = TEMPLATE_SLOTS.flatMap((slot) => nyelvek.map((nyelv) => templateBase(slot.key, nyelv)));
    const missing = bases.filter((base) => !loadedTemplateBasesRef.current.has(base));
    if (missing.length === 0) return;

    (async () => {
      try {
        // A piszkozat-cache-t egyszer olvassuk be a body elején -- szinkron
        // művelet, nem kell base-enként újraolvasni.
        const draftCache = readTemplateDraftCache();
        const entries = await Promise.all(
          missing.map(async (base) => {
            const { name, body } = await loadLatestTemplateByBase(base);
            const text = stripMarkdownHeading(body);
            // Néma visszaállítás (4. döntés): ha van cache-elt piszkozat
            // ehhez a base-hez, az kerül a piszkozat-oldalra -- a saved
            // oldal marad a ténylegesen tárolt szöveg, hogy a meglévő "Nem
            // mentett módosítás" felirat (useDirtyDraft dirty-je)
            // automatikusan jelezze az eltérést.
            const cachedDraft = draftCache[base];
            return [base, { name, text, draft: cachedDraft ?? text }] as const;
          }),
        );
        if (cancelled) return;
        for (const [base] of entries) loadedTemplateBasesRef.current.add(base);
        setTemplateNames((prev) => ({
          ...prev,
          ...Object.fromEntries(entries.map(([base, e]) => [base, e.name])),
        }));
        setSavedTemplateTexts((prev) => ({
          ...prev,
          ...Object.fromEntries(entries.map(([base, e]) => [base, e.text])),
        }));
        // A már betöltött (és esetleg szerkesztett) base-ek piszkozata NEM
        // veszhet el egy később érkező nyelv betöltésekor -- ezért az ÚJ
        // bejegyzések kerülnek balra a spreadben, a `prev` felülírja őket.
        setTemplateDrafts((prev) => ({
          ...Object.fromEntries(entries.map(([base, e]) => [base, e.draft])),
          ...prev,
        }));
        setTemplateLoadError(null);
      } catch (err) {
        if (!cancelled) {
          setTemplateLoadError(
            err instanceof Error ? err.message : 'A sablonszövegek betöltése váratlanul meghiúsult.',
          );
        }
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settings.nemetEngedelyezve, loadLatestTemplateByBase, setTemplateDrafts]);

  function updateTemplateDraft(key: TemplateSlotKey, value: string) {
    const base = templateBase(key, templateLang);
    setTemplateDrafts((prev) => {
      if (!(base in prev)) return prev;
      return { ...prev, [base]: value };
    });
    // Minden leütésre ír, debounce nélkül -- a localStorage-írás szinkron és
    // olcsó, a meglévő piszkozat-minta (DemoDraftStorage) sem debounce-ol.
    updateTemplateDraftCache(base, value);
  }

  async function handleSaveTemplates() {
    // 5. döntés: dupla-kattintás elleni zár, lásd a `templateSavingRef` fenti
    // kommentjét -- a `disabled` prop önmagában nem elég.
    if (templateSavingRef.current) return;
    templateSavingRef.current = true;
    setTemplateSaving(true);
    setTemplateSaveError(null);
    try {
      const dirtyBases = Object.keys(templateDrafts).filter(
        (base) => templateDrafts[base] !== savedTemplateTexts[base],
      );
      if (dirtyBases.length > 0) {
        const nameUpdates: Record<string, string> = {};
        const textUpdates: Record<string, string> = {};
        for (const base of dirtyBases) {
          const heading = TEMPLATE_HEADINGS[base as keyof typeof TEMPLATE_HEADINGS] ?? base;
          const text = templateDrafts[base];
          const fullBody = `# ${heading}\n\n${text.trim()}\n`;
          nameUpdates[base] = await storage.saveTemplate(base, fullBody);
          textUpdates[base] = text;
          // Törlés kizárólag sikeres mentéskor, base-enként (4. döntés).
          clearTemplateDraftCacheEntry(base);
        }
        setTemplateNames((prev) => ({ ...prev, ...nameUpdates }));
        setSavedTemplateTexts((prev) => ({ ...prev, ...textUpdates }));
      }
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 2000);
    } catch (err) {
      setTemplateSaveError(
        err instanceof Error ? err.message : 'A sablonszövegek mentése váratlanul meghiúsult.',
      );
    } finally {
      templateSavingRef.current = false;
      setTemplateSaving(false);
    }
  }

  // A "Mégse" MINDEN nyelv/szlot piszkozatát elveti, nem csak a jelenleg
  // látszó nyelvet -- ezért megerősítést kér (cancelTemplatesGuard), és a
  // `dp:sablon-piszkozat` cache-bejegyzést is törli minden dirty base-hez,
  // különben egy F5 után a piszkozat visszatérne.
  function handleCancelTemplates() {
    const dirtyBases = Object.keys(templateDrafts).filter(
      (base) => templateDrafts[base] !== savedTemplateTexts[base],
    );
    resetTemplateDrafts();
    dirtyBases.forEach(clearTemplateDraftCacheEntry);
  }

  const deNyilatkozatOriginal = savedTemplateTexts['nyilatkozat-de'];
  const deNyilatkozatKesz =
    deNyilatkozatOriginal != null && !isPlaceholderTemplate(deNyilatkozatOriginal);

  // P0-8: korábban `void saveSettings(...)` volt -- a hívó nem várta meg és
  // nem ellenőrizte az eredményét, tehát egy sikertelen mentés (pl. kvóta)
  // némán elveszett, a "Mentve ✓" pedig a tényleges eredménytől függetlenül
  // jelent meg. `patch` most a siker/hiba tényét adja vissza, hogy a hívó
  // (pl. `handleSave`) el tudja dönteni, mutassa-e a visszajelzést.
  //
  // D31: a `fields` lehet függvény is -- a merge a friss `prev`-re megy
  // (`AppState.tsx` `saveSettings` updater-szerződése). Csak a beágyazott
  // `rendelo` objektumot író hat mező (lásd lent) él ezzel: két rendelő-mező
  // gyors, egymást követő szerkesztése enélkül a `...settings.rendelo`
  // render-idejű closure-je miatt kiütné egymást.
  async function patch(
    fields: Partial<typeof settings> | ((prev: typeof settings) => Partial<typeof settings>),
  ): Promise<boolean> {
    try {
      await saveSettings((prev) => ({
        ...prev,
        ...(typeof fields === 'function' ? fields(prev) : fields),
      }));
      setSaveError(null);
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'A mentés váratlanul meghiúsult.');
      return false;
    }
  }

  async function commitOrvosok(): Promise<boolean> {
    const list = orvosokText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return patch({ orvosok: list });
  }

  async function handleSave() {
    const ok = await commitOrvosok();
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <Box style={{ maxWidth: 560, margin: '0 auto' }}>
      <Heading size="5" mb="4" style={{ color: t.brand }}>
        Beállítások
      </Heading>

      <Card size="2" mb="4">
        <Text as="p" size="2" weight="bold" mb="3" style={{ color: t.brand }}>
          Rendelő adatai
        </Text>
        <Field label="Név">
          <TextField.Root
            value={settings.rendelo.nev}
            onChange={(e) => patch((prev) => ({ rendelo: { ...prev.rendelo, nev: e.target.value } }))}
          />
        </Field>
        <Field label="Cím">
          <TextField.Root
            value={settings.rendelo.cim}
            onChange={(e) => patch((prev) => ({ rendelo: { ...prev.rendelo, cim: e.target.value } }))}
          />
        </Field>
        <Grid columns="2" gap="3">
          <Field label="Telefon">
            <TextField.Root
              value={settings.rendelo.telefon}
              onChange={(e) =>
                patch((prev) => ({ rendelo: { ...prev.rendelo, telefon: e.target.value } }))
              }
            />
          </Field>
          <Field label="E-mail">
            <TextField.Root
              value={settings.rendelo.email}
              onChange={(e) => patch((prev) => ({ rendelo: { ...prev.rendelo, email: e.target.value } }))}
            />
          </Field>
        </Grid>
        <Grid columns="2" gap="3" mt="3">
          <Field label="Adószám">
            <TextField.Root
              value={settings.rendelo.adoszam}
              onChange={(e) =>
                patch((prev) => ({ rendelo: { ...prev.rendelo, adoszam: e.target.value } }))
              }
              placeholder="kitöltendő"
            />
          </Field>
          <Field label="Cégjegyzékszám">
            <TextField.Root
              value={settings.rendelo.cegjegyzekszam}
              onChange={(e) =>
                patch((prev) => ({ rendelo: { ...prev.rendelo, cegjegyzekszam: e.target.value } }))
              }
              placeholder="kitöltendő"
            />
          </Field>
        </Grid>
      </Card>

      <Card size="2" mb="4">
        <Text as="p" size="2" weight="bold" mb="3" style={{ color: t.brand }}>
          Orvosok
        </Text>
        <Field label="Egy név soronként">
          <TextArea value={orvosokText} onChange={(e) => setOrvosokText(e.target.value)} onBlur={commitOrvosok} rows={3} />
        </Field>
      </Card>

      <Card size="2" mb="4">
        <Text as="p" size="2" weight="bold" mb="3" style={{ color: t.brand }}>
          Ajánlat és nyelv
        </Text>
        <Field label="Ajánlat érvényessége (nap)">
          <TextField.Root
            type="number"
            min={1}
            value={settings.ervenyessegNap}
            onChange={(e) => patch({ ervenyessegNap: Math.max(1, Number(e.target.value) || 1) })}
            style={{ maxWidth: 160 }}
          />
        </Field>

        <Text as="label" size="2" mt="3" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Checkbox
            checked={settings.nemetEngedelyezve}
            onCheckedChange={(checked) => patch({ nemetEngedelyezve: checked === true })}
          />
          Német nyelvű ajánlat engedélyezése
        </Text>

        {settings.nemetEngedelyezve && (
          <>
            <Box mt="3">
              {/* div, nem <label> -- a ChipGroup (Radix SegmentedControl) belül
                  gomb-csoportot renderel, egy <label> csak egyetlen "labelable"
                  elemet jelölhetne implicit módon. */}
              <Text as="div" size="1" color="gray" mb="1">
                Alapértelmezett nyelv új tervnél
              </Text>
              <ChipGroup
                value={settings.alapertelmezettNyelv}
                options={[
                  ['hu', 'Magyar'],
                  ['de', 'Deutsch'],
                ]}
                onChange={(nyelv) => patch({ alapertelmezettNyelv: nyelv })}
              />
            </Box>

            <Text as="div" size="1" color="gray" mt="3" style={{ lineHeight: 1.7 }}>
              <Text weight="bold">A német tartalom készültsége</Text>
              <br />
              Tételnevek: {cov.deNevvel} / {cov.aktivOsszes} lefordítva
              <br />
              EUR árak: {eurArazott} / {cov.aktivOsszes} kitöltve
              <br />
              Nyilatkozat:{' '}
              <Text style={{ fontFamily: t.mono }}>
                {templateNames['nyilatkozat-de'] ?? 'nyilatkozat-de-v1.md'}
              </Text>
              {deNyilatkozatKesz ? ' — kész' : ' — placeholder, jogi lektorálás szükséges'}
              <br />
              <RadixLink asChild>
                <RouterLink to="/arlista">Kezelések és árak megnyitása</RouterLink>
              </RadixLink>{' '}
              — a „Nincs EUR ár” szűrő a munkalista.
            </Text>
          </>
        )}
      </Card>

      <Card size="2" mb="4">
        <Text as="p" size="2" weight="bold" mb="3" style={{ color: t.brand }}>
          Nyomtatvány szövegei
        </Text>

        {settings.nemetEngedelyezve && (
          <Box mb="3">
            {/* div, nem <label> -- lásd a fenti ChipGroup melletti megjegyzést. */}
            <Text as="div" size="1" color="gray" mb="1">
              Nyelv
            </Text>
            <ChipGroup
              value={templateLang}
              options={[
                ['hu', 'Magyar'],
                ['de', 'Deutsch'],
              ]}
              onChange={setTemplateLang}
            />
          </Box>
        )}

        {templatesLoading ? (
          <Text as="p" size="2" color="gray">
            Betöltés…
          </Text>
        ) : (
          TEMPLATE_SLOTS.map((slot) => {
            const base = templateBase(slot.key, templateLang);
            const value = templateDrafts[base];
            if (value === undefined) return null;
            return (
              <Box key={slot.key} mb="3">
                <Field label={slot.label}>
                  <TextArea
                    value={value}
                    onChange={(e) => updateTemplateDraft(slot.key, e.target.value)}
                    rows={slot.rows}
                    resize="vertical"
                  />
                </Field>
                <Text as="div" size="1" color="gray">
                  Jelenleg: <Text style={{ fontFamily: t.mono }}>{templateNames[base]}</Text>
                </Text>
              </Box>
            );
          })
        )}

        <Text as="div" size="1" color="gray" mb="3" style={{ lineHeight: 1.7 }}>
          Használható helyőrző a nyilatkozat szövegében:{' '}
          <Text style={{ fontFamily: t.mono }}>{'{{orvos}}'}</Text> — a kezelőorvos neve, a nyomtatvány
          generálásakor cserélődik be. Mentéskor új verziófájl keletkezik (pl. „nyilatkozat-hu-v2.md”) --
          a már véglegesített tervek a saját, aláírt szövegükkel maradnak.
        </Text>

        {templateLoadError && (
          <Callout.Root color="red" mb="3">
            <Callout.Text>A sablonszövegek betöltése nem sikerült: {templateLoadError}</Callout.Text>
          </Callout.Root>
        )}
        {templateSaveError && (
          <Callout.Root color="red" mb="3">
            <Callout.Text>A szöveg mentése nem sikerült: {templateSaveError}</Callout.Text>
          </Callout.Root>
        )}

        <Flex justify="end" align="center" gap="3">
          {templatesDirty && !templateSaved && (
            <Text size="1" color="gray">
              Nem mentett módosítás
            </Text>
          )}
          <Button
            type="button"
            variant="soft"
            color="gray"
            onClick={() => cancelTemplatesGuard.request(handleCancelTemplates)}
            disabled={templatesLoading || templateSaving || !templatesDirty}
          >
            Mégse
          </Button>
          <Button
            onClick={handleSaveTemplates}
            disabled={templatesLoading || templateSaving || !templatesDirty}
          >
            {templateSaving ? 'Mentés…' : templateSaved ? 'Mentve ✓' : 'Szöveg mentése'}
          </Button>
        </Flex>

        {/* A Mégse minden nyelv/szlot piszkozatát elveti (nem csak a
            jelenleg látszó nyelvet), ezért -- a PatientEditorPanel azonnali
            Mégse-jétől eltérően -- megerősítést kér (D38). */}
        <DiscardChangesDialog
          open={cancelTemplatesGuard.pending}
          onOpenChange={(open) => !open && cancelTemplatesGuard.cancel()}
          onConfirm={cancelTemplatesGuard.confirm}
          title="Nem mentett módosítás"
          description="Minden nyelven/szövegen elveted a nem mentett módosításokat -- ez nem vonható vissza."
          confirmLabel="Elvetés"
        />
      </Card>

      <Card size="2" mb="4">
        <Text as="p" size="2" weight="bold" mb="3" style={{ color: t.brand }}>
          Logó
        </Text>
        <Text as="div" size="2" color="gray">
          Fájlnév: <Text style={{ fontFamily: t.mono }}>{settings.logoFajl}</Text>
        </Text>
        <Text as="div" size="1" color="gray" mt="1">
          A logócserét a végleges alkalmazásban a gyökérmappába helyezett fájl adja -- a
          mockupban ez fix.
        </Text>
      </Card>

      {saveError && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>A mentés nem sikerült: {saveError}</Callout.Text>
        </Callout.Root>
      )}

      <Flex justify="end">
        <Button onClick={handleSave}>{saved ? 'Mentve ✓' : 'Mentés'}</Button>
      </Flex>
    </Box>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <Text as="div" size="1" color="gray" mb="1">
        {label}
      </Text>
      {children}
    </label>
  );
}
