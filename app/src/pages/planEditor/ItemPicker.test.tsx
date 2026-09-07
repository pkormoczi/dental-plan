import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Theme } from '@radix-ui/themes';
import ItemPicker from './ItemPicker';
import type { Kategoria, Tetel } from '../../domain/types';

function tetel(id: string, nevHu: string, kategoriaId = 'k02'): Tetel {
  return {
    id,
    kategoriaId,
    sorrend: 1,
    aktiv: true,
    gyakori: false,
    nev: { hu: nevHu, de: null },
    ar: { HUF: { tipus: 'FIX', ertek: 1000 }, EUR: null },
  };
}

const kategoriak: Kategoria[] = [{ id: 'k02', nev: { hu: 'Tömések', de: null }, sorrend: 1 }];

const available: Tetel[] = [tetel('t1', 'Gyökértömés'), tetel('t2', 'Esztétikus tömés')];

function renderPicker(props: Partial<React.ComponentProps<typeof ItemPicker>> = {}) {
  const onPick = vi.fn();
  const utils = render(
    <Theme>
      <ItemPicker
        available={available}
        kategoriak={kategoriak}
        currency="HUF"
        nyelv="hu"
        onPick={onPick}
        {...props}
      />
    </Theme>,
  );
  return { ...utils, onPick };
}

/** Ugyanaz, mint `renderPicker`, de `onPickEgyedi`-t is bekötve adja vissza -- a backlog-3 tesztekhez. */
function renderPickerWithEgyedi(props: Partial<React.ComponentProps<typeof ItemPicker>> = {}) {
  const onPickEgyedi = vi.fn();
  const { onPick, ...utils } = renderPicker({ onPickEgyedi, ...props });
  return { ...utils, onPick, onPickEgyedi };
}

