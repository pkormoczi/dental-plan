// A NavBar eddig nem volt közvetlenül tesztelve, csak közvetve
// (App.test.tsx a Filerendszer/DEMO linken keresztül). Ez a teszt a
// docs/01-attekintes-es-dontesek.md D34 szerinti végleges öt tételes fő
// navigáció pontos feliratát/sorrendjét fedi -- a korábban itt élt négy
// átmeneti workflow-link a terv-workflow héjjal (D36) megszűnt.

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import NavBar from './NavBar';
import { NavGuardProvider } from './NavGuardContext';

// D46: a NavBar `useNavGuardState()`-et hív, ami Provider nélkül dob -- a
// kattintás-elfogás/megerősítő-dialógus mechanizmusát külön,
// `NavGuardContext.test.tsx` fedi, ez a fájl a linkek feliratát/sorrendjét.
function renderNavBar() {
  return render(
    <Theme>
      <MemoryRouter>
        <NavGuardProvider>
          <NavBar />
        </NavGuardProvider>
      </MemoryRouter>
    </Theme>,
  );
}

describe('NavBar', () => {
  it('a végleges öt linket mutatja, a megadott sorrendben és felirattal', () => {
    renderNavBar();
    const links = screen.getAllByRole('link').map((el) => el.textContent);
    expect(links).toEqual(['Kezdőlap', 'Páciensek', 'Kezelések és árak', 'Beállítások', 'DEMO']);
  });

  it('a "Kezelések és árak" a /arlista-ra, a "DEMO" a /demo-ra mutat', () => {
    renderNavBar();
    expect(screen.getByRole('link', { name: 'Kezelések és árak' })).toHaveAttribute('href', '/arlista');
    expect(screen.getByRole('link', { name: 'DEMO' })).toHaveAttribute('href', '/demo');
  });
});
