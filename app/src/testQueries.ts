// Közös DOM-lekérdezések több tesztfájlnak (OsszesTervSection, App,
// PatientPage, PlanEditorPage stb.). Szándékosan NEM a testUtils.tsx-ben:
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
 * 50. tétel óta ez NEM minden verzió-szintű művelet útja: a legfrissebb
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

// urlap-mezo-id-name: megosztott teszt-segédfüggvények a Chrome "form field
// element should have an id or name attribute" konzol-jelzésének gépi
// ellenőrzéséhez -- lásd a hívó lapteszteket (PatientPage.test.tsx,
// UjPaciensDialog.test.tsx, PlanEditorPage.test.tsx, RendeloTab/
// PriceListAdminPage teszek).

const MEZO_SZEREPEK = ['textbox', 'spinbutton', 'searchbox'] as const;

/**
 * Minden textbox/spinbutton/searchbox szerepű mező `id` VAGY `name`
 * attribútummal rendelkezik -- a `queries` alapból a teljes dokumentumot
 * nézi (`screen`), egy dialógusra/konténerre szűküléshez adj át
 * `within(container)`-t.
 */
export function mezokIdVagyNameNelkul(
  queries: Pick<typeof screen, 'queryAllByRole'> = screen,
): HTMLElement[] {
  return MEZO_SZEREPEK.flatMap((role) =>
    queries
      .queryAllByRole(role)
      .filter((mezo) => !mezo.hasAttribute('id') && !mezo.hasAttribute('name')),
  );
}

/** Duplikált `id` attribútumok egy konténeren belül -- egy renderelt N-soros listánál (pl. LineRow) ennek üresnek kell lennie. */
export function duplikaltIdk(container: HTMLElement = document.body): string[] {
  const idk = Array.from(container.querySelectorAll('[id]')).map((el) => el.id);
  return idk.filter((id, i) => idk.indexOf(id) !== i);
}
