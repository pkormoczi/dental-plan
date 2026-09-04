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

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  AlertDialog,
  Box,
  Button,
  Callout,
  Flex,
  Heading,
  IconButton,
  SegmentedControl,
  Separator,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes';
import { EyeClosedIcon, EyeOpenIcon, InfoCircledIcon, StarFilledIcon, StarIcon } from '@radix-ui/react-icons';
import { t } from '../design/tokens';
import { csokkentettMozgas } from '../design/motion';
import { ALAP_KATEGORIA_SZIN } from '../design/treatmentVisuals';
import { tetelIlleszkedik, tetelMegtartando, type FilterKey } from '../domain/arlistaSzures';
import { todayIso } from '../domain/date';
import { formatPrice } from '../domain/money';
import { nextKategoriaId, nextTetelId } from '../domain/priceListIds';
import { egyezoKategoriaIdk, norm } from '../domain/search';
import { alkalmazTomegesArat, type TomegesArParams } from '../domain/tomegesAr';
import type { Kategoria, PriceList, Tetel } from '../domain/types';
import ItemEditor from './priceListAdmin/ItemEditor';
import KategoriaPanel from './priceListAdmin/KategoriaPanel';
import TomegesArDialog from './priceListAdmin/TomegesArDialog';
import UjTetelDialog from './priceListAdmin/UjTetelDialog';
import { useAppState } from '../state/AppState';

const FILTERS: Array<[FilterKey, string]> = [
  ['all', 'Mind'],
  ['noeur', 'Nincs EUR ár'],
  ['range', 'Sávos ár'],
  ['off', 'Inaktív'],
  ['fav', 'Gyakori'],
];

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
  // A Tömeges árváltoztatás után nő -- jelez a nyitott `ItemEditor`-nak, hogy
  // az elgépelés-védelem baseline-ja a friss értékre újrarögzüljön, jelzés
  // nélkül (docs/03-funkcionalis-spec.md § 6. "Sor kinyitása"): a tömeges
  // művelet szándékos, saját előnézettel, nem elgépelés.
  const [arBaselineToken, setArBaselineToken] = useState(0);

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

  // A kategórianévre illeszkedő kategória-id-k -- egyszer, itt kiszámolva,
  // hogy a `grouped` ÉS a `szurtTetelek` (lent) ugyanazt a kört lássa: egy
  // kategórianévre keresve az egész csoport visszajön, a Tömeges
  // árváltoztatás köre pedig szándékosan együtt tágul (docs/03-funkcionalis-
  // spec.md § Keresés és szűrők).
  const egyezoKatIdk = useMemo(
    () => egyezoKategoriaIdk(priceList.kategoriak, norm(q)),
    [priceList.kategoriak, q],
  );

  const grouped = useMemo(() => {
    return priceList.kategoriak
      .slice()
      .sort((a, b) => a.sorrend - b.sorrend)
      .map((k) => ({
        cat: k,
        items: priceList.tetelek.filter(
          (x) => x.kategoriaId === k.id && tetelMegtartando(x, q, filter, open, egyezoKatIdk),
        ),
      }))
      .filter((g) => g.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceList, q, filter, open, egyezoKatIdk]);

  const missingEur = priceList.tetelek.filter((x) => !x.ar.EUR).length;
  const shown = grouped.reduce((s, g) => s + g.items.length, 0);

  // `null`, ha nincs aktív keresés/szűrő -- ilyenkor a Tömeges árváltoztatás
  // dialógus "jelenlegi szűrt lista" köre szó szerint azonos lenne a "Teljes
  // árlista" körrel, ezért az az opció ott nem is jelenik meg (backlog-92,
  // 2. döntés).
  const szurtAktiv = q.trim() !== '' || filter !== 'all';
  const szurtTetelek = useMemo(
    () =>
      szurtAktiv
        ? priceList.tetelek.filter((x) => tetelIlleszkedik(x, q, filter, egyezoKatIdk))
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [priceList, q, filter, szurtAktiv, egyezoKatIdk],
  );

  function applyTomegesAr(idk: Set<string>, params: TomegesArParams): Promise<boolean> {
    const result = commit((prev) => ({ ...prev, tetelek: alkalmazTomegesArat(prev.tetelek, idk, params) }));
    // Szinkron, a `.then` előtt -- a `priceList` a `commit()` hívása UTÁN, de
    // MÉG a Promise visszatérése előtt frissül, tehát a friss lista és a
    // token egyazon renderben landol a nyitott `ItemEditor`-nál.
    setArBaselineToken((n) => n + 1);
    return result;
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
              ? `Nincs találat erre: „${q}”. Próbálj más névre vagy kategórianévre keresni, vagy válts szűrőt.`
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

                {items.map((it) => {
                  const sorNeve = it.nev.hu.trim() || 'Névtelen tétel';
                  return (
                  <Fragment key={it.id}>
                    <Table.Row
                      style={{ cursor: 'pointer', opacity: it.aktiv ? 1 : 0.5 }}
                      onClick={() => setOpen(open === it.id ? null : it.id)}
                    >
                      <Table.Cell>
                        <IconButton
                          aria-label={
                            it.gyakori
                              ? `${sorNeve} gyakori jelölés törlése`
                              : `${sorNeve} megjelölése gyakorinak`
                          }
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
                          aria-label={it.aktiv ? `${sorNeve} inaktiválása` : `${sorNeve} aktiválása`}
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
                            tetelek={priceList.tetelek}
                            baselineToken={arBaselineToken}
                            onPatch={(p) => patchItem(it.id, p)}
                            autoFocusAr={it.id === frissTetelId}
                            pendingActivation={it.id === pendingActivationId}
                            onFirstPriceCommit={(ertek) => handleFirstPriceCommit(it.id, ertek)}
                          />
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Fragment>
                  );
                })}
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
