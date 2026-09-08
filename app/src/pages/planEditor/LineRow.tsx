// Egy kezelési sor szerkesztő nézete a terv szerkesztőn -- kiemelve a
// PlanEditorPage.tsx-ből.

import { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  DropdownMenu,
  Flex,
  Table,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes';
import {
  CheckIcon,
  DotsHorizontalIcon,
  ResetIcon,
  TrashIcon,
  UpdateIcon,
} from '@radix-ui/react-icons';
import HuChip from '../../components/HuChip';
import IkonGomb from '../../components/IkonGomb';
import NumberField from '../../components/NumberField';
import ToothPickerPopover from '../../components/ToothPickerPopover';
import { t } from '../../design/tokens';
import type { ArFrissites } from '../../domain/arKoveti';
import { leirasTulHosszu } from '../../domain/leirasHossz';
import { formatMoney, formatPrice } from '../../domain/money';
import { arlistaiLeiras, leirasKoveti, nevAtirt, resolveNev, type SorFallbackOk } from '../../domain/nev';
import { nyelviMismatch, reviewElfogadva } from '../../domain/nyelviReview';
import { orokoltKeziAru } from '../../domain/orokoltJelzesek';
import { nincsListaar } from '../../domain/penznemValtas';
import { sorReferenciaAr } from '../../domain/savHatar';
import { sorElteres } from '../../domain/sorElteres';
import { sorMezokEgyedibol, sorMezokTetelbol } from '../../domain/sorMezok';
import { invalidFdiTokens, parseTeeth } from '../../domain/teeth';
import type { FogterkepAllapot } from '../../domain/toothVisual';
import { sorOsszeg } from '../../domain/totals';
import type { Kategoria, Nyelv, Penznem, Sor, Tetel } from '../../domain/types';
import { arId, fogId, keresoId, leirasId, mennyisegId, nevId, sorMenuId } from './elemIdk';
import ItemPicker from './ItemPicker';

/** A `Sor` azon mezői, amiket a szerkesztés alatt álló sor élőben felülír. */
export interface SorDraftErtekek {
  tenylegesEgysegar: number;
  mennyiseg: number;
}

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
  /** `null`, ha a sor követi a mai árlistát -- lásd `domain/arKoveti.ts` (backlog-61). */
  arFrissitesJavaslat: ArFrissites | null;
  /** 65. tétel: a guided review kényszerítve nyitja a leírás-sávot -- lásd lent. */
  forceLeirasOpen: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onPatch: (patch: Partial<Sor>) => void;
  /**
   * Az ÉPPEN GÉPELT (még nem committált) ár/darabszám a szülő felé -- ebből
   * épül a Fázis összesen és a Mindösszesen élő értéke. `null` = a sor
   * kilépett a szerkesztésből, innentől a committált érték az igaz.
   */
  onDraftOsszeg: (draft: SorDraftErtekek | null) => void;
  onRequestArFrissites: () => void;
  /** A Fog mezőben az Enter -- a hívó viszi a fókuszt a fázis keresőjébe. */
  onFogKesz: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
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
  canMoveUp,
  canMoveDown,
  onPatch,
  onDraftOsszeg,
  onRequestArFrissites,
  onFogKesz,
  onMoveUp,
  onMoveDown,
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
  // a Fog mező jegyzetmezővé válása elfogadott (PRODUCT.md § Nem cél).
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
  // `domain/penznemValtas.ts` `nincsListaar()` (62. tétel).
  const araHianyzik = nincsListaar(line, tetel, currency);
  // Egyedi sornál és beárazatlan tételnél a 0 listaár HIÁNY, nem "ingyenes
  // lista" -- ha ezt nem jeleznénk a classifiernek, egy kézzel beírt
  // ajánlati ár tévesen "Felár" jelvényt kapna. Lásd `domain/sorElteres.ts`.
  const elteres = sorElteres(line, egyedi || araHianyzik);

  // „−10%" / „+10%" / csupasz „10%" (= kedvezmény) az Ajánlati ár mezőben:
  // ez a papír nyelve („koronára 10% kedv."), és a leggyakoribb eset
  // mínuszjel nélkül is gépelhető. A százalék SOSEM tárolódik -- az
  // `ElolegBlokk` mintáját követi: a `Sor`-ra csak a belőle számolt abszolút
  // ár kerül. Az alap a `sorReferenciaAr`, ugyanaz, amiből a visszaigazoló
  // jelvény számol -- így a beírt „−10%" és a jelvény sosem térhet el.
  function szazalekosAr(text: string): number | null {
    const m = /^([+-]?)\s*(\d+(?:[.,]\d+)?)\s*%$/.exec(text.trim());
    if (!m) return null;
    const arany = Number(m[2].replace(',', '.'));
    if (!Number.isFinite(arany)) return null;
    // Negatív eredményt (pl. „150%" kedvezmény) SZÁNDÉKOSAN visszaadunk: a
    // NumberField `min={0}` őre állítja vissza az előző értékre, saját
    // hibaüzenet nélkül.
    return Math.round(sorReferenciaAr(line) * (1 + ((m[1] === '+' ? 1 : -1) * arany) / 100));
  }

  // backlog-60, 1. döntés: a `sorFallback`-tól FÜGGETLEN, nyelvfüggetlen
  // "kézzel átírt" komparátor -- lásd `domain/nev.ts` `nevAtirt()`.
  const nevEltero = tetel != null && nevAtirt(line, tetel, nyelv);
  // backlog-65: a `sorFallback`-tól SZÁNDÉKOSAN KÜLÖN kérdés -- nem
  // azt nézi, hogy a szöveg követi-e az árlistát, hanem hogy a doki
  // kézzel írt szövege a JELENLEGI dokumentumnyelven van-e. Magyar terven
  // is működik (szemben a `sorFallback`-kal), és egyedi sornál is ad
  // választ (szemben a `sorFallback` 'egyedi' ágával).
  const nevNyelvMismatch = nyelviMismatch(line.nevNyelv, nyelv);
  const leirasNyelvMismatch = nyelviMismatch(line.leirasNyelv, nyelv);

  // "+ leírás" összecsukható trigger
  // -- ha már van tartalom, nyitva induljon; nincs "csak
  // kikapcsolni szabad" korlátozás, mert itt (a keresőmódtól eltérően)
  // nincs auto-collapse kockázat.
  const leirasTartalom = (line.leirasSnapshot ?? '').trim();
  const [leirasNyitva, setLeirasNyitva] = useState(Boolean(leirasTartalom));
  // 65. tétel: a guided review kényszerítve nyitja a sávot -- CSAK
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
  // árlistai leírás -- a leírás nem esik magyarra (app/src/domain/CLAUDE.md), hiányzó fordításnál nincs mire
  // visszaállítani.
  const arlistaLeirasSzoveg = tetel ? arlistaiLeiras(tetel, nyelv) : '';
  const leirasEltero = tetel != null && arlistaLeirasSzoveg !== '' && !leirasKoveti(line, tetel, nyelv);

  // A jelvénysáv csak akkor renderelődik, ha van benne mit mutatni -- a
  // névmező szélessége így soronként azonos, de a jelvény nélküli sorok (a
  // többség) nem magasodnak meg. A felsorolás a sáv tartalmát tükrözi, ezért
  // vele együtt bővül.
  const vanJelveny =
    egyedi ||
    fallback === 'nincsForditas' ||
    (nevEltero && tetel != null) ||
    nevNyelvMismatch ||
    orokoltKeziAru(line);

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
            // A keresőszövegből leválasztott fogszám csak ÜRES `fogak` mezőbe
            // íródik: ez a sor a fogtérképi kattintásból született, ott a
            // fogszám a doki explicit választása -- egy elgépelt szám némán
            // elvinné. A patch a `sorPatchKovetessel`-en megy át, tehát a
            // darabszám is szinkronizálódik.
            onPick={(item, fogak) => {
              onPatch({
                ...sorMezokTetelbol(item, currency, nyelv),
                ...(fogak && !line.fogak.trim() ? { fogak } : {}),
              });
              setKeresoMod(false);
            }}
            onPickEgyedi={(nev, fogak) => {
              onPatch({
                ...sorMezokEgyedibol(nev, nyelv),
                ...(fogak && !line.fogak.trim() ? { fogak } : {}),
              });
              setKeresoMod(false);
            }}
          />
        ) : (
          // Két sáv: felül a névmező + "+ leírás" (nem tördelő, hogy a
          // névmező szélessége soronként azonos legyen), alatta -- csak ha van
          // mit mutatni -- a jelvények. Egy sávban a jelvények a mező
          // szélességéből vettek el, és a gomb a mező alá tördelődött.
          <Box>
            <Flex align="center" gap="1" wrap="nowrap">
              <Box flexGrow="1" style={{ minWidth: 0 }}>
                <TextField.Root
                  id={nevId(pi, li)}
                  value={line.nevSnapshot}
                  onChange={(e) => onPatch({ nevSnapshot: e.target.value })}
                  aria-label="Beavatkozás megnevezése"
                  aria-invalid={!line.nevSnapshot.trim() || undefined}
                  // A mező szűkebb lehet a névnél -- a teljes szöveg így
                  // egérrel is előhívható, görgetés nélkül.
                  title={line.nevSnapshot}
                  // Radix a TextField keretét box-shadow-val rajzolja, nem
                  // border-rel (lásd index.css) -- `borderColor` itt nem
                  // hatna semmit, a hibaállapotot ezért box-shadow-val kell
                  // felülírni. Alapállapotban a globális CSS-szabály elég.
                  style={
                    line.nevSnapshot.trim() ? undefined : { boxShadow: `inset 0 0 0 1px ${t.danger}` }
                  }
                />
              </Box>
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
                style={{ flexShrink: 0 }}
              >
                {leirasTartalom ? 'Leírás' : '+ leírás'}
              </Button>
            </Flex>
            {vanJelveny && (
              <Flex align="center" gap="1" wrap="wrap" mt="1">
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
                    <IkonGomb
                      type="button"
                      variant="ghost"
                      color="gray"
                      size="1"
                      cimke="Név visszaállítása az árlistaira"
                      onClick={() =>
                        // backlog-65, 7. döntés: a reset a nyelvi
                        // review-metaadatot is törli -- egy default-following
                        // szövegnek nincs értelme review-státuszt hordoznia.
                        onPatch({ nevSnapshot: resolveNev(tetel.nev, nyelv).szoveg, nevNyelv: null })
                      }
                    >
                      <ResetIcon />
                    </IkonGomb>
                  </>
                )}
                {nevNyelvMismatch && (
                  <>
                    <Badge color="amber" variant="soft" size="1">
                      {line.nevNyelv?.authoredInLanguage === 'de' ? 'DE szöveg' : 'HU szöveg'}
                    </Badge>
                    <IkonGomb
                      type="button"
                      variant="ghost"
                      color="gray"
                      size="1"
                      cimke="Nyelv ellenőrizve — a szöveg megfelel ezen a nyelven"
                      ariaLabel="Nyelv ellenőrizve"
                      onClick={() => onPatch({ nevNyelv: reviewElfogadva(line.nevNyelv, nyelv) })}
                    >
                      <CheckIcon />
                    </IkonGomb>
                  </>
                )}
                {orokoltKeziAru(line) && (
                  <Badge color="gray" variant="soft" size="1">
                    örökölt ár
                  </Badge>
                )}
              </Flex>
            )}
          </Box>
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
              // Enterrel vissza a fázis keresőjébe -- így zárul a
              // billentyűzetes ciklus: tétel -> fogszám -> következő tétel.
              // Üresen is visz, ha a dokinak ehhez a sorhoz nincs fogszáma.
              // Nem Tab (az a natív sorrendben a fogtérkép-gombra vinne) és
              // nem Escape (annak az appban "elvet" jelentése van).
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
                e.preventDefault();
                onFogKesz();
              }}
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
              id={mennyisegId(pi, li)}
              value={line.mennyiseg}
              penz={false}
              min={1}
              onCommit={(v) => onPatch({ mennyiseg: v })}
              onDraftChange={(v) => {
                const m = v ?? line.mennyiseg;
                setMennyisegDraft(m);
                onDraftOsszeg({ tenylegesEgysegar: arDraft, mennyiseg: m });
              }}
              onBlur={() => onDraftOsszeg(null)}
              textAlign="center"
              aria-label="Darabszám"
            />
          </Box>
          <IkonGomb
            type="button"
            variant="ghost"
            color="gray"
            size="1"
            cimke="Darabszám igazítása a fogakhoz – innentől a fogak számát követi"
            ariaLabel="Darabszám igazítása a fogakhoz"
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
          </IkonGomb>
        </Flex>
      </Table.Cell>

      <Table.Cell justify="end">
        <Flex align="center" gap="1" justify="end">
          <Text
            style={{ fontVariantNumeric: 'tabular-nums', color: t.uiTextFaint, whiteSpace: 'nowrap' }}
          >
            {/* Egyedi sornál, illetve a terv pénznemében beárazatlan tételnél
                nincs értelmezhető árlistai referenciaár -- lásd
                sorMezokEgyedibol / domain/penznemValtas.ts `nincsListaar()`.
                Sávos soron a TELJES sáv látszik: a doki így látja, meddig
                mozoghat az ajánlati árral eltérés-jelzés nélkül. */}
            {egyedi || araHianyzik
              ? '—'
              : line.savHatar
                ? formatPrice({ tipus: 'SAVOS', ...line.savHatar }, currency, nyelv)
                : formatMoney(line.listaEgysegar, currency, nyelv)}
          </Text>
          <IkonGomb
            type="button"
            variant="ghost"
            color="gray"
            size="1"
            cimke="Ár frissítése az árlistából"
            onClick={onRequestArFrissites}
            // A ⟳ mennyiség-visszakapcsoló (fent, Db cella) mintája: mindig a
            // DOM-ban marad, csak `visibility: hidden`-nel tűnik el, hogy a
            // cella szélessége ne ugráljon soronként.
            tabIndex={arFrissitesJavaslat ? 0 : -1}
            aria-hidden={arFrissitesJavaslat ? undefined : true}
            style={{ visibility: arFrissitesJavaslat ? 'visible' : 'hidden', color: t.warn }}
          >
            <UpdateIcon />
          </IkonGomb>
        </Flex>
      </Table.Cell>

      <Table.Cell justify="end">
        <Flex align="center" gap="1" justify="end" width="100%">
          <Box flexGrow="1">
            <NumberField
              id={arId(pi, li)}
              value={line.tenylegesEgysegar}
              penz
              unit={currency}
              min={0}
              onCommit={(v) =>
                // Egyedi sornál nincs "listaár" mező -- a `listaEgysegar` a
                // `tenylegesEgysegar`-ral együtt íródik, hogy sosem legyen
                // kedvezmény-/felár-jelvény egy nem létező referenciaárhoz
                // képest.
                onPatch(egyedi ? { tenylegesEgysegar: v, listaEgysegar: v } : { tenylegesEgysegar: v })
              }
              parseAlternativ={szazalekosAr}
              onDraftChange={(v) => {
                const a = v ?? line.tenylegesEgysegar;
                setArDraft(a);
                onDraftOsszeg({ tenylegesEgysegar: a, mennyiseg: mennyisegDraft });
              }}
              onBlur={() => onDraftOsszeg(null)}
              textAlign="right"
              // 62. tétel: beárazatlan tétel, még kézi ár nélkül -- a
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
          {/* A gomb magán (`IkonGomb`) NEM kap háttér/méret felülírást --
              így az egérrel fölé húzva ugyanaz a szürkés-kékes Radix
              hover-háttér jelenik meg, mint a sor többi ikon-gombján.
              A bekapcsolt állapot TELI, borostyán jelzését egy BELSŐ
              `span` hordozza, saját, a gomb Radix-méretezésétől független
              mérettel -- a korábbi halvány `warnBg` alig különbözött a
              fehér cellaháttértől, ráadásul a gombra írt inline háttér
              némította volna a hover-effektust is. */}
          <IkonGomb
            type="button"
            variant="ghost"
            color="gray"
            size="1"
            aria-pressed={line.savos}
            cimke={
              line.savos
                ? 'Becsült jelölés levétele — a nyomtatványról eltűnik a *'
                : 'Megjelölés becsült árként — a nyomtatványon * és lábjegyzet jelzi'
            }
            ariaLabel="Becsült ár"
            onClick={() => onPatch({ savos: !line.savos })}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 15,
                height: 15,
                marginLeft: 2,
                borderRadius: t.radius,
                color: line.savos ? '#FFFFFF' : t.uiTextFaint,
                background: line.savos ? t.warn : 'transparent',
              }}
            >
              ≈
            </span>
          </IkonGomb>
          {/* A Db cella ⟳ gombjának mintája (fentebb): MINDIG a DOM-ban,
              csak `visibility: hidden`-nel tűnik el -- egy feltételes
              render soronként ugráltatná a flexGrow-os NumberField
              szélességét. */}
          <IkonGomb
            type="button"
            variant="ghost"
            color="gray"
            size="1"
            cimke="Ajánlati ár visszaállítása a listaárra"
            onClick={() => onPatch({ tenylegesEgysegar: line.listaEgysegar })}
            tabIndex={arEltero ? 0 : -1}
            aria-hidden={arEltero ? undefined : true}
            style={{ visibility: arEltero ? 'visible' : 'hidden' }}
          >
            <ResetIcon />
          </IkonGomb>
        </Flex>
      </Table.Cell>

      {/* Önálló, keskeny cella a listaár<->ajánlati ár eltérés-jelvénynek --
          korábban a Beavatkozás-mező alatti jelvénysávban lakott, ott viszont
          egy megjelenő "+20%" új sorba tördelte a nevet, és soronként
          máshova tolta a táblát. Itt mindig ugyanaz a hely foglalt, jelvény
          nélkül is -- a Beavatkozás-oszlop (szélesség nélküli, a maradékot
          kapja) adja át érte a helyet. `justify="start"`: a jelvény az
          Ajánlati ár mezőhöz tapadjon, ne a cella közepén lebegjen. */}
      <Table.Cell justify="start">
        {elteres && (
          <Badge color={elteres.tipus === 'kedvezmeny' ? 'green' : 'amber'} variant="soft" size="1">
            {elteres.cimke}
          </Badge>
        )}
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
        <Flex gap="1" align="center">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              {/* A sor pozíciója az azonosító, nem a neve: két azonos tétel
                  egy fázisban ugyanazt a nevet viselné. */}
              <IkonGomb
                id={sorMenuId(pi, li)}
                type="button"
                variant="ghost"
                color="gray"
                size="1"
                cimke="További műveletek — sor mozgatása"
                ariaLabel={`${li + 1}. sor — további műveletek`}
              >
                <DotsHorizontalIcon />
              </IkonGomb>
            </DropdownMenu.Trigger>
            {/* onCloseAutoFocus: mozgatás után a `fokuszCel` viszi a fókuszt a
                mozgatott sor `⋯` gombjára -- a menü záráskori
                fókusz-visszavétele ezt halászná el. */}
            <DropdownMenu.Content size="1" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DropdownMenu.Item disabled={!canMoveUp} onSelect={onMoveUp}>
                Feljebb
              </DropdownMenu.Item>
              <DropdownMenu.Item disabled={!canMoveDown} onSelect={onMoveDown}>
                Lejjebb
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
          <IkonGomb
            type="button"
            cimke="Sor törlése"
            variant="ghost"
            color="gray"
            size="1"
            onClick={onRemove}
          >
            <TrashIcon />
          </IkonGomb>
        </Flex>
      </Table.Cell>
    </Table.Row>
    {leirasNyitva && (
      <Table.Row>
        <Table.Cell colSpan={8}>
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
                <IkonGomb
                  type="button"
                  variant="ghost"
                  color="gray"
                  size="1"
                  cimke="Leírás visszaállítása az árlistaira"
                  onClick={() =>
                    // backlog-65, 7. döntés: lásd a névmező reset
                    // kommentjét fentebb.
                    onPatch({ leirasSnapshot: arlistaLeirasSzoveg, leirasNyelv: null })
                  }
                >
                  <ResetIcon />
                </IkonGomb>
              </Flex>
            )}
            {leirasNyelvMismatch && (
              <Flex align="center" gap="1">
                <Badge color="amber" variant="soft" size="1">
                  {line.leirasNyelv?.authoredInLanguage === 'de' ? 'DE szöveg' : 'HU szöveg'}
                </Badge>
                <IkonGomb
                  type="button"
                  variant="ghost"
                  color="gray"
                  size="1"
                  cimke="Nyelv ellenőrizve — a szöveg megfelel ezen a nyelven"
                  ariaLabel="Nyelv ellenőrizve"
                  onClick={() => onPatch({ leirasNyelv: reviewElfogadva(line.leirasNyelv, nyelv) })}
                >
                  <CheckIcon />
                </IkonGomb>
              </Flex>
            )}
          </Flex>
        </Table.Cell>
      </Table.Row>
    )}
    </>
  );
}
