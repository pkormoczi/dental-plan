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
 * A verziósoron a `⋯` DropdownMenu mögötti műveletek -- a menü csak
 * nyitáskor rendeli a menüpontokat a DOM-ba. `card` a páciensblokk
 * (`patientCard`), `vi = 0` a legfrissebb verzió sora (a lista fordítva
 * rendez).
 *
 * 50. tétel (D58) óta ez NEM minden verzió-szintű művelet útja: a legfrissebb
 * soron az "Új verzió"/"Megnézés" látható gomb, nem menüpont -- azokhoz
 * `within(card).getByRole('button', { name: '…' })` kell, ez a helper csak
 * a `⋯`-ben maradt elemekhez (Letöltés, Másolás új tervbe, historical soron
 * a Megnézés, Ugrás a legfrissebb verzióra).
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
