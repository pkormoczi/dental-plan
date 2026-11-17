# egyseges-ekezet-nelkuli-appnev
Type: feature
Source: fejlesztő döntése a v0.1.0-teszt.1 után (2026-11-17)
Target: master
Baseline: 03cf9baaaedb432513d3ad5991feff7c0a7ff0aa

## Goal
A telepített program neve Windowson is „Mandoki Dental” (Start menü, asztali parancsikon,
eltávolítási bejegyzés), ugyanúgy, mint Macen.

## Current state
- `app/electron-builder.json` `nsis.shortcutName` és `nsis.uninstallDisplayName`: „Mándoki
  Dental” — ez az egyetlen hely, ahol a két platform neve eltér; a `package.json` `productName`
  már „Mandoki Dental”.
- `app/electron/protocol.ts` fejléc-kommentje a két NSIS-felülírást írja le megjelenített névként.
- `app/electron/protocol.test.ts` „a productName ASCII, mert nem-ASCII bundle-névvel a macOS-es
  app indításkor összeomlik”.
- `docs/TELEPITES.md`: a Windows-szakasz „Mándoki Dental”-t ír (asztal/Start menü, eltávolítás), a
  Mac-szakasz külön magyarázza az ékezet hiányát; a cím „Mándoki Dental — telepítés”.
- `docs/FEATURES.md` bevezetője: „(„Mándoki Dental”, Macen ékezet nélkül)”; `docs/CHANGELOG.md`
  2026. november 17-i bejegyzése ugyanezt a kettősséget írja.
- A `mac-intel-tamogatas` terv ugyanezt a `electron-builder.json`-t és `TELEPITES.md`-t érinti
  (Mac-target, Mac-fájlnév) — más sorokban.

## Approach
- `electron-builder.json`: a két NSIS-névfelülírás törlődik; minden megjelenített név a
  `productName`-ből jön.
- `protocol.ts` kommentje a közös névre igazodik.
- `docs/TELEPITES.md`: a program neve mindenhol „Mandoki Dental” (a cím is); a Mac-szakasz külön
  ékezet-magyarázata törlődik.
- `docs/FEATURES.md` bevezetője és a `docs/CHANGELOG.md` az `update-changelog` szabályai szerint a
  közös nevet írja (azonos napon a meglévő bejegyzés a végső állapotot mondja).
- **Nem tartozik ide:** az appon belüli szöveg (ablakcím, fejléc, Kezdőlap) és a nyomtatvány — ott
  a márkanév ékezetes marad; a tartós azonosítók (`appId`, `package.json` `name`/userData-mappa,
  `app://` hoszt); a `productName` (már ékezet nélküli); a Mac-target.

## Decisions
- Egy forrás a telepítői névre: a `productName` — mert így a két platform nem csúszhat szét; nem
  a felülírások átírása ékezet nélküli értékre, mert az két helyen tartaná ugyanazt.
- Teszt őrzi, hogy a builder-config ne írjon felül megjelenített nevet a `productName`-től
  eltérően — mert a fejlesztő döntése az egységes viselkedés.

## Verification
- [ ] tests — a builder-config egyetlen platformon sem ad a `productName`-től eltérő megjelenített
      nevet; a meglévő „productName ASCII” teszt zöld
- [ ] `npm run test:electron` zöld
- [ ] typecheck/lint
- [ ] docs-check
- [ ] kézi (fejlesztő, Windows; a záró jelentés kézi blokkjába): a telepítő után a Start menüben és
      az asztalon „Mandoki Dental” áll; a v0.1.0-teszt.1 fölé telepítve nem marad régi
      „Mándoki Dental” parancsikon
