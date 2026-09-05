// Tömeges árváltoztatás (backlog-92) -- a lap fejlécsorában, a „+ Új tétel"
// gomb mellett elérhető dialógus. Radix Themes `Dialog` (NEM `AlertDialog` --
// tényleges paraméter- és sorválasztás történik benne), az `UjTetelDialog.tsx`
// szomszédjaként: onnan a Mentés/Mégse-konvenció és a „minden megnyitáskor
// tiszta lap" effekt. A checkbox-listás előnézet-táblázat elrendezése a
// `components/TorzsadatDiffDialog.tsx`-ből, de FORDÍTOTT alapállapottal --
// ott a dialógus MAGA az ajánlat (üres kiindulás védi a nem kért
// felülírástól), itt a szándékot a doki már kimondta a kör-választóval, a
// dialógus csak végrehajtja, ezért alapból MINDEN módosítható sor kipipálva
// jelenik meg (opt-out `kivett` halmaz, nem opt-in kijelölés).
//
// Nincs `useDirtyDraft`/`useDiscardGuard` bekötés -- Escape/Mégse nyomtalanul
// eldobja az összeállított műveletet, megerősítés-kérés nélkül, a paraméterek
// másodpercek alatt újra beállíthatók.

import { useEffect, useMemo, useState } from 'react';
import {
  AlertDialog,
  Box,
  Button,
  Checkbox,
  Dialog,
  Flex,
  RadioGroup,
  Select,
  SegmentedControl,
  Table,
  Text,
} from '@radix-ui/themes';
import { Field, FieldGroup } from '../../components/Field';
import NumberField from '../../components/NumberField';
import { t } from '../../design/tokens';
import { ALAP_KATEGORIA_SZIN } from '../../design/treatmentVisuals';
import { formatMoney, formatPrice } from '../../domain/money';
import {
  ALAP_KEREKITES,
  SZAZALEK_MAX_CSOKKENTES,
  SZAZALEK_MAX_EMELES,
  VALASZTHATO_KEREKITES,
  szazalekHiba,
  tomegesArOsszegzes,
  tomegesArSorok,
  type Irany,
  type TomegesArParams,
} from '../../domain/tomegesAr';
import type { Kategoria, Penznem, Tetel } from '../../domain/types';

type Kor = 'teljes' | 'kategoria' | 'szurt';

export interface TomegesArDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Már `sorrend` szerint rendezve -- lásd `sortedKategoriak`. */
  kategoriak: Kategoria[];
  tetelek: Tetel[];
  /**
   * A lap keresője/szűrője szerinti kör, a NYITOTT sor kivétele NÉLKÜL --
   * `null`, ha nincs aktív keresés/szűrő (ilyenkor a „jelenlegi szűrt lista"
   * kör-opció szó szerint azonos lenne a „Teljes árlista" körrel, ezért nem
   * jelenik meg).
   */
  szurtTetelek: Tetel[] | null;
  onApply: (idk: Set<string>, params: TomegesArParams) => Promise<boolean>;
}

