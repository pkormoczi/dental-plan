// Egyéb tab -- a Beállítások tab-szerkezetének (D49) harmadik tabja: ajánlat
// érvényessége + alapértelmezett nyelv/pénznem + "A német tartalom
// készültsége" áttekintő (tételnév-/EUR ár-lefedettség és a nyilatkozat
// placeholder-státusza). Korábban a `SettingsPage.tsx` "Ajánlat és nyelv" Card-ja volt,
// leütésenkénti autosave-vel (D31); a tabosítás óta pufferelt draft +
// explicit Mentés/Mégse.
//
// A készültség-blokk feltétel nélkül látszik (52. tétel: a német nyelv
// mindig választható, nincs hozzá engedélyező kapcsoló) -- a `nyilatkozat-de`
// sablont emiatt ez a komponens tölti be saját maga, FÜGGETLENÜL a
// `NyomtatvanyokTab`-tól (nincs megosztott state a két tab között, mindkettő
// a `useStorage()` `loadLatestTemplateByBase`-jét hívja).

import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Callout,
  Flex,
  Link as RadixLink,
  Text,
  TextField,
} from '@radix-ui/themes';
import ChipGroup from '../../components/ChipGroup';
import { useDirtyDraft } from '../../components/useDirtyDraft';
import { Field } from '../../components/Field';
import Section from '../../components/Section';
import { alapertelmezettPenznem } from '../../domain/beallitasok';
import { lefedettseg } from '../../domain/coverage';
import { isPlaceholderTemplate } from '../../domain/templates';
import type { Nyelv, Penznem } from '../../domain/types';
import { t } from '../../design/tokens';
import { stripMarkdownHeading } from '../../pdf/markdownLite';
import { useStorage } from '../../storage/StorageContext';
import { useAppState } from '../../state/AppState';

interface EgyebDraft {
  ervenyessegNap: number;
  alapertelmezettNyelv: Nyelv;
  alapertelmezettPenznem: Penznem;
}

function toDraft(
  ervenyessegNap: number,
  alapertelmezettNyelv: Nyelv,
  alapertelmezettPenznem: Penznem,
): EgyebDraft {
  return { ervenyessegNap, alapertelmezettNyelv, alapertelmezettPenznem };
}

export default function EgyebTab({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const { settings, saveSettings, priceList } = useAppState();
  const { loadLatestTemplateByBase } = useStorage();
  const { draft, setDraft, dirty, reset } = useDirtyDraft<EgyebDraft>(
    toDraft(settings.ervenyessegNap, settings.alapertelmezettNyelv, alapertelmezettPenznem(settings)),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  // aktivOsszes/deNevvel függetlenek a pénznemtől -- csak az `arazott`
  // mezőhöz kell külön az EUR nézet (lásd domain/coverage.ts).
  const cov = lefedettseg(priceList, 'HUF');
  const eurArazott = lefedettseg(priceList, 'EUR').arazott;

  const [deNyilatkozatName, setDeNyilatkozatName] = useState<string | null>(null);
  const [deNyilatkozatKesz, setDeNyilatkozatKesz] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { name, body } = await loadLatestTemplateByBase('nyilatkozat-de');
        if (cancelled) return;
        setDeNyilatkozatName(name);
        setDeNyilatkozatKesz(!isPlaceholderTemplate(stripMarkdownHeading(body)));
      } catch {
        // Best-effort áttekintő -- egy sikertelen betöltés csak a
        // készültség-sort hagyja üresen, a tab többi része használható marad.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadLatestTemplateByBase]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await saveSettings((prev) => ({ ...prev, ...draft }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'A mentés váratlanul meghiúsult.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Section title="Ajánlat, nyelv és pénznem">
        <Field label="Ajánlat érvényessége (nap)">
          <TextField.Root
            type="number"
            min={1}
            value={draft.ervenyessegNap}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, ervenyessegNap: Math.max(1, Number(e.target.value) || 1) }))
            }
            style={{ maxWidth: 160 }}
          />
        </Field>

        <Box mt="3">
          {/* div, nem <label> -- a ChipGroup (Radix SegmentedControl) belül
              gomb-csoportot renderel, egy <label> csak egyetlen "labelable"
              elemet jelölhetne implicit módon. */}
          <Text as="div" size="1" color="gray" mb="1">
            Alapértelmezett nyelv új tervnél
          </Text>
          <ChipGroup
            value={draft.alapertelmezettNyelv}
            options={[
              ['hu', 'Magyar'],
              ['de', 'Deutsch'],
            ]}
            onChange={(nyelv) => setDraft((prev) => ({ ...prev, alapertelmezettNyelv: nyelv }))}
            ariaLabel="Alapértelmezett nyelv új tervnél"
          />
        </Box>

        <Box mt="3">
          <Text as="div" size="1" color="gray" mb="1">
            Alapértelmezett pénznem új tervnél
          </Text>
          <ChipGroup
            value={draft.alapertelmezettPenznem}
            options={[
              ['HUF', 'HUF — forint'],
              ['EUR', 'EUR — euró'],
            ]}
            onChange={(penznem) => setDraft((prev) => ({ ...prev, alapertelmezettPenznem: penznem }))}
            ariaLabel="Alapértelmezett pénznem új tervnél"
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
          <Text style={{ fontFamily: t.mono }}>{deNyilatkozatName ?? 'nyilatkozat-de-v1.md'}</Text>
          {deNyilatkozatKesz === false && ' — hiányzik vagy placeholder, jogi lektorálás szükséges'}
          {deNyilatkozatKesz === true && ' — kész'}
          <br />
          <RadixLink asChild>
            <RouterLink to="/arlista">Kezelések és árak megnyitása</RouterLink>
          </RadixLink>{' '}
          — a „Nincs EUR ár” szűrő a munkalista.
        </Text>
      </Section>

      {saveError && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>A mentés nem sikerült: {saveError}</Callout.Text>
        </Callout.Root>
      )}

      <Flex justify="end" align="center" gap="3">
        {dirty && !saved && (
          <Text size="1" color="gray">
            Nem mentett módosítás
          </Text>
        )}
        <Button type="button" variant="soft" color="gray" onClick={reset} disabled={saving || !dirty}>
          Mégse
        </Button>
        <Button onClick={() => void handleSave()} disabled={saving || !dirty}>
          {saving ? 'Mentés…' : saved ? 'Mentve ✓' : 'Mentés'}
        </Button>
      </Flex>
    </>
  );
}
