// Rendelő adatai tab -- a Beállítások tab-szerkezetének első tabja.
// Korábban a `SettingsPage.tsx` "Rendelő adatai" + "Orvosok" Card-ja volt,
// leütésenkénti autosave-vel; a tabosítás óta pufferelt draft +
// explicit Mentés/Mégse, a `PatientEditorPanel.tsx` mintáján (`useDirtyDraft`,
// azonnali -- megerősítés nélküli -- Mégse, mert csak a LÁTHATÓ mezőket
// veszíti el, nem egy másik nyelvet/fület).
//
// Az orvos-lista (korábban egyetlen "egy név soronként" TextArea)
// soronkénti táblázatra váltott -- aktív/inaktív jelölés és alapértelmezett-
// orvos fogalommal, a pages/priceListAdmin/KategoriaPanel.tsx sor-UI mintáján
// (Table.Root size="1" + soronkénti IconButton ↑/↓/🗑).

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Callout,
  Checkbox,
  Dialog,
  Flex,
  Grid,
  IconButton,
  Select,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes';
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '@radix-ui/react-icons';
import { Field } from '../../components/Field';
import Section from '../../components/Section';
import { useDirtyDraft } from '../../components/useDirtyDraft';
import { useMentesJelzo } from '../../components/useMentesJelzo';
import { alapertelmezettOrvosNeve } from '../../domain/orvosok';
import type { Rendelo, Settings } from '../../domain/types';
import { useAppState } from '../../state/AppState';

interface OrvosSor {
  nev: string;
  aktiv: boolean;
}

interface RendeloDraft {
  rendelo: Rendelo;
  orvosok: OrvosSor[];
  /** '' = nincs kiválasztva -- SOSEM `undefined` a draftban, a
   * `useDirtyDraft` `JSON.stringify`-alapú összehasonlítása ledobná az
   * `undefined` mezőket, ami hamis "nincs módosítás" jelzést adna. Az
   * `undefined`-dá alakítás csak mentéskor történik, lásd `handleSave`. */
  alapertelmezett: string;
}

function toDraft(settings: Settings): RendeloDraft {
  const inaktiv = new Set(settings.inaktivOrvosok ?? []);
  return {
    rendelo: settings.rendelo,
    orvosok: settings.orvosok.map((nev) => ({ nev, aktiv: !inaktiv.has(nev) })),
    // A ténylegesen érvényes default (nem a nyers `alapertelmezettOrvos`),
    // hogy egy funkció-előtti settings-nél is a helyes név látsszon.
    alapertelmezett: alapertelmezettOrvosNeve(settings),
  };
}

/** Melyik sor deaktiválása/törlése váltotta ki az azonnali
 * újraválasztás-kérést, és mi a maradék aktív nevek listája. */
interface ReassignState {
  action: 'deactivate' | 'remove';
  index: number;
  options: string[];
}

