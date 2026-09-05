// Egy kezelési sor szerkesztő nézete a terv szerkesztőn -- kiemelve a
// PlanEditorPage.tsx-ből.

import { useEffect, useState } from 'react';
import { Badge, Box, Button, Flex, IconButton, Table, Text, TextArea, TextField } from '@radix-ui/themes';
import { CheckIcon, ResetIcon, TrashIcon, UpdateIcon } from '@radix-ui/react-icons';
import HuChip from '../../components/HuChip';
import NumberField from '../../components/NumberField';
import ToothPickerPopover from '../../components/ToothPickerPopover';
import { t } from '../../design/tokens';
import type { ArFrissites } from '../../domain/arKoveti';
import { leirasTulHosszu } from '../../domain/leirasHossz';
import { formatMoney } from '../../domain/money';
import { arlistaiLeiras, leirasKoveti, nevAtirt, resolveNev, type SorFallbackOk } from '../../domain/nev';
import { nyelviMismatch, reviewElfogadva } from '../../domain/nyelviReview';
import { orokoltKeziAru } from '../../domain/orokoltJelzesek';
import { nincsListaar } from '../../domain/penznemValtas';
import { sorElteres } from '../../domain/sorElteres';
import { sorMezokEgyedibol, sorMezokTetelbol } from '../../domain/sorMezok';
import { invalidFdiTokens, parseTeeth } from '../../domain/teeth';
import type { FogterkepAllapot } from '../../domain/toothVisual';
import { sorOsszeg } from '../../domain/totals';
import type { Kategoria, Nyelv, Penznem, Sor, Tetel } from '../../domain/types';
import { fogId, keresoId, leirasId, nevId } from './elemIdk';
import ItemPicker from './ItemPicker';

export interface LineRowProps {
  pi: number;
  li: number;
  line: Sor;
  currency: Penznem;
  nyelv: Nyelv;
  available: Tetel[];
  kategoriak: Kategoria[];
  fogterkep: FogterkepAllapot;
  fallback: SorFallbackOk | null;
  /** A sor mögötti árlistai tétel, ha `tetelId`-hez kötött (a `csomag`/leírás/
      név-eltérés/`nincsListaar` forrása); egyedi sornál `undefined`. */
  tetel: Tetel | undefined;
  /** `null`, ha a sor követi a mai árlistát -- lásd `domain/arKoveti.ts` (backlog-61, D70). */
  arFrissitesJavaslat: ArFrissites | null;
  /** 65. tétel (D72): a guided review kényszerítve nyitja a leírás-sávot -- lásd lent. */
  forceLeirasOpen: boolean;
  onPatch: (patch: Partial<Sor>) => void;
  onRequestArFrissites: () => void;
  onRemove: () => void;
}

