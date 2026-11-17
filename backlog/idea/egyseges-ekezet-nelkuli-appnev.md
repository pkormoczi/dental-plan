# egyseges-ekezet-nelkuli-appnev
Type: feature
Source: fejlesztő döntése a v0.1.0-teszt.1 után (2026-11-17)

Ma a telepített program neve platformonként eltér. Windowson a Start menü, az asztali
parancsikon és az eltávolítási bejegyzés „Mándoki Dental”, az `electron-builder.json`
`nsis.shortcutName`/`uninstallDisplayName` felülírása miatt. Macen „Mandoki Dental”, mert ott az
ékezetes bundle-névvel az Electron összeomlik. A fejlesztő döntése: mindkét telepítő és program
egységesen „Mandoki Dental” legyen, eltérő viselkedés nélkül. Elvárt: a két NSIS-felülírás
megszűnik, a név mindenhol a `productName`-ből jön; a `docs/TELEPITES.md`, a
`app/electron/protocol.ts` kommentje, a Funkciók bevezetője és a változásnapló a közös nevet
írja. Nem tartozik ide az appon belüli szöveg (ablakcím, fejléc) és a nyomtatvány: ott a márkanév
ékezetes marad. A tartós azonosítók (`appId`, userData-mappa, `app://` hoszt) sem változnak.