export default function RendeloTab({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const { settings, saveSettings } = useAppState();
  const { draft, setDraft, dirty, reset } = useDirtyDraft<RendeloDraft>(toDraft(settings));
  const jelzo = useMentesJelzo();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [megprobaltMenteni, setMegprobaltMenteni] = useState(false);
  const [reassign, setReassign] = useState<ReassignState | null>(null);
  const [ujAlapertelmezett, setUjAlapertelmezett] = useState('');

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  function patchRendelo(fields: Partial<Rendelo>) {
    setDraft((prev) => ({ ...prev, rendelo: { ...prev.rendelo, ...fields } }));
  }

  const aktivSorok = draft.orvosok.filter((o) => o.aktiv && o.nev.trim());
  const vanAktivOrvos = aktivSorok.length > 0;

  const nevekTrim = draft.orvosok.map((o) => o.nev.trim()).filter(Boolean);
  // A Mentés gomb nem tiltott -- kattintásra mutatja meg a hibát
  // (UjTetelDialog.tsx `kategoriaHiba` mintája).
  const duplikatumHiba =
    megprobaltMenteni && new Set(nevekTrim).size !== nevekTrim.length
      ? 'Két orvos neve nem lehet azonos.'
      : null;

  function applyAction(index: number, action: 'deactivate' | 'remove', ujDefault?: string) {
    setDraft((prev) => {
      const orvosok =
        action === 'remove'
          ? prev.orvosok.filter((_, i) => i !== index)
          : prev.orvosok.map((o, i) => (i === index ? { ...o, aktiv: false } : o));
      return {
        ...prev,
        orvosok,
        alapertelmezett: ujDefault !== undefined ? ujDefault : prev.alapertelmezett,
      };
    });
  }

  // A default sor deaktiválása/törlése, ha van másik aktív, azonnali
  // újraválasztást kér modális dialógusban -- Mégse/Escape visszavonja magát
  // a deaktiválást/törlést is (a draft nem változik, amíg nincs választás).
  // Ha nincs másik aktív, a művelet a dialógus megnyitása NÉLKÜL, azonnal
  // engedett, a default explicit törlésével (a "nincs aktív orvos" amber
  // figyelmeztetés jelzi a következményt).
  function attemptDeactivateOrRemove(index: number, action: 'deactivate' | 'remove') {
    const sor = draft.orvosok[index];
    const maradekAktiv = draft.orvosok.filter((o, i) => i !== index && o.aktiv && o.nev.trim());
    const eztVoltDefault = !!draft.alapertelmezett && sor.nev.trim() === draft.alapertelmezett.trim();
    if (eztVoltDefault && maradekAktiv.length > 0) {
      setUjAlapertelmezett(maradekAktiv[0].nev);
      setReassign({ action, index, options: maradekAktiv.map((o) => o.nev) });
      return;
    }
    applyAction(index, action, eztVoltDefault ? '' : undefined);
  }

  function handleToggleAktiv(index: number, aktiv: boolean) {
    if (!aktiv) {
      attemptDeactivateOrRemove(index, 'deactivate');
      return;
    }
    setDraft((prev) => ({
      ...prev,
      orvosok: prev.orvosok.map((o, i) => (i === index ? { ...o, aktiv: true } : o)),
    }));
  }

  function handleNevChange(index: number, nev: string) {
    setDraft((prev) => {
      const regi = prev.orvosok[index].nev;
      const orvosok = prev.orvosok.map((o, i) => (i === index ? { ...o, nev } : o));
      // A default a NÉVET követi, ha épp az átnevezett sor volt kijelölve --
      // enélkül egy egyszerű elgépelés-javítás csendben elveszítené a
      // default-jelölést.
      const alapertelmezett = prev.alapertelmezett === regi ? nev : prev.alapertelmezett;
      return { ...prev, orvosok, alapertelmezett };
    });
  }

  function handleMove(index: number, irany: -1 | 1) {
    setDraft((prev) => {
      const orvosok = [...prev.orvosok];
      const target = index + irany;
      [orvosok[index], orvosok[target]] = [orvosok[target], orvosok[index]];
      return { ...prev, orvosok };
    });
  }

  function handleAdd() {
    setDraft((prev) => ({ ...prev, orvosok: [...prev.orvosok, { nev: '', aktiv: true }] }));
  }

  function confirmReassign() {
    if (!reassign) return;
    applyAction(reassign.index, reassign.action, ujAlapertelmezett);
    setReassign(null);
  }

  async function handleSave() {
    setMegprobaltMenteni(true);
    const sorok = draft.orvosok.map((o) => ({ ...o, nev: o.nev.trim() })).filter((o) => o.nev);
    const nevek = sorok.map((o) => o.nev);
    if (new Set(nevek).size !== nevek.length) return;

    setSaveError(null);
    try {
      const inaktivOrvosok = sorok.filter((o) => !o.aktiv).map((o) => o.nev);
      const alapertelmezettOrvos =
        draft.alapertelmezett && nevek.includes(draft.alapertelmezett) ? draft.alapertelmezett : undefined;
      await jelzo.futtat(() =>
        saveSettings((prev) => ({
          ...prev,
          rendelo: draft.rendelo,
          orvosok: nevek,
          inaktivOrvosok: inaktivOrvosok.length > 0 ? inaktivOrvosok : undefined,
          alapertelmezettOrvos,
        })),
      );
      setMegprobaltMenteni(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'A mentés váratlanul meghiúsult.');
    }
  }

  return (
    <>
      <Section title="Rendelő adatai">
        <Grid columns={{ initial: '1', sm: '2' }} gap="3" style={{ maxWidth: 560 }}>
          <Field label="Név">
            <TextField.Root value={draft.rendelo.nev} onChange={(e) => patchRendelo({ nev: e.target.value })} />
          </Field>
          <Field label="Cím">
            <TextField.Root value={draft.rendelo.cim} onChange={(e) => patchRendelo({ cim: e.target.value })} />
          </Field>
          <Field label="Telefon">
            <TextField.Root
              value={draft.rendelo.telefon}
              onChange={(e) => patchRendelo({ telefon: e.target.value })}
            />
          </Field>
          <Field label="E-mail">
            <TextField.Root
              value={draft.rendelo.email}
              onChange={(e) => patchRendelo({ email: e.target.value })}
            />
          </Field>
          <Field label="Adószám">
            <TextField.Root
              value={draft.rendelo.adoszam}
              onChange={(e) => patchRendelo({ adoszam: e.target.value })}
              placeholder="kitöltendő"
            />
          </Field>
          <Field label="Cégjegyzékszám">
            <TextField.Root
              value={draft.rendelo.cegjegyzekszam}
              onChange={(e) => patchRendelo({ cegjegyzekszam: e.target.value })}
              placeholder="kitöltendő"
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Orvosok">
        <Table.Root size="1" mb="2" style={{ maxWidth: 560 }}>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Név</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="64px">Aktív</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="60px" />
              <Table.ColumnHeaderCell width="34px" />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {draft.orvosok.map((sor, i) => {
              const sorNeve = sor.nev.trim() || 'Új orvos';
              return (
                <Table.Row key={i}>
                  <Table.Cell>
                    <TextField.Root
                      value={sor.nev}
                      placeholder="Dr. …"
                      aria-label={`${i + 1}. orvos neve`}
                      onChange={(e) => handleNevChange(i, e.target.value)}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Checkbox
                      checked={sor.aktiv}
                      aria-label={`${sorNeve} aktív`}
                      onCheckedChange={(checked) => handleToggleAktiv(i, checked === true)}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Flex gap="1">
                      <IconButton
                        aria-label={`${sorNeve} feljebb`}
                        variant="ghost"
                        color="gray"
                        size="1"
                        disabled={i === 0}
                        onClick={() => handleMove(i, -1)}
                      >
                        <ArrowUpIcon />
                      </IconButton>
                      <IconButton
                        aria-label={`${sorNeve} lejjebb`}
                        variant="ghost"
                        color="gray"
                        size="1"
                        disabled={i === draft.orvosok.length - 1}
                        onClick={() => handleMove(i, 1)}
                      >
                        <ArrowDownIcon />
                      </IconButton>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    {/* Az orvos feltétel nélkül törölhető -- explicit eltérés
                        az árlista-tételek "csak deaktiválható" mintájától, mert a
                        `plan.orvos` NÉV-pillanatkép, nem `id`-hivatkozás. */}
                    <IconButton
                      aria-label={`${sorNeve} törlése`}
                      variant="ghost"
                      color="gray"
                      size="1"
                      onClick={() => attemptDeactivateOrRemove(i, 'remove')}
                    >
                      <TrashIcon />
                    </IconButton>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
        <Button type="button" size="1" variant="soft" onClick={handleAdd}>
          + Orvos hozzáadása
        </Button>

        <Box mt="4" style={{ maxWidth: 320 }}>
          <Field label="Alapértelmezett orvos (új terveknél)">
            <Select.Root
              value={draft.alapertelmezett || undefined}
              onValueChange={(v) => setDraft((prev) => ({ ...prev, alapertelmezett: v }))}
              disabled={!vanAktivOrvos}
            >
              <Select.Trigger placeholder="Válassz orvost…" style={{ width: '100%' }} />
              <Select.Content>
                {/* index a key-ben -- két orvos átmenetileg (mentés előtt,
                    blokkolva) azonos nevet viselhet szerkesztés közben. */}
                {aktivSorok.map((o, idx) => (
                  <Select.Item key={`${o.nev}#${idx}`} value={o.nev}>
                    {o.nev}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Field>
        </Box>

        {!vanAktivOrvos && (
          <Callout.Root color="amber" mt="3">
            <Callout.Text>
              Nincs aktív kezelőorvos. Az új tervek orvos nélkül indulnak, és a
              véglegesítésük blokkolva lesz, amíg nem aktiválsz egy orvost.
            </Callout.Text>
          </Callout.Root>
        )}

        {duplikatumHiba && (
          <Callout.Root color="red" mt="3">
            <Callout.Text>{duplikatumHiba}</Callout.Text>
          </Callout.Root>
        )}
      </Section>

      {saveError && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>A mentés nem sikerült: {saveError}</Callout.Text>
        </Callout.Root>
      )}

      <Flex justify="end" align="center" gap="3">
        {dirty && !jelzo.saved && (
          <Text size="1" color="gray">
            Nem mentett módosítás
          </Text>
        )}
        <Button type="button" variant="soft" color="gray" onClick={reset} disabled={jelzo.saving || !dirty}>
          Mégse
        </Button>
        <Button onClick={() => void handleSave()} disabled={jelzo.saving || !dirty}>
          {jelzo.felirat('Mentés')}
        </Button>
      </Flex>

      {/* A jelenlegi default orvos deaktiválása/törlése -- ha van
          másik aktív orvos -- azonnali újraválasztást kér, kötelező
          választással. Mégse/Escape a Dialog.Root onOpenChange-én át
          nyomtalanul zár, a draft NEM változik (lásd attemptDeactivateOrRemove). */}
      <Dialog.Root open={reassign !== null} onOpenChange={(open) => !open && setReassign(null)}>
        <Dialog.Content maxWidth="380px">
          <Dialog.Title>Ki legyen az alapértelmezett orvos?</Dialog.Title>
          <Dialog.Description size="2" color="gray">
            {reassign &&
              `${draft.orvosok[reassign.index]?.nev.trim() || 'Az orvos'} ${
                reassign.action === 'remove' ? 'törlődik' : 'inaktívvá válik'
              }, ő volt az alapértelmezett.`}
          </Dialog.Description>
          <Box mt="3">
            <Field label="Új alapértelmezett orvos">
              <Select.Root value={ujAlapertelmezett} onValueChange={setUjAlapertelmezett}>
                <Select.Trigger style={{ width: '100%' }} />
                <Select.Content>
                  {reassign?.options.map((nev, idx) => (
                    <Select.Item key={`${nev}#${idx}`} value={nev}>
                      {nev}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Field>
          </Box>
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button type="button" variant="soft" color="gray">
                Mégse
              </Button>
            </Dialog.Close>
            <Button onClick={confirmReassign}>Beállítás</Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
