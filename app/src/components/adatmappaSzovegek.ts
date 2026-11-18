// A gépváltási szabály egyetlen szövege: a telepítési útmutató (`docs/TELEPITES.md`) ugyanezt
// mondja szóról szóra, ezt teszt őrzi (PRODUCT.md § Adat- és deployment-korlátok).

export const GEPVALTAS_BEVEZETO = 'Egyszerre mindig csak az egyik gépen dolgozz.';

export const GEPVALTASI_SZABALY: readonly string[] = [
  'Zárd be az alkalmazást ezen a gépen.',
  'Várd meg, hogy a Google Drive ikonja jelezze: a feltöltés befejeződött.',
  'A másik gépen várd meg, hogy a Google Drive letöltse a változásokat.',
  'Csak ezután nyisd meg ott az alkalmazást.',
];

export const DRIVE_EMLEKEZTETO =
  'Mielőtt a másik gépen folytatod, várd meg, hogy a Drive ikon a feltöltés végét jelezze.';

const ELEM_NEVEK: Record<string, string> = {
  'arlista.json': 'az árlista (arlista.json)',
  'beallitasok.json': 'a beállítások (beallitasok.json)',
  paciensek: 'a páciensek mappája (paciensek)',
  sablonok: 'a nyomtatvány-szövegek mappája (sablonok)',
};

/** Egy hiányzó saját elem a doki nyelvén, a fájlnévvel együtt -- a Fájlkezelőben arra keres. */
export function hianyzoElemNeve(nev: string): string {
  return ELEM_NEVEK[nev] ?? nev;
}