export default function TomegesArDialog({
  open,
  onOpenChange,
  kategoriak,
  tetelek,
  szurtTetelek,
  onApply,
}: TomegesArDialogProps) {
  const [kor, setKor] = useState<Kor>('teljes');
  const [kategoriaId, setKategoriaId] = useState('');
  const [inaktivIs, setInaktivIs] = useState(false);
  const [penznem, setPenznem] = useState<Penznem>('HUF');
  const [irany, setIrany] = useState<Irany>('emeles');
  const [szazalek, setSzazalek] = useState<number | null>(null);
  const [kerekitesKorlat, setKerekitesKorlat] = useState(ALAP_KEREKITES);
  const [kivett, setKivett] = useState<Set<string>>(new Set());
  const [megprobaltAlkalmazni, setMegprobaltAlkalmazni] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Minden megnyitáskor tiszta lappal indul -- az `UjTetelDialog` mintája:
  // Mégse/Escape után a korábbi paraméterezés nem éled újra.
  useEffect(() => {
    if (open) {
      setKor('teljes');
      setKategoriaId('');
      setInaktivIs(false);
      setPenznem('HUF');
      setIrany('emeles');
      setSzazalek(null);
      setKerekitesKorlat(ALAP_KEREKITES);
      setKivett(new Set());
      setMegprobaltAlkalmazni(false);
      setConfirmOpen(false);
    }
  }, [open]);

  const korTetelek = useMemo((): Tetel[] => {
    if (kor === 'kategoria') return kategoriaId ? tetelek.filter((x) => x.kategoriaId === kategoriaId) : [];
    if (kor === 'szurt') return szurtTetelek ?? [];
    return tetelek;
  }, [kor, kategoriaId, tetelek, szurtTetelek]);

  const korSzurve = useMemo(
    () => (inaktivIs ? korTetelek : korTetelek.filter((x) => x.aktiv)),
    [korTetelek, inaktivIs],
  );

  const params: TomegesArParams = useMemo(
    () => ({ penznem, irany, szazalek: szazalek ?? 0, kerekitesKorlat }),
    [penznem, irany, szazalek, kerekitesKorlat],
  );
  const sorok = useMemo(() => tomegesArSorok(korSzurve, params), [korSzurve, params]);
  const osszegzes = useMemo(() => tomegesArOsszegzes(sorok, kivett), [sorok, kivett]);

  const percentHiba = szazalekHiba(irany, szazalek ?? 0);
  const kategoriaHiba = kor === 'kategoria' && !kategoriaId ? 'Válassz kategóriát.' : null;
  const nincsKijeloltSorHiba = osszegzes.valtozik === 0 ? 'Nincs kijelölt, változó sor.' : null;

  const valtozikIdk = useMemo(
    () => sorok.filter((s) => s.allapot === 'valtozik').map((s) => s.tetelId),
    [sorok],
  );
  const kijeloltSzam = valtozikIdk.filter((id) => !kivett.has(id)).length;

  function toggleSor(id: string) {
    setKivett((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAlkalmazasClick() {
    setMegprobaltAlkalmazni(true);
    if (kategoriaHiba || percentHiba || nincsKijeloltSorHiba) return;
    setConfirmOpen(true);
  }

  // A 12. döntés szerint sikertelen mentésnél sincs itteni újrapróbálás --
  // mindkét dialógus bezárul, a lap saját `saveError` Callout-ja jelez.
  async function handleConfirm() {
    const idk = new Set(valtozikIdk.filter((id) => !kivett.has(id)));
    await onApply(idk, params);
    onOpenChange(false);
  }

  const kerekitesLabel = (fok: number) => formatMoney(fok, penznem, 'hu');

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Content maxWidth="720px">
          <Dialog.Title>Tömeges árváltoztatás</Dialog.Title>
          <Dialog.Description size="2" color="gray">
            A kijelölt körben minden sor ára a megadott irányban és százalékban változik. A
            véglegesített tervek árait a művelet nem érinti.
          </Dialog.Description>

          <Box mt="4" mb="3">
            <FieldGroup label="Kör">
              <RadioGroup.Root value={kor} onValueChange={(v) => setKor(v as Kor)}>
                <Flex direction="column" gap="2">
                  <Text as="label" size="2">
                    <Flex gap="2" align="center">
                      <RadioGroup.Item value="teljes" /> Teljes árlista
                    </Flex>
                  </Text>
                  <Flex gap="2" align="center">
                    {/* A Select.Root SZÁNDÉKOSAN a <label>-en KÍVÜL -- a
                        Field/FieldGroup fejléc-kommentjének mintája: egy
                        <label>-be ágyazott másik interaktív elem
                        (itt: a kategória-választó) elrontaná a radio
                        accessible name-jét. */}
                    <Text as="label" size="2">
                      <Flex gap="2" align="center">
                        <RadioGroup.Item value="kategoria" /> Kategória
                      </Flex>
                    </Text>
                    {kor === 'kategoria' && (
                      <Select.Root value={kategoriaId || undefined} onValueChange={setKategoriaId}>
                        <Select.Trigger
                          aria-label="Kategória"
                          placeholder="Válassz kategóriát…"
                          style={{ width: 260 }}
                        />
                        <Select.Content>
                          {kategoriak.map((k) => (
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
                    )}
                  </Flex>
                  {szurtTetelek && (
                    <Text as="label" size="2">
                      <Flex gap="2" align="center">
                        <RadioGroup.Item value="szurt" /> A jelenlegi szűrt lista ({szurtTetelek.length}{' '}
                        tétel)
                      </Flex>
                    </Text>
                  )}
                </Flex>
              </RadioGroup.Root>
              {megprobaltAlkalmazni && kategoriaHiba && (
                <Text as="div" size="1" mt="1" style={{ color: t.danger }}>
                  {kategoriaHiba}
                </Text>
              )}
            </FieldGroup>

            <Text as="label" size="2" mt="3" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Checkbox checked={inaktivIs} onCheckedChange={(c) => setInaktivIs(c === true)} />
              Inaktív tételek is
            </Text>
          </Box>

          <Box mb="3">
            <FieldGroup label="Pénznem">
              <RadioGroup.Root value={penznem} onValueChange={(v) => setPenznem(v as Penznem)}>
                <Flex gap="4">
                  <Text as="label" size="2">
                    <Flex gap="2" align="center">
                      <RadioGroup.Item value="HUF" /> HUF
                    </Flex>
                  </Text>
                  <Text as="label" size="2">
                    <Flex gap="2" align="center">
                      <RadioGroup.Item value="EUR" /> EUR
                    </Flex>
                  </Text>
                </Flex>
              </RadioGroup.Root>
            </FieldGroup>
          </Box>

          <Flex gap="4" mb="3" align="end">
            <FieldGroup label="Irány">
              <SegmentedControl.Root value={irany} onValueChange={(v) => setIrany(v as Irany)} size="1">
                <SegmentedControl.Item value="emeles">Emelés</SegmentedControl.Item>
                <SegmentedControl.Item value="csokkentes">Csökkentés</SegmentedControl.Item>
              </SegmentedControl.Root>
            </FieldGroup>

            <Box style={{ width: 100 }}>
              <Field label="Százalék">
                <NumberField
                  value={szazalek}
                  penz={false}
                  min={0}
                  aria-label="Százalék"
                  onCommit={setSzazalek}
                  placeholder="0"
                />
              </Field>
            </Box>
            <Text size="1" color="gray">
              (0–{irany === 'emeles' ? SZAZALEK_MAX_EMELES : SZAZALEK_MAX_CSOKKENTES}%)
            </Text>
          </Flex>
          {megprobaltAlkalmazni && percentHiba && (
            <Text as="div" size="1" mt="-2" mb="3" style={{ color: t.danger }}>
              {percentHiba}
            </Text>
          )}

          <Box mb="3">
            <FieldGroup label="Kerekítés (felső korlát)">
              <SegmentedControl.Root
                value={String(kerekitesKorlat)}
                onValueChange={(v) => setKerekitesKorlat(Number(v))}
                size="1"
              >
                {VALASZTHATO_KEREKITES.map((fok) => (
                  <SegmentedControl.Item key={fok} value={String(fok)}>
                    {kerekitesLabel(fok)}
                  </SegmentedControl.Item>
                ))}
              </SegmentedControl.Root>
            </FieldGroup>
          </Box>

          <Text as="div" size="1" color="gray" mb="3">
            A már mentett tervek árai nem változnak. Egy éppen nyitott piszkozat sorain a meglévő
            „elavult ár" jelzés fog megjelenni, amit soronként lehet frissíteni.
          </Text>

          <Flex justify="between" align="center" mb="1">
            <Text size="2" weight="bold">
              Előnézet
            </Text>
            <Text as="label" size="1" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Checkbox
                checked={valtozikIdk.length > 0 && kijeloltSzam === valtozikIdk.length}
                onCheckedChange={(checked) =>
                  setKivett(checked === true ? new Set() : new Set(valtozikIdk))
                }
              />
              Összes kijelölése
            </Text>
          </Flex>

          <Box
            style={{
              border: `1px solid ${t.uiLine}`,
              borderRadius: t.radius,
              maxHeight: 320,
              overflowY: 'auto',
            }}
          >
            <Table.Root size="1">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell width="32px" />
                  <Table.ColumnHeaderCell>Megnevezés</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell justify="end">Régi</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell justify="end">Új</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Megjegyzés</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {korSzurve.map((tetel, i) => {
                  const sor = sorok[i];
                  const checked = sor.allapot === 'valtozik' && !kivett.has(sor.tetelId);
                  const megjegyzes =
                    sor.allapot === 'nincs-ar'
                      ? 'Nincs ár ebben a pénznemben'
                      : sor.allapot === 'nem-valtozik'
                        ? 'Nem változik'
                        : sor.allapot === 'nulla-ra-csokkenne'
                          ? '0-ra csökkenne — kihagyva'
                          : sor.finomabbLepes != null
                            ? `Finomabb kerekítés: ${formatMoney(sor.finomabbLepes, penznem, 'hu')}`
                            : '';
                  return (
                    <Table.Row key={tetel.id} style={{ opacity: sor.allapot === 'valtozik' ? 1 : 0.6 }}>
                      <Table.Cell>
                        <Checkbox
                          checked={checked}
                          disabled={sor.allapot !== 'valtozik'}
                          onCheckedChange={() => toggleSor(sor.tetelId)}
                          aria-label={tetel.nev.hu}
                        />
                      </Table.Cell>
                      <Table.Cell>{tetel.nev.hu}</Table.Cell>
                      <Table.Cell justify="end" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatPrice(sor.regi, penznem, 'hu') ?? '—'}
                      </Table.Cell>
                      <Table.Cell justify="end" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {sor.uj ? formatPrice(sor.uj, penznem, 'hu') : '—'}
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="1" color="gray">
                          {megjegyzes}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Box>

          <Box mt="2">
            <Text as="div" size="1" color="gray">
              {osszegzes.valtozik} tétel {penznem} ára változik
            </Text>
            {osszegzes.nincsAr > 0 && (
              <Text as="div" size="1" color="gray">
                {osszegzes.nincsAr} kihagyva (nincs ár ebben a pénznemben)
              </Text>
            )}
            {osszegzes.nemValtozik > 0 && (
              <Text as="div" size="1" color="gray">
                {osszegzes.nemValtozik} nem változik
              </Text>
            )}
            {osszegzes.nullara > 0 && (
              <Text as="div" size="1" color="gray">
                {osszegzes.nullara} kihagyva (0-ra csökkenne)
              </Text>
            )}
            {osszegzes.finomabb > 0 && (
              <Text as="div" size="1" color="gray">
                {osszegzes.finomabb} sornál finomabb kerekítés kellett
              </Text>
            )}
          </Box>
          {megprobaltAlkalmazni && nincsKijeloltSorHiba && !kategoriaHiba && !percentHiba && (
            <Text as="div" size="1" mt="1" style={{ color: t.danger }}>
              {nincsKijeloltSorHiba}
            </Text>
          )}

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button type="button" variant="soft" color="gray">
                Mégse
              </Button>
            </Dialog.Close>
            <Button type="button" onClick={handleAlkalmazasClick}>
              Alkalmazás
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <AlertDialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialog.Content maxWidth="460px">
          <AlertDialog.Title>Tömeges árváltoztatás megerősítése</AlertDialog.Title>
          <AlertDialog.Description size="2">
            {osszegzes.valtozik} tétel {penznem} ára változik. A művelet nem vonható vissza, és egy
            ellentétes irányú százalék sem állítja vissza pontosan az eredeti árakat (a kerekítés
            miatt).
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Mégse
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button onClick={() => void handleConfirm()}>Alkalmazás</Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  );
}
