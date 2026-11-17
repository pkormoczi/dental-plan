// Tartós nevek. Az `app://<hoszt>` origin a renderer `localStorage`-partíciójának kulcsa, a
// userData-mappa pedig az, ahol ez a partíció a lemezen él: bármelyik átnevezése csendben
// kiüríti a piszkozatot és a demó-adatot. A megjelenített név ezektől független: minden
// platformon egyedül a `package.json` `productName`, ami ékezet nélküli -- nem-ASCII
// `CFBundleName`-mel az Electron macOS-en indításkor összeomlik.

export const APP_PROTOKOLL = 'app';
export const APP_HOSZT = 'mandoki-dental';
export const APP_ORIGIN = `${APP_PROTOKOLL}://${APP_HOSZT}`;

// Egyezik a `package.json` `name`-jével: az NSIS-eltávolító `deleteAppDataOnUninstall`
// mellett a `$APPDATA\<package name>` mappát törli, ezért a piszkozat csak így tűnik el vele.
export const USER_DATA_MAPPA = 'mandoki-dental';

// Egyezik az `electron-builder.json` `appId`-jével. Windowson ebből lesz a telepítés
// eltávolítási kulcsa és a tálcás csoportosítás azonosítója: átnevezése egy második, párhuzamos
// telepítést hozna létre a régi mellé.
export const APP_ID = 'hu.drmandoki.kezelesiterv';
