// backlog-29: a NavBar eddig nem volt közvetlenül tesztelve, csak
// közvetve (App.test.tsx a Filerendszer/DEMO linken keresztül). Ez a teszt
// a tétel lényegét fedi: a végleges öt tételes fő navigáció pontos
// felirata/sorrendje, plusz az egyelőre megtartott négy átmeneti link
// (2. döntés, backlog/plans/backlog-29-fonavigacio-terv.md).

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import NavBar from './NavBar';

function renderNavBar() {
  return render(
    <Theme>
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    </Theme>,
  );
}

describe('NavBar', () => {
  it('a végleges öt linket mutatja elöl, a megadott sorrendben és felirattal', () => {
    renderNavBar();
    const links = screen.getAllByRole('link').map((el) => el.textContent);
    expect(links.slice(0, 5)).toEqual([
      'Kezdőlap',
      'Páciensek',
      'Kezelések és árak',
      'Beállítások',
      'DEMO',
    ]);
  });

  it('utánuk a négy átmeneti workflow-linket mutatja, ugyanabban a sorrendben', () => {
    renderNavBar();
    const links = screen.getAllByRole('link').map((el) => el.textContent);
    expect(links.slice(5)).toEqual(['Páciens', 'Terv szerkesztő', 'Előnézet', 'Korábbi tervek']);
  });

  it('a "Kezelések és árak" a /arlista-ra, a "DEMO" a /demo-ra mutat', () => {
    renderNavBar();
    expect(screen.getByRole('link', { name: 'Kezelések és árak' })).toHaveAttribute('href', '/arlista');
    expect(screen.getByRole('link', { name: 'DEMO' })).toHaveAttribute('href', '/demo');
  });
});
