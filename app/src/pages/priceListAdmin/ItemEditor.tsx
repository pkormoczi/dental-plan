// Kinyitott tétel-sor -- kiemelve a PriceListAdminPage.tsx-ből. Itt van
// minden mező, köztük a kategória-mozgatás.

import { useMemo, useRef, useState } from 'react';
import { Box, Button, Checkbox, Flex, Grid, IconButton, Select, Text } from '@radix-ui/themes';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Field, FieldGroup } from '../../components/Field';
import NumberField from '../../components/NumberField';
import { t } from '../../design/tokens';
import { ALAP_KATEGORIA_SZIN } from '../../design/treatmentVisuals';
import { arGyanu, arSlotok, legdragabbMasikAktiv, type ArBaseline } from '../../domain/arElgepeles';
import { leirasTulHosszu } from '../../domain/leirasHossz';
import { formatMoney, savosHatarForditott } from '../../domain/money';
import type { Ar, Kategoria, Penznem, Tetel } from '../../domain/types';
import { BufferedTextArea, BufferedTextField } from './BufferedFields';

/**
 * Elgépelés-védelem egy ár-slot alatt -- a `savosHatarForditott`/`leirasTulHosszu` mintájában
 * amber, nem blokkoló szöveg, itt egy "Visszaállítás" akcióval kiegészítve.
 * A gomb csak akkor jelenik meg, ha VAN érdemi baseline (nem hiányzik, és
 * nem 0) -- egy vadonatúj tétel abszolút jelzésénél a "Visszaállítás: 0 Ft"
 * nem javítás, csak a szöveg marad.
 *
 * SZÁNDÉKOSAN a `Field`-en KÍVÜL hívandó (lásd a hívási helyeket) -- egy
 * `<label>` (`Field`) egy belé ágyazott `<button>`-nek a saját szövege
 * helyett a label szövegét adná accessible name-nek.
 */
function ArFigyelmeztetes({
  ertek,
  baseline,
  referencia,
  penznem,
  onReset,
}: {
  ertek: number;
  baseline: number | undefined;
  referencia: number | null;
  penznem: Penznem;
  onReset: (regi: number) => void;
}) {
  const gyanu = arGyanu(ertek, baseline, referencia);
  if (!gyanu) return null;
  return (
    <Box mt="1">
      <Text as="div" size="1" style={{ color: t.warn }}>
        {gyanu === 'relativ'
          ? `Szokatlanul nagy változás — a sor kinyitásakor ${formatMoney(baseline ?? 0, penznem, 'hu')} volt.`
          : `Kirívóan magas ár — az árlista legdrágább aktív tétele ${formatMoney(referencia, penznem, 'hu')}.`}
      </Text>
      {baseline != null && baseline > 0 && (
        <Button type="button" size="1" variant="soft" color="gray" mt="1" onClick={() => onReset(baseline)}>
          Visszaállítás: {formatMoney(baseline, penznem, 'hu')}
        </Button>
      )}
    </Box>
  );
}

