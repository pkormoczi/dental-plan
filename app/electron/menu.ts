import type { MenuItemConstructorOptions } from 'electron';

// macOS-en a vágólap-gyorsbillentyűk (Cmd+C/V/X/A) csak menüszerepen át működnek, ezért ott a
// Szerkesztés menü nem dísz. Újratöltés és DevTools csak fejlesztői indításnál: a doki egy
// véletlen Ctrl+R-rel nem dobhatja el az oldal állapotát.
export function menuSablon(opts: { platform: NodeJS.Platform; appNev: string; fejlesztoi: boolean }): MenuItemConstructorOptions[] {
  const sablon: MenuItemConstructorOptions[] = [];
  if (opts.platform === 'darwin') {
    sablon.push(
      {
        label: opts.appNev,
        submenu: [
          { role: 'about', label: 'Névjegy' },
          { type: 'separator' },
          { role: 'hide', label: 'Elrejtés' },
          { type: 'separator' },
          { role: 'quit', label: 'Kilépés' },
        ],
      },
      {
        label: 'Szerkesztés',
        submenu: [
          { role: 'undo', label: 'Visszavonás' },
          { role: 'redo', label: 'Ismét' },
          { type: 'separator' },
          { role: 'cut', label: 'Kivágás' },
          { role: 'copy', label: 'Másolás' },
          { role: 'paste', label: 'Beillesztés' },
          { role: 'selectAll', label: 'Összes kijelölése' },
        ],
      },
    );
  }
  sablon.push({
    label: 'Nézet',
    submenu: [
      { role: 'zoomIn', label: 'Nagyítás' },
      // A `zoomIn` alapgyorsítója (Plus) magyar kiosztáson Shift-et kér, laptopon numerikus
      // billentyűzet sincs mindig -- a rejtett párok a megszokott Ctrl+= és numerikus +/- utat adják.
      { role: 'zoomIn', accelerator: 'CommandOrControl+=', visible: false },
      { role: 'zoomIn', accelerator: 'CommandOrControl+numadd', visible: false },
      { role: 'zoomOut', label: 'Kicsinyítés' },
      { role: 'zoomOut', accelerator: 'CommandOrControl+numsub', visible: false },
      { role: 'resetZoom', label: 'Eredeti méret' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Teljes képernyő' },
    ],
  });
  if (opts.fejlesztoi) {
    sablon.push({
      label: 'Fejlesztés',
      submenu: [{ role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }],
    });
  }
  return sablon;
}
