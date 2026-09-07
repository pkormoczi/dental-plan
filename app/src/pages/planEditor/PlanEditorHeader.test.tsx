// A `PlanEditorHeader` izolált komponensteszte -- a komponens tisztán
// prezentációs (nincs storage-/router-/AppState-függősége), ezért önállóan
// renderelhető `<Theme>` alatt, primitív propokkal. A tényleges autosave-
// időzítést és a piszkozat-eldobás storage-huzalozását a
// `PlanEditorPage.test.tsx` "backlog-32: piszkozat-mentés jelzés és
// eldobás" leírása fedi teljes lapon át.

import { render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PlanEditorHeader from './PlanEditorHeader';

describe('PlanEditorHeader', () => {
  it('a páciensnevet és a piszkozat/véglegesítve állapotot mutatja', () => {
    render(
      <Theme>
        <PlanEditorHeader
          patientName="Teszt Elek"
          statusz="PISZKOZAT"
          onPreview={() => {}}
          piszkozatMentve={null}
          piszkozatHiba={null}
          piszkozatKonfliktus={false}
        onDiscard={() => {}}
        />
      </Theme>,
    );

    expect(screen.getByText(/Teszt Elek/)).toBeInTheDocument();
    expect(screen.getByText(/piszkozat/)).toBeInTheDocument();
  });

  it('üres páciensnévnél "Új páciens"-t mutat, VEGLEGES státusznál "véglegesítve"-t', () => {
    render(
      <Theme>
        <PlanEditorHeader
          patientName=""
          statusz="VEGLEGES"
          onPreview={() => {}}
          piszkozatMentve={null}
          piszkozatHiba={null}
          piszkozatKonfliktus={false}
        onDiscard={() => {}}
        />
      </Theme>,
    );

    expect(screen.getByText(/Új páciens/)).toBeInTheDocument();
    expect(screen.getByText(/véglegesítve/)).toBeInTheDocument();
  });

  it('a "Piszkozat mentve" jelzés csak hiba NÉLKÜL látszik, hiba esetén elrejtőzik (a két jelzés ne mondjon ellent egymásnak)', () => {
    const { rerender } = render(
      <Theme>
        <PlanEditorHeader
          patientName="Teszt Elek"
          statusz="PISZKOZAT"
          onPreview={() => {}}
          piszkozatMentve="2026-08-25T10:00:00.000Z"
          piszkozatHiba={null}
          piszkozatKonfliktus={false}
        onDiscard={() => {}}
        />
      </Theme>,
    );
    expect(screen.getByText(/^Piszkozat mentve /)).toBeInTheDocument();

    rerender(
      <Theme>
        <PlanEditorHeader
          patientName="Teszt Elek"
          statusz="PISZKOZAT"
          onPreview={() => {}}
          piszkozatMentve="2026-08-25T10:00:00.000Z"
          piszkozatHiba="hálózati hiba"
          piszkozatKonfliktus={false}
        onDiscard={() => {}}
        />
      </Theme>,
    );
    expect(screen.queryByText(/^Piszkozat mentve /)).not.toBeInTheDocument();
  });

  it('az Előnézet gomb az onPreview-t, a kuka ikon az onDiscard-ot hívja', async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn();
    const onDiscard = vi.fn();
    render(
      <Theme>
        <PlanEditorHeader
          patientName="Teszt Elek"
          statusz="PISZKOZAT"
          onPreview={onPreview}
          piszkozatMentve={null}
          piszkozatHiba={null}
          piszkozatKonfliktus={false}
        onDiscard={onDiscard}
        />
      </Theme>,
    );

    await user.click(screen.getByRole('button', { name: 'Előnézet' }));
    expect(onPreview).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Piszkozat eldobása' }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('feloldatlan ütközésnél a "Piszkozat mentve" helyett a nem-mentett állapot látszik', () => {
    render(
      <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
        <PlanEditorHeader
          patientName="Teszt Elek"
          statusz="PISZKOZAT"
          onPreview={() => {}}
          piszkozatMentve="2026-08-09T10:15:00.000Z"
          piszkozatHiba={null}
          piszkozatKonfliktus
          onDiscard={() => {}}
        />
      </Theme>,
    );

    expect(screen.getByText(/Piszkozat nincs mentve/)).toBeInTheDocument();
    expect(screen.queryByText(/Piszkozat mentve/)).not.toBeInTheDocument();
  });
});
