// Árlista admin -- portolva ui/PriceListAdmin.jsx-ből.
//
// Egy tábla, két ár oszlop -- nem külön magyar és német nézet. Így egy
// pillantás megmutatja, hol hiányzik az EUR ár, és a "Nincs EUR ár" szűrő
// maga a német bevezetés munkalistája.
//
// A sor kinyitása adja a teljes szerkesztést, benne a kategória
// legördülővel -- ez a takarítás fő eszköze. A tétel-táblázat fölötti "Kategóriák"
// panel (docs/03-funkcionalis-spec.md § Kategóriák panel) adja a másik
// felet: kategória létrehozás/átnevezés/színezés/sorrendezés/törlés, egy
// helyen a tétel-mozgatással, hogy a doki ne navigáljon oda-vissza a
// takarításkor.

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertDialog,
  Box,
  Button,
  Callout,
  Checkbox,
  Flex,
  Grid,
  Heading,
  IconButton,
  RadioCards,
  SegmentedControl,
  Select,
  Separator,
  Table,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Cross2Icon,
  EyeClosedIcon,
  EyeOpenIcon,
  InfoCircledIcon,
  StarFilledIcon,
  StarIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { Field, FieldGroup } from '../components/Field';
import NumberField from '../components/NumberField';
import DiscardChangesDialog, { useDiscardGuard } from '../components/DiscardChangesDialog';
import { useNavGuard } from '../components/NavGuardContext';
import { useDirtyDraft } from '../components/useDirtyDraft';
import { t } from '../design/tokens';
import { csokkentettMozgas } from '../design/motion';
import { ALAP_KATEGORIA_SZIN, KATEGORIA_PALETTA } from '../design/treatmentVisuals';
import { todayIso } from '../domain/date';
import { leirasTulHosszu } from '../domain/leirasHossz';
import { formatPrice, savosHatarForditott } from '../domain/money';
import { nextKategoriaId, nextTetelId } from '../domain/priceListIds';
import { nevEgyezik, norm } from '../domain/search';
import { alkalmazTomegesArat, type TomegesArParams } from '../domain/tomegesAr';
import type { Ar, Kategoria, PriceList, Tetel } from '../domain/types';
import TomegesArDialog from './priceListAdmin/TomegesArDialog';
import UjTetelDialog from './priceListAdmin/UjTetelDialog';
import { useAppState } from '../state/AppState';

type FilterKey = 'all' | 'noeur' | 'range' | 'off' | 'fav';

const FILTERS: Array<[FilterKey, string]> = [
  ['all', 'Mind'],
  ['noeur', 'Nincs EUR ár'],
  ['range', 'Sávos ár'],
  ['off', 'Inaktív'],
  ['fav', 'Gyakori'],
];

/**
 * `TextField.Root`, ami minden leütésre ment (a mai viselkedés
 * változatlan), de a `NumberField` mintájára egy lokális `draft`-ból
 * jelenít meg, nem közvetlenül a `value` propból, amíg fókuszban van.
 *
 * D31 óta a `priceList` context-érték a mentés ELŐTT, szinkron frissül
 * (`AppState.tsx` `savePriceList` -- optimista `apply*`), tehát a korábbi
 * async kör-forduló, ami ezt a mezőt visszaugratta volna a régi értékre,
 * megszűnt. A `draft` mégis marad: bármely MÁSIK mező/tétel commitja új
 * `priceList`/`item` objektum-identitást ad ennek a mezőnek is gépelés
 * közben, és fókuszban a `draft` ettől függetlenül mindig a ténylegesen
 * begépelt szöveget mutatja, nem a props újraszámolt (tartalmilag
 * ugyanolyan, de más referenciájú) értékét.
 */
function BufferedTextField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  return (
    <TextField.Root
      value={draft}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(e.target.value);
      }}
    />
  );
}

/** `BufferedTextField` többsoros párja -- a tétel-leírás mezőkhöz (docs/02-domain-modell.md § Tétel-leírás). Ugyanaz a draft/focused minta, lásd fent. */
function BufferedTextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  return (
    <TextArea
      value={draft}
      placeholder={placeholder}
      rows={3}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(e.target.value);
      }}
    />
  );
}

