# electron-csomagolas
Type: chore
Source: desktop-app-migration-plan-final.md §10.1 és §9.2

Az Electron-ablakból telepíthető csomag lesz `electron-builder`-rel, új `electron:package` scripttel.
Windows: NSIS, x64, aláíratlan (a SmartScreen-figyelmeztetés vállalt), és eltávolításkor a `userData`
is törlődik, mert a piszkozat valódi páciensadatot tartalmazhat. macOS: dmg arm64-re és x64-re,
ad-hoc aláírással; mellé egy `.command` script (`xattr -dr com.apple.quarantine`) és egy README a
lépésekkel: első indítás jobbklikk → Megnyitás, a script minden frissítés után újra futtatandó,
eltávolításkor a `userData` kézi törlése; Windowson a SmartScreen „További információ → Futtatás
mindenképp” útja. Nincs auto-updater és nincs fizetős code signing — a frissítés kézi. Függ az
`electron-hej-ablak`-tól.
