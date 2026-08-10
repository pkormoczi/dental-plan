// Puha hosszkorlát-figyelmeztetés a tétel-/sor-leírásra
// (docs/08-backlog.md 10. tétel, 7. döntés) -- két hívó van rá (Árlista
// admin `ItemEditor` ÉS a tervszerkesztő `LineRow`), ezért domain-szintű
// segédfüggvény, nem UI-réteg duplikátum.

export const LEIRAS_FIGYELMEZTETES_KARAKTER = 300;
export const LEIRAS_FIGYELMEZTETES_SOR = 5;

export function leirasTulHosszu(szoveg: string): boolean {
  return (
    szoveg.length > LEIRAS_FIGYELMEZTETES_KARAKTER ||
    szoveg.split('\n').length > LEIRAS_FIGYELMEZTETES_SOR
  );
}
