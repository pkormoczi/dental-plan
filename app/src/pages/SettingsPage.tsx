// Beállítások -- docs/03-funkcionalis-spec.md "7. Beállítások", minimál
// szinten (a gyökérmappa-kijelölés és a sablonszöveg-szerkesztő a
// FileSystemStorage-hoz kötött 2. fázis feladata, lásd CLAUDE.md).

import { useState } from 'react';
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
import { t } from '../design/tokens';
import { useAppState } from '../state/AppState';

export default function SettingsPage() {
  const { settings, saveSettings, priceList } = useAppState();
  // aktivOsszes/deNevvel függetlenek a pénznemtől -- csak az `arazott`
  // mezőhöz kell külön az EUR nézet (lásd domain/coverage.ts).
  const cov = lefedettseg(priceList, 'HUF');
  const eurArazott = lefedettseg(priceList, 'EUR').arazott;
  const [orvosokText, setOrvosokText] = useState(settings.orvosok.join('\n'));
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
              Nyilatkozat: <Text style={{ fontFamily: t.mono }}>nyilatkozat-de-v1.md</Text> —
              placeholder, jogi lektorálás szükséges
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
