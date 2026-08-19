// Mechanizmus-szintű teszt a NavGuardContext-re (D46) -- egy minimál stub
// "védett" lap + a valódi NavBar, közös Providerben. A konkrét bekötések
// (PatientDetailPage/SettingsPage) saját teszteikben fedettek
// (PatientDetailPage.test.tsx, SettingsPage.test.tsx) -- ez a fájl csak a
// megosztott primitívet (Context + NavBar kattintás-elfogás) igazolja,
// egy adott felület üzleti logikájától függetlenül.

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { describe, expect, it } from 'vitest';
import NavBar from './NavBar';
import { NavGuardProvider, useNavGuard } from './NavGuardContext';

function DirtyStubPage({ dirty }: { dirty: boolean }) {
  useNavGuard(dirty);
  return <div>Védett lap tartalma</div>;
}

function renderHarness(dirty: boolean) {
  return render(
    <Theme>
      <MemoryRouter initialEntries={['/paciensek']}>
        <NavGuardProvider>
          <NavBar />
          <Routes>
            <Route path="/paciensek" element={<DirtyStubPage dirty={dirty} />} />
            <Route path="/" element={<div>Kezdőlap-próba</div>} />
          </Routes>
        </NavGuardProvider>
      </MemoryRouter>
    </Theme>,
  );
}

describe('NavGuardContext + NavBar', () => {
  it('nem-dirty állapotban a NavBar-kattintás megerősítés nélkül navigál', async () => {
    const user = userEvent.setup();
    renderHarness(false);

    await user.click(screen.getByRole('link', { name: 'Kezdőlap' }));

    expect(await screen.findByText('Kezdőlap-próba')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('dirty állapotban a NavBar-kattintás megerősítést kér, Mégse a lapon tart', async () => {
    const user = userEvent.setup();
    renderHarness(true);

    await user.click(screen.getByRole('link', { name: 'Kezdőlap' }));
    const dialog = await screen.findByRole('alertdialog');

    await user.click(within(dialog).getByRole('button', { name: 'Mégse' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByText('Védett lap tartalma')).toBeInTheDocument();
  });

  it('dirty állapotban a megerősítés után ténylegesen navigál', async () => {
    const user = userEvent.setup();
    renderHarness(true);

    await user.click(screen.getByRole('link', { name: 'Kezdőlap' }));
    await user.click(await screen.findByRole('button', { name: 'Váltás, módosítás elvetésével' }));

    expect(await screen.findByText('Kezdőlap-próba')).toBeInTheDocument();
  });
});