describe('ItemPicker', () => {
  it('a keresőmezőnek van elérhető neve, nem csak placeholder-e', () => {
    renderPicker();
    expect(screen.getByRole('textbox', { name: 'Tétel keresése' })).toBeInTheDocument();
  });

  it('inline (alap) mód: gépel -> nyíl -> Enter -> a kereső kiürül és visszakapja a fókuszt', async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker();

    const input = screen.getByPlaceholderText(/Tétel keresése/);
    await user.type(input, 'gyoker');
    await screen.findByText('Gyökértömés');
    await user.keyboard('{Enter}');

    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
    await waitFor(() => expect(input).toHaveValue(''));
    expect(input).toHaveFocus();
  });

  it('autoFocus: true esetén a mező rögtön fókuszt kap', () => {
    renderPicker({ autoFocus: true });
    expect(screen.getByPlaceholderText(/Tétel keresése/)).toHaveFocus();
  });

  it('clearOnPick: false esetén választás után a mező NEM ürül ki (a hívó úgyis eltünteti a komponenst)', async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker({ clearOnPick: false });

    const input = screen.getByPlaceholderText(/Tétel keresése/);
    await user.type(input, 'eszt');
    await screen.findByText('Esztétikus tömés');
    await user.keyboard('{Enter}');

    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 't2' }));
    expect(input).toHaveValue('eszt');
  });

  it('floating: "portal" esetén a találati lista portálon is megjelenik és kattinthatóan választ', async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker({ floating: 'portal' });

    const input = screen.getByPlaceholderText(/Tétel keresése/);
    await user.type(input, 'gyoker');
    const talalat = await screen.findByText('Gyökértömés');
    await user.click(talalat);

    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
  });

  it('regresszió: onPickEgyedi átadása mellett is a találat marad az Enter célja, nem az egyedi opció', async () => {
    const user = userEvent.setup();
    const { onPick, onPickEgyedi } = renderPickerWithEgyedi();

    const input = screen.getByPlaceholderText(/Tétel keresése/);
    await user.type(input, 'gyoker');
    await screen.findByText('Gyökértömés');
    await user.keyboard('{Enter}');

    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
    expect(onPickEgyedi).not.toHaveBeenCalled();
  });

  it('nulla találatra az Enter az egyedi opciót veszi fel, ha a hívó kéri (onPickEgyedi)', async () => {
    const user = userEvent.setup();
    const { onPick, onPickEgyedi } = renderPickerWithEgyedi();

    const input = screen.getByPlaceholderText(/Tétel keresése/);
    await user.type(input, 'érzéstelenítés');
    await screen.findByText(/Egyedi tétel felvétele/);
    await user.keyboard('{Enter}');

    expect(onPickEgyedi).toHaveBeenCalledWith('érzéstelenítés');
    expect(onPick).not.toHaveBeenCalled();
    // A ciklus (kereső kiürül és visszakapja a fókuszt) egyedi opciónál is él.
    await waitFor(() => expect(input).toHaveValue(''));
    expect(input).toHaveFocus();
  });

  it('nulla találatnál onPickEgyedi hiányában az Enter nem csinál semmit (a régi viselkedés)', async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker();

    const input = screen.getByPlaceholderText(/Tétel keresése/);
    await user.type(input, 'érzéstelenítés');
    await screen.findByText('Nincs találat.');
    await user.keyboard('{Enter}');

    expect(onPick).not.toHaveBeenCalled();
    expect(input).toHaveValue('érzéstelenítés');
  });

  it('van találat ÉS onPickEgyedi is: a lista végén megjelenő egyedi opció nyíllal elérhető és Enterrel commitálható', async () => {
    const user = userEvent.setup();
    const { onPick, onPickEgyedi } = renderPickerWithEgyedi();

    const input = screen.getByPlaceholderText(/Tétel keresése/);
    await user.type(input, 'gyoker');
    await screen.findByText('Gyökértömés');
    await screen.findByText(/Egyedi tétel felvétele/);
    // Egyetlen találat ("gyoker" -> csak "Gyökértömés") -- egy ArrowDown a
    // lista végén túlra, az egyedi opcióra visz.
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onPickEgyedi).toHaveBeenCalledWith('gyoker');
    expect(onPick).not.toHaveBeenCalled();
  });

  // backlog-7: a 12-es limit fölötti csonkítás eddig NÉMA volt.
  describe('találat-csonkítás jelzése', () => {
    // 15 egyező tétel -> 12 látszik, 3 marad le.
    const sok: Tetel[] = Array.from({ length: 15 }, (_, i) => tetel(`s${i}`, `Tömés ${i + 1} felszín`));

    it('12-nél több találatnál megjelenik a "+N további találat" sor a pontos N-nel', async () => {
      const user = userEvent.setup();
      renderPicker({ available: sok });

      const input = screen.getByPlaceholderText(/Tétel keresése/);
      await user.type(input, 'tomes');

      expect(await screen.findByText(/\+3 további találat/)).toBeInTheDocument();
    });

    it('pontosan 12 (vagy kevesebb) találatnál nincs jelzés -- a lista teljes', async () => {
      const user = userEvent.setup();
      renderPicker({ available: sok.slice(0, 12) });

      const input = screen.getByPlaceholderText(/Tétel keresése/);
      await user.type(input, 'tomes');

      await screen.findByText('Tömés 1 felszín');
      expect(screen.queryByText(/további találat/)).not.toBeInTheDocument();
    });

    it('a jelző sor nem választható: a billentyűzet-ciklus a 12. találatnál fordul vissza', async () => {
      const user = userEvent.setup();
      const { onPick } = renderPicker({ available: sok });

      const input = screen.getByPlaceholderText(/Tétel keresése/);
      await user.type(input, 'tomes');
      await screen.findByText(/\+3 további találat/);

      // 12 lefelé lépés a 0. indexről a 12. opcióra vinne -- de csak 12 opció
      // van (0..11), tehát a ciklus körbeér a legelsőre. Ha a jelző sor
      // opcióként számítana, itt semmi nem commitálódna Enterre.
      await user.keyboard('{ArrowDown>12/}{Enter}');

      expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 's0' }));
    });
  });

  describe('találat-rangsor', () => {
    it('a 12-es limit a RANGSOROLT sorrendből vág: a releváns találat bejut, a belső egyezés esik ki', async () => {
      const user = userEvent.setup();
      // 12 belső egyezés ("gyokertomes N" -- egyetlen szó sem kezdődik a
      // keresőszóval), utolsóként EGY szó eleji egyezés.
      const belso: Tetel[] = Array.from({ length: 12 }, (_, i) =>
        tetel(`b${i}`, `Gyökértömés ${i + 1}`),
      );
      renderPicker({ available: [...belso, tetel('rel', 'Tömés speciális')] });

      const input = screen.getByPlaceholderText(/Tétel keresése/);
      await user.type(input, 'tomes');

      expect(await screen.findByText('Tömés speciális')).toBeInTheDocument();
      // A rangsor nélkül ez a 12. találat lett volna a listában, a releváns
      // pedig a limit alatt marad.
      expect(screen.queryByText('Gyökértömés 12')).not.toBeInTheDocument();
      expect(screen.getByText(/\+1 további találat/)).toBeInTheDocument();
    });

    it('beírás után az Enter a legrelevánsabb találatot veszi fel, nem az árlistában elsőt', async () => {
      const user = userEvent.setup();
      const { onPick } = renderPicker({
        available: [tetel('t1', 'Gyökértömés'), tetel('t2', 'Tömés két felszínen')],
      });

      const input = screen.getByPlaceholderText(/Tétel keresése/);
      await user.type(input, 'tomes');
      await screen.findByText('Tömés két felszínen');
      await user.keyboard('{Enter}');

      expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 't2' }));
    });
  });

  // A névtalálatok mellett a kategórianévre illeszkedő tételek is
  // találatok, külön "Kategória: …" fejléc alatt.
  describe('kategórianév-egyezés', () => {
    const katKategoriak: Kategoria[] = [
      { id: 'k01', nev: { hu: 'Fogkőeltávolítás', de: 'Zahnsteinentfernung' }, sorrend: 1 },
      { id: 'k02', nev: { hu: 'Tömések', de: null }, sorrend: 2 },
    ];
    const katAvailable: Tetel[] = [
      tetel('t1', 'Gyökértömés', 'k02'),
      tetel('t2', 'Komplett kezelés: ultrahang, sófúvás', 'k01'),
      tetel('t3', 'Ismételt kezelés 3-6 havonta', 'k01'),
    ];

    it('csak kategórianévre találó tétel megjelenik "Kategória: …" fejléc alatt (ma nulla találat lenne)', async () => {
      const user = userEvent.setup();
      renderPicker({ available: katAvailable, kategoriak: katKategoriak });

      const input = screen.getByPlaceholderText(/Tétel keresése/);
      await user.type(input, 'fogko');

      expect(await screen.findByText('Kategória: Fogkőeltávolítás')).toBeInTheDocument();
      expect(screen.getByText('Komplett kezelés: ultrahang, sófúvás')).toBeInTheDocument();
      expect(screen.getByText('Ismételt kezelés 3-6 havonta')).toBeInTheDocument();
    });

    it('a kategória NÉMET nevére is illeszkedik, a terv nyelvétől függetlenül', async () => {
      const user = userEvent.setup();
      renderPicker({ available: katAvailable, kategoriak: katKategoriak, nyelv: 'hu' });

      const input = screen.getByPlaceholderText(/Tétel keresése/);
      await user.type(input, 'zahnstein');

      expect(await screen.findByText('Kategória: Fogkőeltávolítás')).toBeInTheDocument();
    });

    it('egyetlen tétel sem szerepel mindkét szinten: névtalálat nem ismétlődik a kategória-blokkban', async () => {
      const user = userEvent.setup();
      // "gyoker" névtalálat t1-re -- a t1 kategóriája (k02, "Tömések") NEM
      // illeszkedik a keresőszóra, tehát nincs kategória-blokk.
      renderPicker({ available: katAvailable, kategoriak: katKategoriak });

      const input = screen.getByPlaceholderText(/Tétel keresése/);
      await user.type(input, 'gyoker');

      await screen.findByText('Gyökértömés');
      expect(screen.queryByText(/^Kategória:/)).not.toBeInTheDocument();
    });

    it('beírás után azonnali Enter a névtalálatot veszi fel, a névtalálatok sorrendjében', async () => {
      const user = userEvent.setup();
      // "kezeles" mindkét k01-es tétel NEVÉRE illeszkedik (névtalálat) --
      // tisztán névtalálat eset, nincs kategória-egyezés.
      const { onPick } = renderPicker({ available: katAvailable, kategoriak: katKategoriak });

      const input = screen.getByPlaceholderText(/Tétel keresése/);
      await user.type(input, 'kezeles');
      await screen.findByText('Komplett kezelés: ultrahang, sófúvás');
      await user.keyboard('{Enter}');

      expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 't2' }));
    });

    it('12 névtalálat mellett a kategória-blokk egyáltalán nem jelenik meg', async () => {
      const user = userEvent.setup();
      const sokNevTalalat: Tetel[] = Array.from({ length: 12 }, (_, i) =>
        tetel(`n${i}`, `Tömés ${i + 1} felszín`, 'k02'),
      );
      // A saját neve NEM tartalmazza a keresőszót, csak a kategóriája
      // ("Tömések") -- ez adná a kategória-egyezést, ha lenne rá hely.
      const katEgyezo = tetel('kt1', 'Kategória általi találat', 'k02');
      renderPicker({
        available: [...sokNevTalalat, katEgyezo],
        kategoriak: katKategoriak,
      });

      const input = screen.getByPlaceholderText(/Tétel keresése/);
      await user.type(input, 'tomes');

      await screen.findByText('Tömés 1 felszín');
      expect(screen.queryByText(/^Kategória:/)).not.toBeInTheDocument();
    });

    it('a kategória-blokk sorrendje VÁLTOZATLAN: kategória `sorrend`, nem névrelevancia', async () => {
      const user = userEvent.setup();
      renderPicker({ available: katAvailable, kategoriak: katKategoriak });

      const input = screen.getByPlaceholderText(/Tétel keresése/);
      await user.type(input, 'fogko');
      await screen.findByText('Kategória: Fogkőeltávolítás');

      const szoveg = document.body.textContent ?? '';
      expect(szoveg.indexOf('Komplett kezelés: ultrahang, sófúvás')).toBeLessThan(
        szoveg.indexOf('Ismételt kezelés 3-6 havonta'),
      );
    });

    it('a `↑ ↓` ciklus bejárja a kategória-blokk sorait is, a fejléc nem választható', async () => {
      const user = userEvent.setup();
      const { onPick } = renderPicker({ available: katAvailable, kategoriak: katKategoriak });

      const input = screen.getByPlaceholderText(/Tétel keresése/);
      await user.type(input, 'fogko');
      await screen.findByText('Kategória: Fogkőeltávolítás');

      // Két kategória-egyezés van (t2, t3), nincs névtalálat -- beírás után a
      // 0. opció (t2) az alap kijelölés, Enter azonnal azt veszi fel.
      await user.keyboard('{Enter}');
      expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 't2' }));

      // Egy ArrowDown a következő (t3) sorra visz -- a fejléc nem számít bele.
      onPick.mockClear();
      await user.type(input, 'fogko');
      await screen.findByText('Kategória: Fogkőeltávolítás');
      await user.keyboard('{ArrowDown}{Enter}');
      expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 't3' }));
    });
  });
});