export default function PriceListAdminPage() {
  const { priceList, savePriceList } = useAppState();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [catPanelOpen, setCatPanelOpen] = useState(false);
  const [ujTetelOpen, setUjTetelOpen] = useState(false);
  const [tomegesArOpen, setTomegesArOpen] = useState(false);
  // Az imént mentett tétel id-je -- egyszer használatos jelző, ami a lentebbi
  // effektnek szól (odagörget, majd nullázza magát). Az ItemEditor ebből dönti
  // el, hogy a HUF ár mezőt `autoFocus`-szal kell-e felvennie: a doki a
  // popupban csak nevet és kategóriát adott meg, a logikus következő lépés az
  // ár -- lásd a fájl tetején a panasz leírását.
  const [frissTetelId, setFrissTetelId] = useState<string | null>(null);
  // Az imént mentett, MÉG SOHA nem aktivált tétel id-je -- a `frissTetelId`-
  // vel egyszerre áll be, de attól függetlenül él tovább: a `frissTetelId` a
  // görgető effektben AZONNAL nullázódik, ez viszont a HUF ár mező tényleges
  // első commitjáig kell éljen (lásd `handleFirstPriceCommit`). Nincs hozzá
  // `Tetel`-séma mező -- ha a doki a sort a HUF ár commitja előtt bezárja
  // vagy elnavigál, ez a state is elvész (lásd a lentebbi effektet), és a
  // tétel egyszerűen rendes inaktív tétellé válik.
  const [pendingActivationId, setPendingActivationId] = useState<string | null>(null);
  // A 0 Ft-on maradó első árcommit megerősítő dialógusa, illetve az aktív
  // tétel deaktiválásának megerősítő dialógusa -- két külön jelző, mert a
  // két dialógus szövege/hatása eltér, és egyszerre legfeljebb az egyik
  // lehet nyitva.
  const [zeroConfirmId, setZeroConfirmId] = useState<string | null>(null);
  const [deactivateConfirmId, setDeactivateConfirmId] = useState<string | null>(null);
  // Kategóriaváltáskor a nyitott sor a táblázat egy másik (esetleg messze
  // görgetett) pontjára ugrik -- enélkül a doki keze alól "eltűnik" a
  // szerkesztett tétel. Külön state a `frissTetelId`-től: az az ÚJ tétel
  // HUF ár mezőjének is fókuszt ad (`autoFocusAr`), ami itt nem kívánt --
  // egy kategóriaváltás a Select-en belül marad, nem szabad elrabolnia a
  // fókuszt onnan.
  const [atmozgatottTetelId, setAtmozgatottTetelId] = useState<string | null>(null);
  // P0-8-hoz hasonlóan (SettingsPage) -- a `savePriceList` korábban `void`-olva
  // volt, egy sikertelen mentés (pl. kvótahiba) némán elveszett.
  const [saveError, setSaveError] = useState<string | null>(null);

  /**
   * D30: minden TÉNYLEGES tartalmi változás a mai napra bélyegzi a
   * `modositva`/`arlistaVerzio`-t, feltétel nélkül -- a lábléc "melyik
   * árlistából készült" audit-ígérete addig hazudik, amíg az
   * `arlistaVerzio` a seed-értéken fagyva marad. A `recept` a MENTÉS
   * PILLANATÁBAN, a friss `prev`-re fut (D31, `AppState.tsx` `savePriceList`
   * updater-szerződése) -- ha mégis változatlanul adja vissza a bemenetet,
   * az nem "mentés": nincs mit bélyegezni. A visszaadott `boolean` a
   * `KategoriaPanelBody` Mentés gombjának kell -- csak sikeres írás után
   * állítja vissza a draftot mentett állapotúra, a szerkesztett elem
   * elhagyása előtti megerősítés mintáján (`components/useDirtyDraft.ts`).
   */
  function commit(recept: (prev: PriceList) => PriceList): Promise<boolean> {
    const ma = todayIso();
    return savePriceList((prev) => {
      const next = recept(prev);
      return next === prev ? prev : { ...next, modositva: ma, arlistaVerzio: ma };
    })
      .then(() => {
        setSaveError(null);
        return true;
      })
      .catch((err: unknown) => {
        setSaveError(err instanceof Error ? err.message : 'A mentés váratlanul meghiúsult.');
        return false;
      });
  }

  function patchItem(id: string, patch: Partial<Tetel> | ((prev: Tetel) => Partial<Tetel>)) {
    const prevItem = priceList.tetelek.find((x) => x.id === id);
    commit((prev) => ({
      ...prev,
      tetelek: prev.tetelek.map((x) =>
        x.id === id ? { ...x, ...(typeof patch === 'function' ? patch(x) : patch) } : x,
      ),
    }));
    if (prevItem) {
      const resolved = typeof patch === 'function' ? patch(prevItem) : patch;
      if (resolved.kategoriaId !== undefined && resolved.kategoriaId !== prevItem.kategoriaId) {
        setAtmozgatottTetelId(id);
      }
    }
  }

  const sortedKategoriak = useMemo(
    () => priceList.kategoriak.slice().sort((a, b) => a.sorrend - b.sorrend),
    [priceList.kategoriak],
  );

  // A kategória létrehozása/törlése marad azonnali (identitás-változtató
  // művelet -- új id-foglalás, végleges törlés --, amit egy Mégse nem tud
  // értelmesen visszavonni). Az attribútum-szerkesztés (név/szín/sorrend)
  // ezzel szemben pufferelt draftban él, lásd `KategoriaPanelBody`
  // `saveCategoriesDraft`-ot hívó Mentés gombja.

  /**
   * A `commit`-nek átadott recept a friss `prev`-re fut, tehát az id- és
   * sorrend-számítás is ide kerül -- D17 (soha nem újrahasznosított id):
   * két gyors egymás utáni kattintás enélkül ugyanazt az id-t számolná ki
   * egymástól függetlenül. A létrehozott kategória egy külső `let`-en át
   * jut vissza a hívóhoz -- a `commit` a receptet SZINKRON, még a
   * visszatérése előtt lefuttatja (D31), tehát ez itt lent már biztosan ki
   * van töltve. A hívó (`KategoriaPanelBody` `handleAdd`) a visszaadott
   * kategóriát a draft végére fűzi, hogy a folyamatban lévő szerkesztés ne
   * vesszen el.
   */
  function addCategory(): Kategoria {
    let created: Kategoria | undefined;
    commit((prev) => {
      const id = nextKategoriaId(prev.kategoriak);
      const maxSorrend = prev.kategoriak.reduce((max, k) => Math.max(max, k.sorrend), 0);
      const newCategory: Kategoria = {
        id,
        nev: { hu: 'Új kategória', de: null },
        sorrend: maxSorrend + 1,
        szin: ALAP_KATEGORIA_SZIN,
      };
      created = newCategory;
      return { ...prev, kategoriak: [...prev.kategoriak, newCategory] };
    });
    return created!;
  }

  /**
   * Csak akkor törölhető, ha SEM aktív, SEM inaktív tétel nem hivatkozik rá
   * (8. döntés) -- egy `aktiv: false` tétel bármikor visszakapcsolható az
   * "Aktív" szem ikonnal, tehát egy csak aktív tételek alapján "üresnek"
   * ítélt kategória valójában nem az. Valódi törlés (nincs `aktiv` mező a
   * `Kategoria` típuson) -- semmi más nem hivatkozik rá tartalmilag.
   */
  function deleteCategory(id: string) {
    commit((prev) => ({ ...prev, kategoriak: prev.kategoriak.filter((k) => k.id !== id) }));
  }

  /**
   * A Kategóriák panel pufferelt draftjának Mentés gombja hívja -- a `next`
   * MÁR 1..n-re újraszámozott sorrenddel érkezik (`KategoriaPanelBody`
   * `handleSave`), ez a tömbsorrend adja a fogszín-ütközés precedenciáját
   * is (lásd `docs/07-felulet-rendszer.md` § Szín, forma, sűrűség és
   * `domain/toothVisual.ts` `resolveToothVisual`). A `prev.
   * kategoriak` TAGSÁGA dönt, nem a `next` -- egy időközben törölt
   * kategória így nem támad fel, egy időközben létrejött pedig nem esik
   * ki, mert az azonnali `addCategory`/`deleteCategory` a draftot is
   * frissíti, tehát `next` a mentés pillanatában már tartalmazza őket.
   */
  function saveCategoriesDraft(next: Kategoria[]): Promise<boolean> {
    const byId = new Map(next.map((k) => [k.id, k]));
    return commit((prev) => ({
      ...prev,
      kategoriak: prev.kategoriak.map((k) => byId.get(k.id) ?? k),
    }));
  }

  /**
   * A felugró Új tétel dialógus Mentés gombja hívja -- addig semmi nem
   * kerül a törzsadatba. `sorrend` a kategóriákéhoz hasonlóan max-alapú, nem
   * `tetelek.length`-alapú (a régi számítás egy törölt/inaktivált tétel
   * után visszacsúszhatott volna, ugyanaz a hiba, amit D17 miatt a
   * `nextTetelId` már elkerül). Az id-számítás a friss `prev`-ből, a
   * `newId`-n át visszakapva -- lásd `addCategory` kommentjét.
   */
  function mentUjTetel(nevHu: string, nevDe: string | null, kategoriaId: string) {
    let newId = '';
    commit((prev) => {
      const id = nextTetelId(prev.tetelek);
      const maxSorrend = prev.tetelek.reduce((max, x) => Math.max(max, x.sorrend), 0);
      const newItem: Tetel = {
        id,
        kategoriaId,
        sorrend: maxSorrend + 1,
        // Kezdetben inaktív -- egy félkész, kategorizálatlan/0 Ft-os
        // gondolattal felvitt tétel ne legyen azonnal választható a
        // tervezőben. A HUF ár mező első commitja aktiválja (lásd
        // `handleFirstPriceCommit`), nem ez a mentés.
        aktiv: false,
        gyakori: false,
        nev: { hu: nevHu, de: nevDe },
        ar: { HUF: { tipus: 'FIX', ertek: 0 }, EUR: null },
        leiras: { hu: '', de: null },
        csomag: false,
      };
      newId = id;
      return { ...prev, tetelek: [...prev.tetelek, newItem] };
    });
    setFilter('all');
    setQ('');
    setUjTetelOpen(false);
    // A sor kinyitása/autoFocus-a KÜLÖN mikrotaszkban -- D31 óta a `priceList`
    // (a fenti `commit`) szinkron frissül, tehát ha `open`/`frissTetelId`
    // is EBBEN a renderben állna be, a friss sor `autoFocus` NumberField-je
    // ugyanabban a commitban mountolna, amiben a Dialog `open=false`-ra
    // vált -- a Radix Dialog FocusScope-ja (még aktív, amíg a Presence le
    // nem bontja) elkapná és a body-ra dobná a fókuszkérést. Egy renderrel
    // később, a Dialog tényleges bezárása UTÁN, ez a verseny már nem áll fenn.
    queueMicrotask(() => {
      setOpen(newId);
      setFrissTetelId(newId);
      setPendingActivationId(newId);
    });
  }

  /**
   * A HUF ár mező (fix ár) ELSŐ commitja egy még soha nem aktivált tételen:
   * >0 érték némán, azonnal aktivál -- ez a doki természetes, egylépéses
   * útja egy valódi ártétel felviteléhez. 0 esetén megerősítést kér, mert
   * egy 0 Ft-os aktív tétel csendben megjelenne a tervező keresőjében. A
   * `pendingActivationId` már ITT nullázódik, függetlenül a kimeneteltől --
   * a mező egy KÖVETKEZŐ szerkesztése (akár 0-n maradva) onnantól rendes
   * árcommitnak számít, nem old ki újra dialógust.
   */
  function handleFirstPriceCommit(id: string, ertek: number) {
    setPendingActivationId((cur) => (cur === id ? null : cur));
    patchItem(id, (prev) => ({ ar: { ...prev.ar, HUF: { tipus: 'FIX', ertek } } }));
    if (ertek > 0) {
      patchItem(id, { aktiv: true });
    } else {
      setZeroConfirmId(id);
    }
  }

  // Mentés után a lista a friss sorhoz görget -- a doki a popupban csak
  // nevet és kategóriát adott meg, e nélkül a sor a lista tetszőleges
  // pontján nyílna ki, láthatatlanul (ugyanaz a panasz, ami miatt ez az
  // egész felugró ablak létrejött). A HUF ár mező fókuszát az ItemEditor
  // natív `autoFocus` attribútuma adja (lásd ott).
  //
  // D31 óta a `commit()` a `priceList` context-értéket SZINKRON frissíti
  // (`AppState.tsx` `savePriceList` -- optimista `apply*`, a
  // `storage.savePriceList` await-je csak ez UTÁN fut), tehát a friss sor
  // már ugyanabban a renderben megjelenik a `grouped`-ben, mint amiben a
  // `setFrissTetelId(id)` hívódott. A `!el` őr mégis marad -- olcsó védelem
  // arra az esetre, ha egy jövőbeli szűrő/keresés éppen kirekesztené a friss
  // sort, és a `priceList` a függőséglistában így is csak a ténylegesen
  // megtalált sornál nullázza a jelzőt.
  useEffect(() => {
    if (!frissTetelId) return;
    const el = document.getElementById(`tetel-szerkeszto-${frissTetelId}`);
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    setFrissTetelId(null);
  }, [frissTetelId, priceList]);

  // Ugyanaz a görgetés, mint fent, de kategóriaváltáskor -- a nyitott sor
  // ilyenkor a `grouped` egy másik szakaszába kerül, `autoFocusAr` nélkül
  // (lásd `atmozgatottTetelId` deklarációját).
  useEffect(() => {
    if (!atmozgatottTetelId) return;
    const el = document.getElementById(`tetel-szerkeszto-${atmozgatottTetelId}`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: csokkentettMozgas() ? 'auto' : 'smooth' });
    setAtmozgatottTetelId(null);
  }, [atmozgatottTetelId, priceList]);

  // A "még soha nem aktivált" állapot elmúlik, amint a sor bezárul vagy egy
  // másik sor nyílik ki -- a doki elhagyta a HUF ár mezőt a commit előtt,
  // a tétel innentől rendes inaktív tétel (nincs séma-mező, lásd
  // `pendingActivationId` deklarációját).
  useEffect(() => {
    if (pendingActivationId && open !== pendingActivationId) {
      setPendingActivationId(null);
    }
  }, [open, pendingActivationId]);

  // Mindkét nyelven keres, ugyanaz a szabály, mint a szerkesztő
  // tétel-keresőjében (backlog-7): egy csak németül elgépelt/elnevezett
  // tétel eddig itt egyáltalán nem volt megtalálható. Külön a `keep()`-től
  // (lásd lent) -- a Tömeges árváltoztatás dialógus "jelenlegi szűrt lista"
  // köre EZT a predikátumot használja, a nyitott sor kivétele NÉLKÜL: az a
  // kivétel a szerkesztés közbeni eltűnés ellen véd, egy tömeges művelet
  // körét viszont hamisan tágítaná (backlog-92).
  const illeszkedik = (x: Tetel): boolean => {
    if (q && !nevEgyezik(x.nev, norm(q))) return false;
    if (filter === 'noeur') return !x.ar.EUR;
    if (filter === 'range') return x.ar.HUF?.tipus === 'SAVOS' || x.ar.EUR?.tipus === 'SAVOS';
    if (filter === 'off') return !x.aktiv;
    if (filter === 'fav') return x.gyakori;
    return true;
  };

  const keep = (x: Tetel): boolean => {
    // P0-7: a nyitott sort MINDIG megtartjuk, akkor is, ha egy időközbeni
    // szerkesztés (pl. az első EUR-számjegy begépelése a "Nincs EUR ár"
    // szűrő alatt) kiejtené a szűrőből -- enélkül a sor (és vele az
    // ItemEditor) eltűnt a doki keze alól, mielőtt végigírta volna a
    // számot. A blur-re commitáló NumberField (lásd lent) már önmagában is
    // sokat segít, de ez a védelem a commit UTÁNI állapotra is vonatkozik.
    if (x.id === open) return true;
    return illeszkedik(x);
  };

  const grouped = useMemo(() => {
    return priceList.kategoriak
      .slice()
      .sort((a, b) => a.sorrend - b.sorrend)
      .map((k) => ({
        cat: k,
        items: priceList.tetelek.filter((x) => x.kategoriaId === k.id && keep(x)),
      }))
      .filter((g) => g.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceList, q, filter, open]);

  const missingEur = priceList.tetelek.filter((x) => !x.ar.EUR).length;
  const shown = grouped.reduce((s, g) => s + g.items.length, 0);

  // `null`, ha nincs aktív keresés/szűrő -- ilyenkor a Tömeges árváltoztatás
  // dialógus "jelenlegi szűrt lista" köre szó szerint azonos lenne a "Teljes
  // árlista" körrel, ezért az az opció ott nem is jelenik meg (backlog-92,
  // 2. döntés).
  const szurtAktiv = q.trim() !== '' || filter !== 'all';
  const szurtTetelek = useMemo(
    () => (szurtAktiv ? priceList.tetelek.filter(illeszkedik) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [priceList, q, filter, szurtAktiv],
  );

  function applyTomegesAr(idk: Set<string>, params: TomegesArParams): Promise<boolean> {
    return commit((prev) => ({ ...prev, tetelek: alkalmazTomegesArat(prev.tetelek, idk, params) }));
  }

  return (
    <Box style={{ maxWidth: 940, margin: '0 auto' }}>
      <Flex justify="between" align="baseline" mb="4">
        <Heading size="5" style={{ color: t.brand }}>
          Kezelések és árak
        </Heading>
        <Text size="2" color="gray" style={{ fontFamily: t.mono }}>
          verzió {priceList.arlistaVerzio}
        </Text>
      </Flex>

      {/* `align="start"`: a Kategóriák panel kinyílva jóval magasabb lesz
          (lásd a teljes kategória-táblázatot), a gomb a triggerrel egy
          magasságban marad, nem csúszik le a panel aljára. */}
      <Flex justify="between" align="start">
        <KategoriaPanel
          open={catPanelOpen}
          onOpenChange={setCatPanelOpen}
          kategoriak={sortedKategoriak}
          tetelek={priceList.tetelek}
          onAdd={addCategory}
          onDelete={deleteCategory}
          onSave={saveCategoriesDraft}
        />
        <Flex gap="2">
          <Button variant="soft" color="gray" onClick={() => setTomegesArOpen(true)}>
            Tömeges árváltoztatás
          </Button>
          <Button onClick={() => setUjTetelOpen(true)}>+ Új tétel</Button>
        </Flex>
      </Flex>

      <UjTetelDialog
        open={ujTetelOpen}
        onOpenChange={setUjTetelOpen}
        kategoriak={sortedKategoriak}
        tetelek={priceList.tetelek}
        onSave={mentUjTetel}
      />

      <TomegesArDialog
        open={tomegesArOpen}
        onOpenChange={setTomegesArOpen}
        kategoriak={sortedKategoriak}
        tetelek={priceList.tetelek}
        szurtTetelek={szurtTetelek}
        onApply={applyTomegesAr}
      />

      <TextField.Root
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Keresés a tételek között…"
        aria-label="Keresés a tételek között"
        mb="3"
      />

      <SegmentedControl.Root
        value={filter}
        onValueChange={(v) => setFilter(v as FilterKey)}
        size="1"
        mb="4"
      >
        {FILTERS.map(([k, label]) => (
          <SegmentedControl.Item key={k} value={k}>
            {label}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl.Root>

      {saveError && (
        <Callout.Root color="red" mb="4">
          <Callout.Text>A mentés nem sikerült: {saveError}</Callout.Text>
        </Callout.Root>
      )}

      {grouped.length === 0 ? (
        <Callout.Root color="gray" mb="4">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            {q.trim()
              ? `Nincs találat erre: „${q}”. Próbálj más névre keresni, vagy válts szűrőt.`
              : 'Ebben a szűrőben nincs tétel. Válts szűrőt, vagy add hozzá az elsőt a „+ Új tétel” gombbal.'}
          </Callout.Text>
        </Callout.Root>
      ) : (
        <Table.Root size="1" mb="4">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell width="32px" />
              <Table.ColumnHeaderCell>Megnevezés</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell justify="end">Ár (HUF)</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell justify="end">Ár (EUR)</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="34px" />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {grouped.map(({ cat, items }) => (
              <Fragment key={cat.id}>
                <Table.Row>
                  <Table.Cell colSpan={5} pt="4">
                    <Flex justify="between" align="baseline">
                      <Text size="2" weight="bold" style={{ color: t.brand }}>
                        {cat.nev.hu}
                      </Text>
                      <Text size="1" color="gray">
                        {items.length} tétel
                      </Text>
                    </Flex>
                  </Table.Cell>
                </Table.Row>

                {items.map((it) => (
                  <Fragment key={it.id}>
                    <Table.Row
                      style={{ cursor: 'pointer', opacity: it.aktiv ? 1 : 0.5 }}
                      onClick={() => setOpen(open === it.id ? null : it.id)}
                    >
                      <Table.Cell>
                        <IconButton
                          aria-label="Gyakori tétel"
                          variant="ghost"
                          color="gray"
                          size="1"
                          onClick={(e) => {
                            e.stopPropagation();
                            patchItem(it.id, (prev) => ({ gyakori: !prev.gyakori }));
                          }}
                          style={{ color: it.gyakori ? t.warn : t.uiTextFaint }}
                        >
                          {it.gyakori ? <StarFilledIcon /> : <StarIcon />}
                        </IconButton>
                      </Table.Cell>

                      {/* Billentyűzettel is elérhető megnyitó -- a sor
                          egészének onClick-je csak egérrel volt elérhető,
                          Tab-bal nem lehetett a szerkesztőt megnyitni. Ez a
                          cella a "sor fejléce" (RowHeaderCell), ezért ez
                          kapja a trigger szerepet, nem a teljes sor -- így a
                          csillag/aktív gombok maradnak a natív, egymástól
                          független Tab-megállók. */}
                      <Table.RowHeaderCell
                        role="button"
                        tabIndex={0}
                        aria-expanded={open === it.id}
                        aria-controls={`tetel-szerkeszto-${it.id}`}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ' ') return;
                          e.preventDefault();
                          setOpen(open === it.id ? null : it.id);
                        }}
                        style={{
                          maxWidth: 320,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
                      >
                        {it.nev.hu}
                        {it.ar.HUF?.tipus === 'SAVOS' && (
                          <Text size="1" ml="2" style={{ color: t.warn }}>
                            sávos
                          </Text>
                        )}
                        {!it.nev.de && (
                          <Text size="1" ml="2" color="gray">
                            nincs DE név
                          </Text>
                        )}
                      </Table.RowHeaderCell>

                      <Table.Cell justify="end" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {/* Az admin törzsadat-felület, nincs dokumentumnyelv (nincs `Plan`
                            a scope-ban) -- fixen 'hu', ahogy a NavBar/oldalak prózája is. */}
                        {formatPrice(it.ar.HUF, 'HUF', 'hu')}
                      </Table.Cell>

                      <Table.Cell
                        justify="end"
                        style={{
                          fontVariantNumeric: 'tabular-nums',
                          color: it.ar.EUR ? undefined : t.warn,
                        }}
                      >
                        {it.ar.EUR ? formatPrice(it.ar.EUR, 'EUR', 'hu') : '—'}
                      </Table.Cell>

                      <Table.Cell>
                        <IconButton
                          aria-label="Aktív"
                          variant="ghost"
                          color="gray"
                          size="1"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Deaktiválás megerősítést kér, mert visszamenőleg
                            // érinti, hogy a tétel a jövőben választható-e a
                            // tervezőben -- reaktiválás marad azonnali.
                            if (it.aktiv) {
                              setDeactivateConfirmId(it.id);
                            } else {
                              patchItem(it.id, { aktiv: true });
                            }
                          }}
                        >
                          {it.aktiv ? <EyeOpenIcon /> : <EyeClosedIcon />}
                        </IconButton>
                      </Table.Cell>
                    </Table.Row>

                    {open === it.id && (
                      <Table.Row id={`tetel-szerkeszto-${it.id}`}>
                        <Table.Cell colSpan={5} style={{ background: t.surfaceAlt }}>
                          <ItemEditor
                            item={it}
                            categories={sortedKategoriak}
                            onPatch={(p) => patchItem(it.id, p)}
                            autoFocusAr={it.id === frissTetelId}
                            pendingActivation={it.id === pendingActivationId}
                            onFirstPriceCommit={(ertek) => handleFirstPriceCommit(it.id, ertek)}
                          />
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      <Separator size="4" />
      <Flex justify="between" align="center" mt="3">
        <Text size="2" color="gray">
          {shown} / {priceList.tetelek.length} tétel látszik · {missingEur} tételnél hiányzik az
          EUR ár
        </Text>
        <Button onClick={() => setUjTetelOpen(true)}>+ Új tétel</Button>
      </Flex>

      {/* A HUF ár mező 0-n maradó első commitja explicit megerősítést kér,
          mielőtt a tétel a tervezőben választhatóvá válna. */}
      <AlertDialog.Root open={zeroConfirmId !== null} onOpenChange={(o) => !o && setZeroConfirmId(null)}>
        <AlertDialog.Content maxWidth="440px">
          <AlertDialog.Title>Tétel aktiválása 0 Ft-tal?</AlertDialog.Title>
          <AlertDialog.Description size="2">
            A HUF ár 0 maradt. Ha ez szándékos (pl. az ár később derül ki), a tétel 0 Ft-tal is
            aktiválható -- innentől választható lesz a tervezőben.
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Mégse, marad inaktív
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                onClick={() => {
                  if (zeroConfirmId) patchItem(zeroConfirmId, { aktiv: true });
                  setZeroConfirmId(null);
                }}
              >
                Aktiválás
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      {/* A deaktiválás megerősítést kér -- visszamenőleg érinti, hogy a
          tétel a jövőben választható-e a tervezőben. A reaktiválás (a fenti
          szem-ikon `else` ága) marad azonnali. */}
      <AlertDialog.Root
        open={deactivateConfirmId !== null}
        onOpenChange={(o) => !o && setDeactivateConfirmId(null)}
      >
        <AlertDialog.Content maxWidth="440px">
          <AlertDialog.Title>Tétel inaktiválása</AlertDialog.Title>
          <AlertDialog.Description size="2">
            „{priceList.tetelek.find((x) => x.id === deactivateConfirmId)?.nev.hu ?? ''}” inaktiválása
            után a tétel nem lesz választható a tervezőben -- bármikor visszakapcsolható.
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Mégse
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                color="red"
                onClick={() => {
                  if (deactivateConfirmId) patchItem(deactivateConfirmId, { aktiv: false });
                  setDeactivateConfirmId(null);
                }}
              >
                Inaktiválás
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}

/** Kinyitott sor -- itt van minden mező, köztük a kategória-mozgatás. */
function ItemEditor({
  item,
  categories,
  onPatch,
  autoFocusAr,
  pendingActivation,
  onFirstPriceCommit,
}: {
  item: Tetel;
  categories: Kategoria[];
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

  // A `NumberField` csak akkor hívja az `onCommit`-ot, ha az érték
  // ténylegesen VÁLTOZOTT (lásd `components/NumberField.tsx` `commit()`) --
  // egy friss (0 Ft-tal induló) tételen a mezőt érintetlenül hagyva és
  // elhagyva emiatt SOHA nem fut le `setFixPrice`. Ez a ref jelzi, hogy az
  // "első interakció" (akár értékváltozással, akár anélkül) már lezajlott
  // -- `handleHufBlur` ezt a hiányzó esetet pótolja a mező saját `onBlur`-
  // jával, ami MINDIG lefut, a commit lefutásától függetlenül.
  const firstInteractionHandledRef = useRef(false);

  /**
   * P0-2 (D15): eddig csak a HUF-ot váltotta -- az EUR ár szerkezetileg
   * mindig FIX maradt, tehát egy sávos tétel német (EUR) ajánlatán a doki
   * tudta nélkül eltűnt a `*` jelölés és a sávos lábjegyzet. Mostantól a
   * két pénznem együtt vált, hogy a szerkezetük soha ne csússzon szét. Ha a
   * tételnek nincs EUR ára (`eurAr == null`), az marad -- a váltás nem hoz
   * létre új EUR árat a semmiből.
   *
   * D31: az `ar` objektumot a friss `prev`-ből építi, nem a renderelt
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
            value={item.nev.hu}
            onChange={(v) => onPatch((prev) => ({ nev: { ...prev.nev, hu: v } }))}
          />
        </Field>
        <Field label="Bezeichnung (német)">
          <BufferedTextField
            value={item.nev.de || ''}
            placeholder="még nincs megadva"
            onChange={(v) => onPatch((prev) => ({ nev: { ...prev.nev, de: v || null } }))}
          />
        </Field>
      </Grid>

      <Grid columns="2" gap="3" mb="3">
        <Field label="Leírás (mi van benne?)">
          <BufferedTextArea
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
            <Field label="HUF ár — tól">
              <NumberField value={hufAr.min} min={0} onCommit={(v) => setSavosPrice({ min: v })} />
            </Field>
            <Field label="HUF ár — ig">
              <NumberField value={hufAr.max} min={0} onCommit={(v) => setSavosPrice({ max: v })} />
            </Field>
            {savosHatarForditott(hufAr) && (
              <Text as="div" size="1" mt="1" style={{ color: t.warn, gridColumn: '1 / -1' }}>
                A „tól" nagyobb, mint az „ig" — fordított sáv, ellenőrizd.
              </Text>
            )}
          </>
        ) : (
          <Field label="HUF ár">
            <NumberField
              value={hufAr?.tipus === 'FIX' ? hufAr.ertek : 0}
              min={0}
              onCommit={setFixPrice}
              onBlur={pendingActivation ? handleFixPriceBlur : undefined}
              autoFocus={autoFocusAr}
            />
          </Field>
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
            <Field label="EUR ár — tól (€)">
              <NumberField
                value={eurAr.min}
                unit="EUR"
                min={0}
                onCommit={(v) => setEurSavos({ min: v })}
              />
            </Field>
            <Field label="EUR ár — ig (€)">
              <NumberField
                value={eurAr.max}
                unit="EUR"
                min={0}
                onCommit={(v) => setEurSavos({ max: v })}
              />
            </Field>
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
                  value={eurAr.tipus === 'FIX' ? eurAr.ertek : 0}
                  unit="EUR"
                  min={0}
                  onCommit={setEurFix}
                />
              </Field>
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

/**
 * Kategória-karbantartó -- alapból csukott, összecsukható panel a
 * tétel-táblázat FÖLÖTT (docs/03-funkcionalis-spec.md § Kategóriák panel),
 * a `ToothChartPanel.tsx` mintáját követve (feltételes render,
 * `aria-expanded`/`aria-controls`, nincs nyitás/csukás-animáció). Csak
 * ennek a külső rétegnek van a becsukásig élő `dirty`-je (a
 * `KategoriaPanelBody` a draftot tartó belső réteg, ami nyitva léttől
 * mountolt) -- a `SettingsPage.tsx`/`Tabs.Content` mintáját követi: a
 * becsukás ténylegesen unmountolja a draftot, ezért kér a becsukás
 * megerősítést, ugyanúgy, mint egy explicit Mégse.
 */
function KategoriaPanel({
  open,
  onOpenChange,
  kategoriak,
  tetelek,
  onAdd,
  onDelete,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Már `sorrend` szerint rendezve -- lásd `sortedKategoriak`. */
  kategoriak: Kategoria[];
  tetelek: Tetel[];
  onAdd: () => Kategoria;
  onDelete: (id: string) => void;
  onSave: (next: Kategoria[]) => Promise<boolean>;
}) {
  const [dirty, setDirty] = useState(false);
  const guard = useDiscardGuard(dirty);
  // A docs/07-felulet-rendszer.md § Komponensek mintája: ugyanez a dirty
  // jelző a NavBar-navigációt is védi.
  useNavGuard(dirty);

  function requestClose() {
    guard.request(() => {
      setDirty(false);
      onOpenChange(false);
    });
  }

  return (
    <Box mb="4">
      <Button
        type="button"
        variant="soft"
        color="gray"
        aria-expanded={open}
        aria-controls="kategoriak-panel"
        onClick={() => (open ? requestClose() : onOpenChange(true))}
      >
        {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
        Kategóriák
      </Button>

      {open && (
        <KategoriaPanelBody
          kategoriak={kategoriak}
          tetelek={tetelek}
          onAdd={onAdd}
          onDelete={onDelete}
          onSave={onSave}
          onDirtyChange={setDirty}
        />
      )}

      <DiscardChangesDialog
        open={guard.pending}
        onOpenChange={(o) => !o && guard.cancel()}
        onConfirm={guard.confirm}
        title="Nem mentett módosítás"
        description="A Kategóriák panelen nem mentett módosításod van. Ha becsukod, ez elvész — csak a Mentés gomb rögzíti. Biztosan folytatod?"
        confirmLabel="Becsukás, módosítás elvetésével"
      />
    </Box>
  );
}

/**
 * A Kategóriák panel pufferelt tartalma -- csak nyitva mountolt, a
 * `RendeloTab.tsx` mintáján: `useDirtyDraft` tartja a névre/színre/
 * sorrendre vonatkozó piszkozatot, a Mentés/Mégse gombpár azonnali (nincs
 * hozzá külön megerősítés, mert a `KategoriaPanel` külső rétege már véd a
 * panel becsukásától/NavBar-navigációtól). A kategória létrehozása/törlése
 * ETTŐL FÜGGETLENÜL azonnal ír a törzsadatba (lásd a lap `addCategory`/
 * `deleteCategory`-jának kommentjét) -- a draftot csak TÜKRÖZI, hogy a
 * doki folyamatban lévő szerkesztése ne vesszen el és a lista se essen
 * szét a mentetlen piszkozat alól.
 */
function KategoriaPanelBody({
  kategoriak,
  tetelek,
  onAdd,
  onDelete,
  onSave,
  onDirtyChange,
}: {
  kategoriak: Kategoria[];
  tetelek: Tetel[];
  onAdd: () => Kategoria;
  onDelete: (id: string) => void;
  onSave: (next: Kategoria[]) => Promise<boolean>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { draft, setDraft, dirty, reset } = useDirtyDraft<Kategoria[]>(kategoriak);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  function patchDraft(
    id: string,
    patch: Partial<Kategoria> | ((prev: Kategoria) => Partial<Kategoria>),
  ) {
    setDraft((prev) =>
      prev.map((k) => (k.id === id ? { ...k, ...(typeof patch === 'function' ? patch(k) : patch) } : k)),
    );
  }

  function moveDraft(id: string, irany: -1 | 1) {
    setDraft((prev) => {
      const idx = prev.findIndex((k) => k.id === id);
      const cel = idx + irany;
      if (idx < 0 || cel < 0 || cel >= prev.length) return prev;
      const next = prev.slice();
      [next[idx], next[cel]] = [next[cel], next[idx]];
      return next;
    });
  }

  function handleAdd() {
    const created = onAdd();
    setDraft((prev) => [...prev, created]);
    setOpenCat(created.id);
  }

  function handleDelete(id: string) {
    onDelete(id);
    setDraft((prev) => prev.filter((k) => k.id !== id));
    if (openCat === id) setOpenCat(null);
  }

  async function handleSave() {
    setSaving(true);
    // A tömbsorrend a megjelenítési/fogszín-ütközési sorrend (lásd
    // docs/07-felulet-rendszer.md § Szín, forma, sűrűség és
    // domain/toothVisual.ts `resolveToothVisual`) -- a `sorrend` mező csak
    // ennek a lemezre írt tükre, ezért itt, mentéskor számozódik újra.
    const next = draft.map((k, i) => ({ ...k, sorrend: i + 1 }));
    const ok = await onSave(next);
    setSaving(false);
    if (ok) {
      setDraft(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <Box id="kategoriak-panel" mt="3">
      <Table.Root size="1" mb="2">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell width="24px" />
            <Table.ColumnHeaderCell>Kategória</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell justify="end">Tételek</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell width="60px" />
            <Table.ColumnHeaderCell width="34px" />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {draft.map((k, i) => {
            const sajatTetelek = tetelek.filter((x) => x.kategoriaId === k.id);
            // Aktív ÉS inaktív tétel is számít -- egy `aktiv: false` tétel
            // bármikor visszakapcsolható, tehát egy csak aktív tételek
            // alapján "üresnek" ítélt kategória valójában nem az (8. döntés).
            const ures = sajatTetelek.length === 0;
            const inaktiv = sajatTetelek.filter((x) => !x.aktiv).length;

            return (
              <Fragment key={k.id}>
                <Table.Row
                  style={{ cursor: 'pointer' }}
                  onClick={() => setOpenCat(openCat === k.id ? null : k.id)}
                >
                  <Table.Cell>
                    <span
                      aria-hidden
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: k.szin ?? ALAP_KATEGORIA_SZIN,
                        display: 'inline-block',
                      }}
                    />
                  </Table.Cell>
                  {/* Ugyanaz a minta, mint a tétel-táblázat sorának
                      RowHeaderCell-je -- a sor fejléce a billentyűzetes
                      trigger, a mozgatás/törlés gombok maradnak saját
                      Tab-megállók. */}
                  <Table.RowHeaderCell
                    role="button"
                    tabIndex={0}
                    aria-expanded={openCat === k.id}
                    aria-controls={`kategoria-szerkeszto-${k.id}`}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return;
                      e.preventDefault();
                      setOpenCat(openCat === k.id ? null : k.id);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {k.nev.hu}
                    {!k.nev.de && (
                      <Text size="1" ml="2" color="gray">
                        nincs DE név
                      </Text>
                    )}
                  </Table.RowHeaderCell>
                  <Table.Cell justify="end" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {sajatTetelek.length} tétel
                    {inaktiv > 0 && (
                      <Text size="1" ml="1" color="gray">
                        ({inaktiv} inaktív)
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Flex gap="1">
                      <IconButton
                        aria-label="Kategória feljebb"
                        variant="ghost"
                        color="gray"
                        size="1"
                        disabled={i === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveDraft(k.id, -1);
                        }}
                      >
                        <ArrowUpIcon />
                      </IconButton>
                      <IconButton
                        aria-label="Kategória lejjebb"
                        variant="ghost"
                        color="gray"
                        size="1"
                        disabled={i === draft.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveDraft(k.id, 1);
                        }}
                      >
                        <ArrowDownIcon />
                      </IconButton>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    <IconButton
                      aria-label="Kategória törlése"
                      title={
                        ures
                          ? undefined
                          : 'Előbb mozgasd át a hozzá tartozó tételeket másik kategóriába'
                      }
                      variant="ghost"
                      color="gray"
                      size="1"
                      disabled={!ures}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(k.id);
                      }}
                    >
                      <TrashIcon />
                    </IconButton>
                  </Table.Cell>
                </Table.Row>

                {openCat === k.id && (
                  <Table.Row id={`kategoria-szerkeszto-${k.id}`}>
                    <Table.Cell colSpan={5} style={{ background: t.surfaceAlt }}>
                      <KategoriaEditor kategoria={k} onPatch={(p) => patchDraft(k.id, p)} />
                    </Table.Cell>
                  </Table.Row>
                )}
              </Fragment>
            );
          })}
        </Table.Body>
      </Table.Root>

      <Flex justify="between" align="center">
        <Button type="button" size="1" variant="soft" onClick={handleAdd}>
          + Új kategória
        </Button>
        <Flex align="center" gap="3">
          {dirty && !saved && (
            <Text size="1" color="gray">
              Nem mentett módosítás
            </Text>
          )}
          <Button type="button" size="1" variant="soft" color="gray" onClick={reset} disabled={saving || !dirty}>
            Mégse
          </Button>
          <Button size="1" onClick={() => void handleSave()} disabled={saving || !dirty}>
            {saving ? 'Mentés…' : saved ? 'Mentve ✓' : 'Mentés'}
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
}

/** Kinyitott kategória-sor -- a mai `ItemEditor` mintájára. */
function KategoriaEditor({
  kategoria,
  onPatch,
}: {
  kategoria: Kategoria;
  onPatch: (patch: Partial<Kategoria> | ((prev: Kategoria) => Partial<Kategoria>)) => void;
}) {
  return (
    <Box py="2">
      <Grid columns="2" gap="3" mb="3">
        <Field label="Megnevezés (magyar)">
          <BufferedTextField
            value={kategoria.nev.hu}
            onChange={(v) => onPatch((prev) => ({ nev: { ...prev.nev, hu: v } }))}
          />
        </Field>
        <Field label="Bezeichnung (német)">
          <BufferedTextField
            value={kategoria.nev.de || ''}
            placeholder="még nincs megadva"
            onChange={(v) => onPatch((prev) => ({ nev: { ...prev.nev, de: v || null } }))}
          />
        </Field>
      </Grid>

      {/* Kurált paletta, nincs szabad hex/natív color input -- két kategória
          kaphat azonos színt, a felület ezt nem jelzi. */}
      <FieldGroup label="Szín (a fogtérképen ez jelöli a kategória kezeléseit)">
        <RadioCards.Root
          value={kategoria.szin ?? ALAP_KATEGORIA_SZIN}
          onValueChange={(v) => onPatch({ szin: v })}
          columns="8"
          gap="2"
        >
          {KATEGORIA_PALETTA.map((p) => (
            <RadioCards.Item key={p.hex} value={p.hex} aria-label={p.nev}>
              <span
                aria-hidden
                style={{ display: 'block', width: 20, height: 20, borderRadius: 4, background: p.hex }}
              />
            </RadioCards.Item>
          ))}
        </RadioCards.Root>
      </FieldGroup>

      <Text as="div" size="1" color="gray" mt="3" style={{ fontFamily: t.mono }}>
        id: {kategoria.id}
      </Text>
    </Box>
  );
}
