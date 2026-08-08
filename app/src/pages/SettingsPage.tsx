// Beállítások -- docs/03-funkcionalis-spec.md "7. Beállítások". A
// gyökérmappa-kijelölés a FileSystemStorage-hoz kötött 2. fázis feladata
// (lásd CLAUDE.md), a nyilatkozat/fizetési feltételek sablonszerkesztője
// viszont már itt, a mockupban is elérhető.

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
import { lefedettseg } from '../domain/coverage';
import type { Nyelv } from '../domain/types';
import { t } from '../design/tokens';
import { stripMarkdownHeading } from '../pdf/markdownLite';
import { TEMPLATE_HEADINGS } from '../storage/seed/templates';
import { useStorage } from '../storage/StorageContext';
import { useAppState } from '../state/AppState';

type TemplateSlotKey = 'nyilatkozat' | 'fizetesi-feltetelek';

interface TemplateDraft {
  /** A jelenleg betöltött verzió fájlneve (pl. "nyilatkozat-hu-v2.md"). */
  name: string;
  /** A tárolóból betöltött törzs (cím nélkül) -- a "nem mentett módosítás" ehhez képest dől el. */
  original: string;
  /** A szerkesztőben lévő, még nem feltétlenül mentett törzs. */
  draft: string;
}

const TEMPLATE_SLOTS: Array<{ key: TemplateSlotKey; label: string; rows: number }> = [
  { key: 'nyilatkozat', label: 'Nyilatkozat', rows: 14 },
  { key: 'fizetesi-feltetelek', label: 'Fizetési feltételek', rows: 9 },
];

function templateBase(key: TemplateSlotKey, nyelv: Nyelv): string {
  return `${key}-${nyelv}`;
}

