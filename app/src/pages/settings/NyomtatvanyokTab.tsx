// Nyomtatványok tab -- a Beállítások tab-szerkezetének (D49) második tabja:
// a nyilatkozat/fizetési feltételek/garancia sablonszövegek szerkesztője.
// Korábban a `SettingsPage.tsx` "Nyomtatvány szövegei" Card-ja volt -- ez
// volt az EGYETLEN szekció, ami már a tabosítás előtt is explicit
// Mentés/Mégse + dirty guarddal (D38) működött, a többi szekciótól
// eltérően. A tabosítás ezt a mintát terjeszti ki a másik két tabra, nem
// fordítva.

import { useEffect, useRef, useState } from 'react';
import { Box, Button, Callout, Flex, Text, TextArea } from '@radix-ui/themes';
import { Field } from '../../components/Field';
import ChipGroup from '../../components/ChipGroup';
import DiscardChangesDialog, { useDiscardGuard } from '../../components/DiscardChangesDialog';
import { useDirtyDraft } from '../../components/useDirtyDraft';
import type { Nyelv } from '../../domain/types';
import { t } from '../../design/tokens';
import { stripMarkdownHeading } from '../../pdf/markdownLite';
import { PREFIX } from '../../storage/DemoStorage';
import { TEMPLATE_HEADINGS } from '../../storage/seed/templates';
import { useStorage } from '../../storage/StorageContext';
import { useAppState } from '../../state/AppState';

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

/**
 * A shell (`SettingsPage.tsx`) hívja, amikor a doki egy dirty Nyomtatványok
 * tabról vált el (tab-váltás vagy NavBar-navigáció, D46) -- a piszkozat ekkor
 * ténylegesen elvész (a Radix unmountolja a tab tartalmát), ezért a cache-nek
 * is el kell vesznie, különben egy F5 a tab-váltás UTÁN visszahozná a
 * "már elvetett" szöveget.
 */
export function clearAllTemplateDraftCache(): void {
  try {
    localStorage.removeItem(TEMPLATE_DRAFT_CACHE_KEY);
  } catch {
    // Lásd writeTemplateDraftCache -- alacsony tét, néma no-op.
  }
}

export default function NyomtatvanyokTab({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const { settings } = useAppState();
  const { storage, loadLatestTemplateByBase } = useStorage();

  // A tárolóból betöltött szöveg base-enként ("igazság") és a jelenleg
  // rá mutató verziófájl neve -- a mai draftDirty (useDirtyDraft) ehhez a
  // "saved" oldalhoz hasonlítja a szerkesztőmezők piszkozatát.
  const [templateLang, setTemplateLang] = useState<Nyelv>('hu');
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
    onDirtyChange(templatesDirty);
  }, [templatesDirty, onDirtyChange]);

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

  return (
    <>
      {settings.nemetEngedelyezve && (
        <Box mb="3">
          {/* div, nem <label> -- lásd a ChipGroup melletti megjegyzést lent. */}
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
        <Button onClick={() => void handleSaveTemplates()} disabled={templatesLoading || templateSaving || !templatesDirty}>
          {templateSaving ? 'Mentés…' : templateSaved ? 'Mentve ✓' : 'Szöveg mentése'}
        </Button>
      </Flex>

      {/* A Mégse minden nyelv/szövegen elveti a piszkozatot (nem csak a
          jelenleg látszó nyelvet), ezért -- a Rendelő adatai/Egyéb tab
          azonnali Mégse-jétől eltérően -- megerősítést kér (D38). */}
      <DiscardChangesDialog
        open={cancelTemplatesGuard.pending}
        onOpenChange={(open) => !open && cancelTemplatesGuard.cancel()}
        onConfirm={cancelTemplatesGuard.confirm}
        title="Nem mentett módosítás"
        description="Minden nyelven/szövegen elveted a nem mentett módosításokat -- ez nem vonható vissza."
        confirmLabel="Elvetés"
      />
    </>
  );
}