/** Kinyitott sor -- itt van minden mező, köztük a kategória-mozgatás. */
export default function ItemEditor({
  item,
  categories,
  tetelek,
  baselineToken,
  onPatch,
  autoFocusAr,
  pendingActivation,
  onFirstPriceCommit,
}: {
  item: Tetel;
  categories: Kategoria[];
  /** A teljes árlista -- az abszolút elgépelés-detektor referenciájához (`legdragabbMasikAktiv`). */
  tetelek: Tetel[];
  /** A Tömeges árváltoztatás után nő -- a baseline ilyenkor a friss értékre újrarögzül, jelzés nélkül. */
  baselineToken: number;
  onPatch: (patch: Partial<Tetel> | ((prev: Tetel) => Partial<Tetel>)) => void;
  /** Az Új tétel dialógusból frissen létrejött sorra igaz -- a HUF ár mező
   * kapja a fókuszt, mivel a doki a popupban csak nevet és kategóriát adott
   * meg (lásd a görgető effektet a szülő komponensben). */
  autoFocusAr?: boolean;
  /** Igaz, amíg a tétel a HUF ár mező első commitjára vár -- ekkor a fix ár
   * mező commitja `onFirstPriceCommit`-ot hívja `onPatch` helyett, lásd
   * `setFixPrice`. */
  pendingActivation?: boolean;
  onFirstPriceCommit?: (ertek: number) => void;
}) {
  const hufAr = item.ar.HUF ?? null;
  const eurAr = item.ar.EUR ?? null;
  const savos = hufAr?.tipus === 'SAVOS';

  // A relatív elgépelés-detektor viszonyítási alapja -- a sor KINYITÁSAKORI
  // érték, ár-slotonként, nem a megelőző commit: egy 45 000 → 450 000 → 450 500 javítás-sorozatnál
  // a "megelőző érték" alapú viszonyítás a második commit után elnémulna.
  // Nincs hozzá `Tetel`-séma mező -- a sor bezárása (ItemEditor unmount)
  // nyomtalanul elviszi, ugyanaz az elv, mint a `pendingActivationId`-nál.
  const [baseline, setBaseline] = useState<ArBaseline>(() => arSlotok(item.ar));
  // A Tömeges árváltoztatás után a baseline a friss értékre újrarögzül --
  // RENDER KÖZBEN, nem effektben, hogy egy renderre se villanjon fel a hamis
  // jelzés (React "adjusting state on prop change" mintája).
  const [prevBaselineToken, setPrevBaselineToken] = useState(baselineToken);
  if (prevBaselineToken !== baselineToken) {
    setPrevBaselineToken(baselineToken);
    setBaseline(arSlotok(item.ar));
  }

  const hufReferencia = useMemo(
    () => legdragabbMasikAktiv(tetelek, item.id, 'HUF'),
    [tetelek, item.id],
  );
  const eurReferencia = useMemo(
    () => legdragabbMasikAktiv(tetelek, item.id, 'EUR'),
    [tetelek, item.id],
  );

  // A `NumberField` csak akkor hívja az `onCommit`-ot, ha az érték
  // ténylegesen VÁLTOZOTT (lásd `components/NumberField.tsx` `commit()`) --
  // egy friss (0 Ft-tal induló) tételen a mezőt érintetlenül hagyva és
  // elhagyva emiatt SOHA nem fut le `setFixPrice`. Ez a ref jelzi, hogy az
  // "első interakció" (akár értékváltozással, akár anélkül) már lezajlott
  // -- `handleHufBlur` ezt a hiányzó esetet pótolja a mező saját `onBlur`-
  // jával, ami MINDIG lefut, a commit lefutásától függetlenül.
  const firstInteractionHandledRef = useRef(false);

  /**
   * P0-2: eddig csak a HUF-ot váltotta -- az EUR ár szerkezetileg
   * mindig FIX maradt, tehát egy sávos tétel német (EUR) ajánlatán a doki
   * tudta nélkül eltűnt a `*` jelölés és a sávos lábjegyzet. Mostantól a
   * két pénznem együtt vált, hogy a szerkezetük soha ne csússzon szét. Ha a
   * tételnek nincs EUR ára (`eurAr == null`), az marad -- a váltás nem hoz
   * létre új EUR árat a semmiből.
   *
   * Az `ar` objektumot a friss `prev`-ből építi, nem a renderelt
   * `item`-ből -- ez a valós versenyhelyzet: egy HUF-ár blur-commit után
   * azonnal jövő EUR-stepper kattintás (vagy fordítva) enélkül eldobná az
   * időben korábbi írást, mert mindkettő az `ar` objektumot cseréli
   * egészben.
   */
  function toggleType() {
    onPatch((prev) => {
      const prevHuf = prev.ar.HUF ?? null;
      const prevEur = prev.ar.EUR ?? null;
      const toSavos = prevHuf?.tipus !== 'SAVOS';
      const nextHuf: Ar = toSavos
        ? {
            tipus: 'SAVOS',
            min: prevHuf?.tipus === 'FIX' ? prevHuf.ertek : 0,
            max: prevHuf?.tipus === 'FIX' ? prevHuf.ertek : 0,
          }
        : { tipus: 'FIX', ertek: prevHuf?.tipus === 'SAVOS' ? prevHuf.min : 0 };

      const nextEur: Ar | null =
        prevEur == null
          ? null
          : toSavos
            ? {
                tipus: 'SAVOS',
                min: prevEur.tipus === 'FIX' ? prevEur.ertek : prevEur.min,
                max: prevEur.tipus === 'FIX' ? prevEur.ertek : prevEur.max,
              }
            : { tipus: 'FIX', ertek: prevEur.tipus === 'SAVOS' ? prevEur.min : prevEur.ertek };

      return { ar: { ...prev.ar, HUF: nextHuf, EUR: nextEur } };
    });
  }

  function setFixPrice(ertek: number) {
    // A MÉG SOHA nem aktivált tétel HUF ár mezőjének első commitja a szülő
    // aktiválási döntését váltja ki (némán aktivál, vagy megerősítést kér),
    // nem egy sima árpatch-et -- lásd `handleFirstPriceCommit` a szülőben.
    if (pendingActivation && !firstInteractionHandledRef.current) {
      firstInteractionHandledRef.current = true;
      onFirstPriceCommit?.(ertek);
      return;
    }
    onPatch((prev) => ({ ar: { ...prev.ar, HUF: { tipus: 'FIX', ertek } } }));
  }

  /**
   * A HUF ár mező `onBlur`-ja -- MINDIG lefut, akkor is, ha a mező a 0-n
   * maradt és emiatt a fenti `setFixPrice` (`onCommit`) egyáltalán nem
   * hívódott. Ha az "első interakció" még nincs elintézve, ez az egyetlen
   * jel, hogy a doki elhagyta a mezőt -- a jelenlegi (érintetlen) árral
   * hívja ugyanazt a döntést, amit egy tényleges commit hívna.
   */
  function handleFixPriceBlur() {
    if (pendingActivation && !firstInteractionHandledRef.current) {
      firstInteractionHandledRef.current = true;
      onFirstPriceCommit?.(hufAr?.tipus === 'FIX' ? hufAr.ertek : 0);
    }
  }

  function setSavosPrice(patch: Partial<{ min: number; max: number }>) {
    onPatch((prev) => {
      const prevHuf = prev.ar.HUF ?? null;
      const base = prevHuf?.tipus === 'SAVOS' ? prevHuf : { tipus: 'SAVOS' as const, min: 0, max: 0 };
      return { ar: { ...prev.ar, HUF: { ...base, ...patch } } };
    });
  }

  function setEurFix(ertek: number) {
    onPatch((prev) => ({ ar: { ...prev.ar, EUR: { tipus: 'FIX', ertek } } }));
  }

  function setEurSavos(patch: Partial<{ min: number; max: number }>) {
    onPatch((prev) => {
      const prevEur = prev.ar.EUR ?? null;
      const base = prevEur?.tipus === 'SAVOS' ? prevEur : { tipus: 'SAVOS' as const, min: 0, max: 0 };
      return { ar: { ...prev.ar, EUR: { ...base, ...patch } } };
    });
  }

  function clearEur() {
    onPatch((prev) => ({ ar: { ...prev.ar, EUR: null } }));
  }

  return (
    <Box py="2">
      <Grid columns="2" gap="3" mb="3">
        <Field label="Megnevezés (magyar)">
          <BufferedTextField
            id={`nev-hu-${item.id}`}
            value={item.nev.hu}
            onChange={(v) => onPatch((prev) => ({ nev: { ...prev.nev, hu: v } }))}
          />
        </Field>
        <Field label="Bezeichnung (német)">
          <BufferedTextField
            id={`nev-de-${item.id}`}
            value={item.nev.de || ''}
            placeholder="még nincs megadva"
            onChange={(v) => onPatch((prev) => ({ nev: { ...prev.nev, de: v || null } }))}
          />
        </Field>
      </Grid>

      <Grid columns="2" gap="3" mb="3">
        <Field label="Leírás (mi van benne?)">
          <BufferedTextArea
            id={`leiras-hu-${item.id}`}
            value={item.leiras?.hu ?? ''}
            placeholder="pl. Implantátum, felépítmény, korona"
            onChange={(v) => onPatch((prev) => ({ leiras: { hu: v, de: prev.leiras?.de ?? null } }))}
          />
          {leirasTulHosszu(item.leiras?.hu ?? '') && (
            <Text as="div" size="1" mt="1" style={{ color: t.warn }}>
              Hosszú leírás — ellenőrizd a nyomtatási képet.
            </Text>
          )}
        </Field>
        <Field label="Beschreibung (mi van benne, németül)">
          <BufferedTextArea
            id={`leiras-de-${item.id}`}
            value={item.leiras?.de ?? ''}
            placeholder="még nincs megadva"
            onChange={(v) => onPatch((prev) => ({ leiras: { hu: prev.leiras?.hu ?? '', de: v || null } }))}
          />
          {leirasTulHosszu(item.leiras?.de ?? '') && (
            <Text as="div" size="1" mt="1" style={{ color: t.warn }}>
              Hosszú leírás — ellenőrizd a nyomtatási képet.
            </Text>
          )}
        </Field>
      </Grid>

      <Flex mb="3">
        <Text as="label" size="2" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Checkbox
            checked={item.csomag ?? false}
            onCheckedChange={(checked) => onPatch({ csomag: checked === true })}
          />
          Csomagtétel — a véglegesítés figyelmeztet, ha az erre hivatkozó soron nincs leírás
        </Text>
      </Flex>

      <Flex mb="3">
        <Text as="label" size="2" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Checkbox
            checked={item.fogszamNemKell ?? false}
            onCheckedChange={(checked) => onPatch({ fogszamNemKell: checked === true })}
          />
          Fogszám nélkül is rendben — a véglegesítés nem figyelmeztet a hiányzó fogszámra
        </Text>
      </Flex>

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
            <Box>
              <Field label="HUF ár — tól">
                <NumberField
                  id={`huf-ar-tol-${item.id}`}
                  value={hufAr.min}
                  penz
                  min={0}
                  onCommit={(v) => setSavosPrice({ min: v })}
                />
              </Field>
              <ArFigyelmeztetes
                ertek={hufAr.min}
                baseline={baseline.HUF_MIN}
                referencia={hufReferencia}
                penznem="HUF"
                onReset={(regi) => setSavosPrice({ min: regi })}
              />
            </Box>
            <Box>
              <Field label="HUF ár — ig">
                <NumberField
                  id={`huf-ar-ig-${item.id}`}
                  value={hufAr.max}
                  penz
                  min={0}
                  onCommit={(v) => setSavosPrice({ max: v })}
                />
              </Field>
              <ArFigyelmeztetes
                ertek={hufAr.max}
                baseline={baseline.HUF_MAX}
                referencia={hufReferencia}
                penznem="HUF"
                onReset={(regi) => setSavosPrice({ max: regi })}
              />
            </Box>
            {savosHatarForditott(hufAr) && (
              <Text as="div" size="1" mt="1" style={{ color: t.warn, gridColumn: '1 / -1' }}>
                A „tól" nagyobb, mint az „ig" — fordított sáv, ellenőrizd.
              </Text>
            )}
          </>
        ) : (
          <Box>
            <Field label="HUF ár">
              <NumberField
                id={`huf-ar-${item.id}`}
                value={hufAr?.tipus === 'FIX' ? hufAr.ertek : 0}
                penz
                min={0}
                onCommit={setFixPrice}
                onBlur={pendingActivation ? handleFixPriceBlur : undefined}
                autoFocus={autoFocusAr}
              />
            </Field>
            <ArFigyelmeztetes
              ertek={hufAr?.tipus === 'FIX' ? hufAr.ertek : 0}
              baseline={baseline.HUF_FIX}
              referencia={hufReferencia}
              penznem="HUF"
              onReset={(regi) => onPatch((prev) => ({ ar: { ...prev.ar, HUF: { tipus: 'FIX', ertek: regi } } }))}
            />
          </Box>
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
            <Box>
              <Field label="EUR ár — tól (€)">
                <NumberField
                  id={`eur-ar-tol-${item.id}`}
                  value={eurAr.min}
                  penz
                  unit="EUR"
                  min={0}
                  onCommit={(v) => setEurSavos({ min: v })}
                />
              </Field>
              <ArFigyelmeztetes
                ertek={eurAr.min}
                baseline={baseline.EUR_MIN}
                referencia={eurReferencia}
                penznem="EUR"
                onReset={(regi) => setEurSavos({ min: regi })}
              />
            </Box>
            <Box>
              <Field label="EUR ár — ig (€)">
                <NumberField
                  id={`eur-ar-ig-${item.id}`}
                  value={eurAr.max}
                  penz
                  unit="EUR"
                  min={0}
                  onCommit={(v) => setEurSavos({ max: v })}
                />
              </Field>
              <ArFigyelmeztetes
                ertek={eurAr.max}
                baseline={baseline.EUR_MAX}
                referencia={eurReferencia}
                penznem="EUR"
                onReset={(regi) => setEurSavos({ max: regi })}
              />
            </Box>
            {savosHatarForditott(eurAr) && (
              <Text as="div" size="1" mt="1" style={{ color: t.warn, gridColumn: '1 / -1' }}>
                A „tól" nagyobb, mint az „ig" — fordított sáv, ellenőrizd.
              </Text>
            )}
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
                  id={`eur-ar-${item.id}`}
                  value={eurAr.tipus === 'FIX' ? eurAr.ertek : 0}
                  penz
                  unit="EUR"
                  min={0}
                  onCommit={setEurFix}
                />
              </Field>
              <ArFigyelmeztetes
                ertek={eurAr.tipus === 'FIX' ? eurAr.ertek : 0}
                baseline={baseline.EUR_FIX}
                referencia={eurReferencia}
                penznem="EUR"
                onReset={setEurFix}
              />
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