function isPlaceholderBody(body: string): boolean {
  return body.includes('PLACEHOLDER') || body.includes('PLATZHALTER');
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
  const [templates, setTemplates] = useState<Record<string, TemplateDraft>>({});
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateLoadError, setTemplateLoadError] = useState<string | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSaveError, setTemplateSaveError] = useState<string | null>(null);
  const [templateSaved, setTemplateSaved] = useState(false);
  // Melyik alapneveket töltöttük már be -- így a német engedélyezésekor
  // csak a HIÁNYZÓ (de) sablonokat kérjük le, a magyar oldalon esetleg már
  // megkezdett, nem mentett szerkesztés nem vész el egy újratöltéssel.
  const loadedTemplateBasesRef = useRef<Set<string>>(new Set());

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
        const entries = await Promise.all(
          missing.map(async (base) => {
            const { name, body } = await loadLatestTemplateByBase(base);
            const text = stripMarkdownHeading(body);
            return [base, { name, original: text, draft: text }] as const;
          }),
        );
        if (cancelled) return;
        for (const [base] of entries) loadedTemplateBasesRef.current.add(base);
        setTemplates((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
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
  }, [settings.nemetEngedelyezve, loadLatestTemplateByBase]);

  function updateTemplateDraft(key: TemplateSlotKey, value: string) {
    const base = templateBase(key, templateLang);
    setTemplates((prev) => {
      const existing = prev[base];
      if (!existing) return prev;
      return { ...prev, [base]: { ...existing, draft: value } };
    });
  }

  const templatesDirty = Object.values(templates).some((d) => d.draft !== d.original);

  async function handleSaveTemplates() {
    setTemplateSaving(true);
    setTemplateSaveError(null);
    try {
      const dirtyEntries = Object.entries(templates).filter(([, d]) => d.draft !== d.original);
      if (dirtyEntries.length > 0) {
        const updated: Record<string, TemplateDraft> = {};
        for (const [base, draft] of dirtyEntries) {
          const heading = TEMPLATE_HEADINGS[base as keyof typeof TEMPLATE_HEADINGS] ?? base;
          const fullBody = `# ${heading}\n\n${draft.draft.trim()}\n`;
          const newName = await storage.saveTemplate(base, fullBody);
          updated[base] = { name: newName, original: draft.draft, draft: draft.draft };
        }
        setTemplates((prev) => ({ ...prev, ...updated }));
      }
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 2000);
    } catch (err) {
      setTemplateSaveError(
        err instanceof Error ? err.message : 'A sablonszövegek mentése váratlanul meghiúsult.',
      );
    } finally {
      setTemplateSaving(false);
    }
  }

  const deNyilatkozat = templates['nyilatkozat-de'];
  const deNyilatkozatKesz = deNyilatkozat != null && !isPlaceholderBody(deNyilatkozat.original);

  // P0-8: korábban `void saveSettings(...)` volt -- a hívó nem várta meg és
  // nem ellenőrizte az eredményét, tehát egy sikertelen mentés (pl. kvóta)
  // némán elveszett, a "Mentve ✓" pedig a tényleges eredménytől függetlenül
  // jelent meg. `patch` most a siker/hiba tényét adja vissza, hogy a hívó
  // (pl. `handleSave`) el tudja dönteni, mutassa-e a visszajelzést.
  async function patch(fields: Partial<typeof settings>): Promise<boolean> {
    try {
      await saveSettings({ ...settings, ...fields });
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
            onChange={(e) => patch({ rendelo: { ...settings.rendelo, nev: e.target.value } })}
          />
        </Field>
        <Field label="Cím">
          <TextField.Root
            value={settings.rendelo.cim}
            onChange={(e) => patch({ rendelo: { ...settings.rendelo, cim: e.target.value } })}
          />
        </Field>
        <Grid columns="2" gap="3">
          <Field label="Telefon">
            <TextField.Root
              value={settings.rendelo.telefon}
              onChange={(e) => patch({ rendelo: { ...settings.rendelo, telefon: e.target.value } })}
            />
          </Field>
          <Field label="E-mail">
            <TextField.Root
              value={settings.rendelo.email}
              onChange={(e) => patch({ rendelo: { ...settings.rendelo, email: e.target.value } })}
            />
          </Field>
        </Grid>
        <Grid columns="2" gap="3" mt="3">
          <Field label="Adószám">
            <TextField.Root
              value={settings.rendelo.adoszam}
              onChange={(e) => patch({ rendelo: { ...settings.rendelo, adoszam: e.target.value } })}
              placeholder="kitöltendő"
            />
          </Field>
          <Field label="Cégjegyzékszám">
            <TextField.Root
              value={settings.rendelo.cegjegyzekszam}
              onChange={(e) =>
                patch({ rendelo: { ...settings.rendelo, cegjegyzekszam: e.target.value } })
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
              <Text style={{ fontFamily: t.mono }}>{deNyilatkozat?.name ?? 'nyilatkozat-de-v1.md'}</Text>
              {deNyilatkozatKesz ? ' — kész' : ' — placeholder, jogi lektorálás szükséges'}
              <br />
              <RadixLink asChild>
                <RouterLink to="/arlista">Árlista megnyitása</RouterLink>
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
            const draft = templates[templateBase(slot.key, templateLang)];
            if (!draft) return null;
            return (
              <Box key={slot.key} mb="3">
                <Field label={slot.label}>
                  <TextArea
                    value={draft.draft}
                    onChange={(e) => updateTemplateDraft(slot.key, e.target.value)}
                    rows={slot.rows}
                    resize="vertical"
                  />
                </Field>
                <Text as="div" size="1" color="gray">
                  Jelenleg: <Text style={{ fontFamily: t.mono }}>{draft.name}</Text>
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
            onClick={handleSaveTemplates}
            disabled={templatesLoading || templateSaving || !templatesDirty}
          >
            {templateSaving ? 'Mentés…' : templateSaved ? 'Mentve ✓' : 'Szöveg mentése'}
          </Button>
        </Flex>
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
