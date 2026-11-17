# lassu-pricelistadmin-tesztek
Type: chore
Source: mac-intel-tamogatas implementálása közben talált (release próbafutás, 2026-11-17)
Target: master
Baseline: 1e206d44dc0ed59707aba5d7068ae76b71059ca8

## Goal
A `PriceListAdminPage` kategória-panel és „+ Új tétel” tesztjei lassú gépen is jóval a 15 s-os
timeout alatt futnak, ugyanazt a viselkedést ellenőrizve; a doki számára nincs látható változás.

## Current state
- `app/src/pages/PriceListAdminPage.test.tsx`: a `beforeEach` → `seedPriceListWithNoEurPrices` a
  teljes seed-árlistát (118 tétel, 13 kategória) teszi a `localStorage`-ba; `renderAdmin` és
  `renderAdminWithNavBar` a teljes oldalt rendereli; a „Kategóriák panel” blokk `openCatPanel`-je
  a „118 / 118 tétel látszik” szöveget várja. A kereső-tesztek seed-tételnevekre hivatkoznak
  („zahnhals”, „fogko”).
- Helyi mérés (2026-11-17, Windows): a fájl 56 tesztje 95 s; a leglassabb 14 mind a „Kategóriák
  panel” és a „„+ Új tétel” dialógus” blokkból, 2,5–5,6 s (pl. „a panel becsukása
  piszkozattal megerősítést kér…” 5,6 s; „a törlés gomb tiltva marad akkor is, ha egy kategória
  MINDEN tétele inaktív” 5,0 s — utóbbi gépelés nélkül, csak kattintással). GitHub Windows-runneren
  ~4 s, a `macos-26-intel` runneren 15–41 s (két próbán 1, ill. 12 timeout-bukás, mind ebből a fájlból).
- `app/vite.config.ts` `testTimeout: 15000`; `app/src/test-setup.ts` `asyncUtilTimeout: 5000`.
- `.github/workflows/release.yml`: az Intel-runner nem futtatja a `npm test`-et.

## Approach
Csak a tesztfájl változik: a két lassú blokk egy kisebb, a seedből származtatott árlistán fut, ami
megtartja az ellenőrzött eseteket (több kategória, kevés tételes kategória, üres kategória, a
blokkok által használt tételek). A blokkokon kívüli tesztek, köztük a seed-tételnevekre hivatkozó
kereső-tesztek, a teljes seeden maradnak. Nem változik: app-kód, `vite.config.ts` `testTimeout`,
`test-setup.ts`, `release.yml` (az Intel-runner továbbra sem futtatja a készletet). Nem tartozik
ide: más tesztfájlok lassúsága.

## Decisions
- Kisebb árlista a két blokkban — mert a költség a 118 soros tábla újrarenderelése minden
  interakciónál (a gépelés nélküli, kattintós teszt is 5 s); nem per-teszt vagy globális
  timeout-emelés, mert az csak elfedi; nem a fájl szétvágása, mert a tesztenkénti idő nem
  változna; nem `user.type` → `fireEvent` csere, mert a gépelés nem a fő költség, és a valódi
  billentyű-interakció ellenőrzése gyengülne.

## Verification
- [ ] tests — a két blokk minden tesztje ugyanazt a megfigyelhető viselkedést ellenőrzi, mint eddig,
      és helyben tesztenként legfeljebb ~1,5 s (ma 2,5–5,6 s), így ~8× lassabb gépen is a 15 s alatt
      marad; a teljes vitest-készlet zöld
- [ ] typecheck/lint
- [ ] docs-check
