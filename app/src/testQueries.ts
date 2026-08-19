// Közös DOM-lekérdezések a terv-lánc/verzió fához, több tesztfájlnak
// (OsszesTervSection, App, PatientPage). Szándékosan NEM a testUtils.tsx-ben:
// az egy komponenst (TestProviders) exportál, és a mellé tett
// segédfüggvények a react(only-export-components) lint-szabályt sértenék.

import { screen, within } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';

/** A páciensblokk stabil horgonya -- lásd `data-patient` az OsszesTervSection-ön. */
export function patientCard(nev: string): HTMLElement {
  return screen.getByText(nev).closest('[data-patient]') as HTMLElement;
}

/**
 * A verziósoron MINDEN művelet egy "⋯" DropdownMenu mögött van, és a menü
 * csak nyitáskor rendeli a menüpontokat a DOM-ba -- minden ilyen teszt ezen
 * megy keresztül.
 *
 * `card` a páciensblokk (`patientCard`), `vi = 0` a legfrissebb verzió sora
 * (a lista fordítva rendez).
 */
export async function verzioMenupont(
  user: ReturnType<typeof userEvent.setup>,
  card: HTMLElement,
  nev: string,
  vi = 0,
): Promise<HTMLElement> {
  const triggers = within(card).getAllByRole('button', { name: /további műveletek$/ });
  await user.click(triggers[vi]);
  return screen.findByRole('menuitem', { name: nev });
}
