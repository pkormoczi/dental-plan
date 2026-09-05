import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetListStateMemoryForTests, useListStateMemory } from './useListStateMemory';

function ListProbe() {
  const { q, setQ, nyitottak, setNyitott } = useListStateMemory('teszt', true);
  return (
    <div>
      <input aria-label="kereso" value={q} onChange={(e) => setQ(e.target.value)} />
      <div data-testid="lanc-a-nyitva">{String(nyitottak['lanc-a'] ?? false)}</div>
      <button onClick={() => setNyitott('lanc-a', !(nyitottak['lanc-a'] ?? false))}>
        Lánc A kapcsoló
      </button>
      <Link to="/reszlet">Tovább</Link>
    </div>
  );
}

function DetailProbe() {
  const navigate = useNavigate();
  return (
    <div>
      <div>Részlet</div>
      <button onClick={() => navigate(-1)}>Vissza</button>
      <Link to="/lista">NavBar lista</Link>
    </div>
  );
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/lista']}>
      <Routes>
        <Route path="/lista" element={<ListProbe />} />
        <Route path="/reszlet" element={<DetailProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('useListStateMemory', () => {
  beforeEach(() => {
    resetListStateMemoryForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('böngésző-"vissza" (POP) navigációnál visszaáll a keresőszöveg', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByRole('textbox', { name: 'kereso' }), 'nagy');
    await user.click(screen.getByRole('link', { name: 'Tovább' }));
    await screen.findByText('Részlet');

    await user.click(screen.getByRole('button', { name: 'Vissza' }));
    expect(await screen.findByRole('textbox', { name: 'kereso' })).toHaveValue('nagy');
  });

  it('friss (PUSH) belépésnél a keresőszöveg üres, a korábbi munkamenet-állapot ellenére', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByRole('textbox', { name: 'kereso' }), 'nagy');
    await user.click(screen.getByRole('link', { name: 'Tovább' }));
    await screen.findByText('Részlet');

    await user.click(screen.getByRole('link', { name: 'NavBar lista' }));
    expect(await screen.findByRole('textbox', { name: 'kereso' })).toHaveValue('');
  });

  it('POP navigációnál a scroll-pozíciót is visszaállítja', async () => {
    const user = userEvent.setup();
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Object.defineProperty(window, 'scrollY', { value: 480, configurable: true });

    renderApp();
    window.dispatchEvent(new Event('scroll'));

    await user.click(screen.getByRole('link', { name: 'Tovább' }));
    await screen.findByText('Részlet');
    scrollToSpy.mockClear();

    await user.click(screen.getByRole('button', { name: 'Vissza' }));
    await screen.findByRole('textbox', { name: 'kereso' });
    expect(scrollToSpy).toHaveBeenCalledWith(0, 480);
  });

  // 46. tétel: a lánc-nyitottság ugyanazon a POP-only elven áll
  // vissza, mint a keresőszöveg.
  it('böngésző-"vissza" (POP) navigációnál visszaáll a nyitottsági állapot is', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: 'Lánc A kapcsoló' }));
    expect(screen.getByTestId('lanc-a-nyitva')).toHaveTextContent('true');

    await user.click(screen.getByRole('link', { name: 'Tovább' }));
    await screen.findByText('Részlet');

    await user.click(screen.getByRole('button', { name: 'Vissza' }));
    expect(await screen.findByTestId('lanc-a-nyitva')).toHaveTextContent('true');
  });

  it('friss (PUSH) belépésnél a nyitottsági állapot üres, a korábbi munkamenet-állapot ellenére', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: 'Lánc A kapcsoló' }));
    await user.click(screen.getByRole('link', { name: 'Tovább' }));
    await screen.findByText('Részlet');

    await user.click(screen.getByRole('link', { name: 'NavBar lista' }));
    expect(await screen.findByTestId('lanc-a-nyitva')).toHaveTextContent('false');
  });

  // A `ment()` refaktor regressziós tesztje: `setQ` és `setNyitott` NEM
  // írhatja felül csendben egymás mentett mezőjét ugyanabban a rekordban.
  it('a kereső és a nyitottság független íróinak mentése nem írja felül egymást', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByRole('textbox', { name: 'kereso' }), 'nagy');
    await user.click(screen.getByRole('button', { name: 'Lánc A kapcsoló' }));

    await user.click(screen.getByRole('link', { name: 'Tovább' }));
    await screen.findByText('Részlet');
    await user.click(screen.getByRole('button', { name: 'Vissza' }));

    expect(await screen.findByRole('textbox', { name: 'kereso' })).toHaveValue('nagy');
    expect(screen.getByTestId('lanc-a-nyitva')).toHaveTextContent('true');
  });
});