export default function LineRow({
  pi,
  li,
  line,
  currency,
  nyelv,
  available,
  kategoriak,
  fogterkep,
  fallback,
  tetel,
  arFrissitesJavaslat,
  forceLeirasOpen,
  onPatch,
  onRequestArFrissites,
  onRemove,
}: LineRowProps) {
  // A fogtérkép-kattintással létrehozott, még meg nem nevezett sor -- ez az
  // EGYETLEN eset, ami a keresőt mutatja induláskor (backlog-3 1-2.
  // döntés: a névmező-pontosítás és az egyedi sor felvétele ugyanaz a
  // mechanizmus, csak azonositatlan sornál indul kereső módban).
  const azonositatlan = line.tetelId.trim() === '' && line.nevSnapshot.trim() === '';
  const [keresoMod, setKeresoMod] = useState(azonositatlan);
  // CSAK kikapcsolni szabad -- ha a doki utólag kiüríti egy egyedi sor
  // névmezőjét, a cella nem ránthatja ki alóla a fókuszt egy hirtelen
  // visszaugró keresővel.
  useEffect(() => {
    if (!azonositatlan) setKeresoMod(false);
  }, [azonositatlan]);
  const egyedi = line.tetelId.trim() === '';
  const teeth = parseTeeth(line.fogak);
  // Nem blokkoló, és a szabadszöveges jegyzet (pl. „jobb felső") nem hiba --
  // docs/02-domain-modell.md "Fogszám kezelés" szerint ez érvényes tartalom.
  // Csak azt a tokent jelezzük, ami SZÁMNAK néz ki, de nem érvényes FDI kód
  // (pl. elgépelt "99") -- lásd domain/teeth.ts `invalidFdiTokens`.
  const rosszTokenek = invalidFdiTokens(line.fogak);
  const invalidFormat = rosszTokenek.length > 0;
  // A darabszám mezőbe gépelt, még nem committált érték -- a NumberField
  // csak blur/Enterre írja a törzsadatot (P1-4), de ez a figyelmeztetés
  // gépelés közben is éljen, ne csak commit után.
  const [mennyisegDraft, setMennyisegDraft] = useState(line.mennyiseg);
  useEffect(() => setMennyisegDraft(line.mennyiseg), [line.mennyiseg]);
  const mismatch = teeth.valid && teeth.teeth.length !== mennyisegDraft;
  // Az Összeg cella élő követéséhez -- ugyanaz a minta, mint a
  // `mennyisegDraft`-nál fentebb.
  const [arDraft, setArDraft] = useState(line.tenylegesEgysegar);
  useEffect(() => setArDraft(line.tenylegesEgysegar), [line.tenylegesEgysegar]);
  // A visszakapcsoló ⟳ gomb (a Db cellában) akkor jelenik meg, ha a sor
  // levált a fogak-követéstől, ÉS van mihez visszakapcsolni -- lásd
  // `sorPatchKovetessel` (domain/mennyiseg.ts) 1. szabálya.
  const visszakapcsolhato = line.mennyisegKezi !== false && teeth.valid;
  const arEltero = !egyedi && line.tenylegesEgysegar !== line.listaEgysegar;
  // true, ha a sor tétele nincs beárazva a terv pénznemében -- lásd
  // `domain/penznemValtas.ts` `nincsListaar()` (62. tétel, D71).
  const araHianyzik = nincsListaar(line, tetel, currency);
  // Egyedi sornál és beárazatlan tételnél a 0 listaár HIÁNY, nem "ingyenes
  // lista" -- ha ezt nem jeleznénk a classifiernek, egy kézzel beírt
  // ajánlati ár tévesen "Felár" jelvényt kapna. Lásd `domain/sorElteres.ts`.
  const elteres = sorElteres(line, egyedi || araHianyzik);

  // backlog-60, 1. döntés: a `sorFallback`-tól FÜGGETLEN, nyelvfüggetlen
  // "kézzel átírt" komparátor -- lásd `domain/nev.ts` `nevAtirt()`.
  const nevEltero = tetel != null && nevAtirt(line, tetel, nyelv);
  // backlog-65 (D72): a `sorFallback`-tól SZÁNDÉKOSAN KÜLÖN kérdés -- nem
  // azt nézi, hogy a szöveg követi-e az árlistát, hanem hogy a doki
  // kézzel írt szövege a JELENLEGI dokumentumnyelven van-e. Magyar terven
  // is működik (szemben a `sorFallback`-kal), és egyedi sornál is ad
  // választ (szemben a `sorFallback` 'egyedi' ágával).
  const nevNyelvMismatch = nyelviMismatch(line.nevNyelv, nyelv);
  const leirasNyelvMismatch = nyelviMismatch(line.leirasNyelv, nyelv);

  // "+ leírás" összecsukható trigger (docs/02-domain-modell.md § Tétel-leírás)
  // -- ha már van tartalom, nyitva induljon; nincs "csak
  // kikapcsolni szabad" korlátozás, mert itt (a keresőmódtól eltérően)
  // nincs auto-collapse kockázat.
  const leirasTartalom = (line.leirasSnapshot ?? '').trim();
  const [leirasNyitva, setLeirasNyitva] = useState(Boolean(leirasTartalom));
  // 65. tétel (D72): a guided review kényszerítve nyitja a sávot -- CSAK
  // nyitni szabad innen (a `keresoMod`/`azonositatlan` fenti mintája), a
  // doki utólagos, kézi becsukását ez nem írja felül.
  useEffect(() => {
    if (forceLeirasOpen) setLeirasNyitva(true);
  }, [forceLeirasOpen]);
  // Korai vizuális jelzés (15. döntés): a trigger maga jelez amber színnel,
  // hogy ne szaporodjon egy külön jelvény a már amúgy is sűrű jelvénysorban.
  const csomag = tetel?.csomag ?? false;
  const hianyzoCsomagLeiras = csomag && !leirasTartalom;
  // backlog-60, 4. döntés: reset/marker csak akkor értelmes, ha VAN
  // árlistai leírás -- D27 mintája, hiányzó fordításnál nincs mire
  // visszaállítani.
  const arlistaLeirasSzoveg = tetel ? arlistaiLeiras(tetel, nyelv) : '';
  const leirasEltero = tetel != null && arlistaLeirasSzoveg !== '' && !leirasKoveti(line, tetel, nyelv);

  return (
    <>
    <Table.Row>
      <Table.Cell>
        {keresoMod ? (
          <ItemPicker
            available={available}
            kategoriak={kategoriak}
            currency={currency}
            nyelv={nyelv}
            floating="portal"
            autoFocus
            clearOnPick={false}
            id={keresoId(pi, li)}
            onPick={(item) => {
              onPatch(sorMezokTetelbol(item, currency, nyelv));
              setKeresoMod(false);
            }}
            onPickEgyedi={(nev) => {
              onPatch(sorMezokEgyedibol(nev, nyelv));
              setKeresoMod(false);
            }}
          />
        ) : (
          <Flex align="center" gap="1" wrap="wrap">
            <Box flexGrow="1" style={{ minWidth: 160 }}>
              <TextField.Root
                id={nevId(pi, li)}
                value={line.nevSnapshot}
                onChange={(e) => onPatch({ nevSnapshot: e.target.value })}
                aria-label="Beavatkozás megnevezése"
                aria-invalid={!line.nevSnapshot.trim() || undefined}
                // Radix a TextField keretét box-shadow-val rajzolja, nem
                // border-rel (lásd index.css) -- `borderColor` itt nem
                // hatna semmit, a hibaállapotot ezért box-shadow-val kell
                // felülírni. Alapállapotban a globális CSS-szabály elég.
                style={
                  line.nevSnapshot.trim() ? undefined : { boxShadow: `inset 0 0 0 1px ${t.danger}` }
                }
              />
            </Box>
            {egyedi && (
              <Badge color="gray" variant="soft" size="1">
                egyedi
              </Badge>
            )}
            {fallback === 'nincsForditas' && <HuChip />}
            {nevEltero && tetel && (
              <>
                <Badge color="amber" variant="soft" size="1">
                  átírt
                </Badge>
                <IconButton
                  type="button"
                  variant="ghost"
                  color="gray"
                  size="1"
                  aria-label="Név visszaállítása az árlistaira"
                  title="Név visszaállítása az árlistaira"
                  onClick={() =>
                    // backlog-65, 7. döntés (D481): a reset a nyelvi
                    // review-metaadatot is törli -- egy default-following
                    // szövegnek nincs értelme review-státuszt hordoznia.
                    onPatch({ nevSnapshot: resolveNev(tetel.nev, nyelv).szoveg, nevNyelv: null })
                  }
                >
                  <ResetIcon />
                </IconButton>
              </>
            )}
            {nevNyelvMismatch && (
              <>
                <Badge color="amber" variant="soft" size="1">
                  {line.nevNyelv?.authoredInLanguage === 'de' ? 'DE szöveg' : 'HU szöveg'}
                </Badge>
                <IconButton
                  type="button"
                  variant="ghost"
                  color="gray"
                  size="1"
                  aria-label="Nyelv ellenőrizve"
                  title="Nyelv ellenőrizve — a szöveg megfelel ezen a nyelven"
                  onClick={() => onPatch({ nevNyelv: reviewElfogadva(line.nevNyelv, nyelv) })}
                >
                  <CheckIcon />
                </IconButton>
              </>
            )}
            {elteres && (
              <Badge color={elteres.tipus === 'kedvezmeny' ? 'green' : 'amber'} variant="soft" size="1">
                {elteres.cimke}
              </Badge>
            )}
            {orokoltKeziAru(line) && (
              <Badge color="gray" variant="soft" size="1">
                örökölt ár
              </Badge>
            )}
            <Button
              type="button"
              size="1"
              variant="ghost"
              // A leírás-mismatch (backlog-65) is korai amber jelzést kap a
              // triggeren, mint a `hianyzoCsomagLeiras` -- a badge maga csak
              // nyitott sávban látszik, összecsukva enélkül néma maradna.
              color={hianyzoCsomagLeiras || leirasNyelvMismatch ? 'amber' : 'gray'}
              aria-expanded={leirasNyitva}
              title={
                hianyzoCsomagLeiras
                  ? 'Csomagtétel — hiányzik a leírás'
                  : leirasNyelvMismatch
                    ? 'A leírás nyelve ellenőrzésre vár'
                    : 'Leírás (mi van benne?)'
              }
              onClick={() => setLeirasNyitva((v) => !v)}
            >
              {leirasTartalom ? 'Leírás' : '+ leírás'}
            </Button>
          </Flex>
        )}
      </Table.Cell>

      <Table.Cell>
        <Flex align="center" gap="1">
          <Box flexGrow="1">
            <TextField.Root
              id={fogId(pi, li)}
              value={line.fogak}
              placeholder="pl. 16, 17, 26"
              onChange={(e) => onPatch({ fogak: e.target.value })}
              aria-invalid={invalidFormat || undefined}
              // lásd a soron fentebb: box-shadow, nem borderColor -- az
              // utóbbi nem hatna semmit a Radix TextField-en.
              style={{
                textAlign: 'center',
                ...(invalidFormat ? { boxShadow: `inset 0 0 0 1px ${t.danger}` } : {}),
              }}
            />
          </Box>
          <ToothPickerPopover
            fogak={line.fogak}
            allapot={fogterkep}
            onChange={(fogak) => onPatch({ fogak })}
          />
        </Flex>
        {invalidFormat && (
          <Text as="div" size="1" mt="1" style={{ color: t.danger }}>
            Nem érvényes FDI fogszám: {rosszTokenek.join(', ')} — a kvadráns 1-4 (tejfog 5-8), a fog a
            kvadránson belül 1-8 (tejfog 1-5) lehet.
          </Text>
        )}
        {mismatch && (
          <Text as="div" size="1" mt="1" style={{ color: t.warn }}>
            {teeth.teeth.length} fog van felsorolva, a darabszám {mennyisegDraft}. Szándékos?
          </Text>
        )}
      </Table.Cell>

      <Table.Cell>
        <Flex align="center" gap="1">
          <Box flexGrow="1">
            <NumberField
              value={line.mennyiseg}
              min={1}
              onCommit={(v) => onPatch({ mennyiseg: v })}
              onDraftChange={(v) => setMennyisegDraft(v ?? line.mennyiseg)}
              textAlign="center"
              aria-label="Darabszám"
            />
          </Box>
          <IconButton
            type="button"
            variant="ghost"
            color="gray"
            size="1"
            aria-label="Darabszám igazítása a fogakhoz"
            title="Darabszám igazítása a fogakhoz – innentől a fogak számát követi"
            // A tényleges szinkronizálást a `sorPatchKovetessel` 1. szabálya
            // végzi (domain/mennyiseg.ts) -- a hívó csak a szándékot jelzi.
            onClick={() => onPatch({ mennyisegKezi: false })}
            // A gomb MINDIG a DOM-ban marad, csak `visibility: hidden`-nel
            // tűnik el -- ha feltételesen renderelnénk, a mellette lévő
            // flexGrow-os NumberField szélessége soronként ugrálna aszerint,
            // hogy a sor levált-e. A tabIndex/aria-hidden kizárja a
            // fókuszsorból és a képernyőolvasóból, amíg nincs mit
            // visszakapcsolni.
            tabIndex={visszakapcsolhato ? 0 : -1}
            aria-hidden={visszakapcsolhato ? undefined : true}
            style={{ visibility: visszakapcsolhato ? 'visible' : 'hidden' }}
          >
            <UpdateIcon />
          </IconButton>
        </Flex>
      </Table.Cell>

      <Table.Cell justify="end">
        <Flex align="center" gap="1" justify="end">
          <Text
            style={{ fontVariantNumeric: 'tabular-nums', color: t.uiTextFaint, whiteSpace: 'nowrap' }}
          >
            {/* Egyedi sornál, illetve a terv pénznemében beárazatlan tételnél
                nincs értelmezhető árlistai referenciaár -- lásd
                sorMezokEgyedibol / domain/penznemValtas.ts `nincsListaar()`. */}
            {egyedi || araHianyzik ? '—' : formatMoney(line.listaEgysegar, currency, nyelv)}
          </Text>
          <IconButton
            type="button"
            variant="ghost"
            color="gray"
            size="1"
            aria-label="Ár frissítése az árlistából"
            title="Ár frissítése az árlistából"
            onClick={onRequestArFrissites}
            // A ⟳ mennyiség-visszakapcsoló (fent, Db cella) mintája: mindig a
            // DOM-ban marad, csak `visibility: hidden`-nel tűnik el, hogy a
            // cella szélessége ne ugráljon soronként.
            tabIndex={arFrissitesJavaslat ? 0 : -1}
            aria-hidden={arFrissitesJavaslat ? undefined : true}
            style={{ visibility: arFrissitesJavaslat ? 'visible' : 'hidden', color: t.warn }}
          >
            <UpdateIcon />
          </IconButton>
        </Flex>
      </Table.Cell>

      <Table.Cell justify="end">
        <Flex direction="column" align="end" gap="1">
          <Flex align="center" gap="1" justify="end" width="100%">
            <Box flexGrow="1">
              <NumberField
                value={line.tenylegesEgysegar}
                unit={currency}
                min={0}
                onCommit={(v) =>
                  // Egyedi sornál nincs "listaár" mező -- a `listaEgysegar` a
                  // `tenylegesEgysegar`-ral együtt íródik, hogy sosem legyen
                  // kedvezmény-/felár-jelvény egy nem létező referenciaárhoz
                  // képest.
                  onPatch(egyedi ? { tenylegesEgysegar: v, listaEgysegar: v } : { tenylegesEgysegar: v })
                }
                onDraftChange={(v) => setArDraft(v ?? line.tenylegesEgysegar)}
                textAlign="right"
                // 62. tétel (D71): beárazatlan tétel, még kézi ár nélkül -- a
                // kedvezmény-/felár-kiemeléssel azonos slot, csak
                // figyelmeztető színben, hogy ide dönteni kell.
                style={
                  elteres
                    ? { borderColor: t.brand }
                    : araHianyzik && line.tenylegesEgysegar === 0
                      ? { borderColor: t.warn }
                      : undefined
                }
                aria-label="Ajánlati egységár"
              />
            </Box>
            {/* A Db cella ⟳ gombjának mintája (fentebb): MINDIG a DOM-ban,
                csak `visibility: hidden`-nel tűnik el -- egy feltételes
                render soronként ugráltatná a flexGrow-os NumberField
                szélességét. */}
            <IconButton
              type="button"
              variant="ghost"
              color="gray"
              size="1"
              aria-label="Ajánlati ár visszaállítása a listaárra"
              title="Ajánlati ár visszaállítása a listaárra"
              onClick={() => onPatch({ tenylegesEgysegar: line.listaEgysegar })}
              tabIndex={arEltero ? 0 : -1}
              aria-hidden={arEltero ? undefined : true}
              style={{ visibility: arEltero ? 'visible' : 'hidden' }}
            >
              <ResetIcon />
            </IconButton>
          </Flex>
          {/* backlog-60, 3. döntés: a widget MARAD ghost `IconButton` +
              `≈` szövegglyph (docs/07-felulet-rendszer.md nevesített
              kivétele) -- csak a pozíciója költözött az ár mező alá (D82). */}
          <IconButton
            type="button"
            variant="ghost"
            color="gray"
            size="1"
            aria-pressed={line.savos}
            aria-label="Becsült ár"
            title="Becsült ár – a végleges összeg a kezelés során változhat."
            onClick={() => onPatch({ savos: !line.savos })}
            style={{ color: line.savos ? t.warn : t.uiTextFaint }}
          >
            ≈
          </IconButton>
        </Flex>
      </Table.Cell>

      <Table.Cell justify="end" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {/* Gépelés közben is követi az ár- és darabszám-mezőt -- a
            committált Összeg csak commit-on-blur (P1-4) után frissülne,
            ami a doki éppen gépelt számáról adna elavult visszajelzést. */}
        {formatMoney(
          sorOsszeg({ ...line, tenylegesEgysegar: arDraft, mennyiseg: mennyisegDraft }),
          currency,
          nyelv,
        )}
      </Table.Cell>

      <Table.Cell>
        <IconButton
          type="button"
          aria-label="Sor törlése"
          variant="ghost"
          color="gray"
          size="1"
          onClick={onRemove}
        >
          <TrashIcon />
        </IconButton>
      </Table.Cell>
    </Table.Row>
    {leirasNyitva && (
      <Table.Row>
        <Table.Cell colSpan={7}>
          <TextArea
            id={leirasId(pi, li)}
            value={line.leirasSnapshot ?? ''}
            onChange={(e) => onPatch({ leirasSnapshot: e.target.value })}
            placeholder="pl. Implantátum, felépítmény, korona"
            rows={2}
            aria-label="Leírás (mi van benne?)"
          />
          <Flex justify="between" align="center" mt="1">
            {leirasTulHosszu(line.leirasSnapshot ?? '') ? (
              <Text as="div" size="1" style={{ color: t.warn }}>
                Hosszú leírás — ellenőrizd a nyomtatási képet.
              </Text>
            ) : (
              <Box />
            )}
            {leirasEltero && (
              <Flex align="center" gap="1">
                <Badge color="amber" variant="soft" size="1">
                  átírt leírás
                </Badge>
                <IconButton
                  type="button"
                  variant="ghost"
                  color="gray"
                  size="1"
                  aria-label="Leírás visszaállítása az árlistaira"
                  title="Leírás visszaállítása az árlistaira"
                  onClick={() =>
                    // backlog-65, 7. döntés (D481): lásd a névmező reset
                    // kommentjét fentebb.
                    onPatch({ leirasSnapshot: arlistaLeirasSzoveg, leirasNyelv: null })
                  }
                >
                  <ResetIcon />
                </IconButton>
              </Flex>
            )}
            {leirasNyelvMismatch && (
              <Flex align="center" gap="1">
                <Badge color="amber" variant="soft" size="1">
                  {line.leirasNyelv?.authoredInLanguage === 'de' ? 'DE szöveg' : 'HU szöveg'}
                </Badge>
                <IconButton
                  type="button"
                  variant="ghost"
                  color="gray"
                  size="1"
                  aria-label="Nyelv ellenőrizve"
                  title="Nyelv ellenőrizve — a szöveg megfelel ezen a nyelven"
                  onClick={() => onPatch({ leirasNyelv: reviewElfogadva(line.leirasNyelv, nyelv) })}
                >
                  <CheckIcon />
                </IconButton>
              </Flex>
            )}
          </Flex>
        </Table.Cell>
      </Table.Row>
    )}
    </>
  );
}
