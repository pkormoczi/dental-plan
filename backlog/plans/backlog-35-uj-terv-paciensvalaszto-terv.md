# Backlog 35. tétel — Új terv páciensválasztó — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 35. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-011
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D17`/`D218`–`D227` a redesign saját D1–D606 számozásából valók — NEM
azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával.

**Függőség:** ez a tétel a 34. tétel (DP-010) 4. döntésében bevezetett
megosztott `legutobbAktivPaciensek()` helperre épül a recents
megjelenítéséhez (D224) — a 34. tétel elkészülte előfeltétele ennek.

## Probléma

A `NewPlanPage.tsx` (`/uj-terv`) "Meglévő páciens keresése" ága ma:
- a keresőmező NEM autofókuszban (`NewPlanPage.tsx:153–159`);
- 0 karakternél a TELJES pácienslistát mutatja (nem egy szűkített
  "recents" listát) — `filtered = patients.filter((p) => !q.trim() ||
  norm(p.nev).includes(norm(q)))` (`:67`);
- a rendezés MINDIG alfabetikus (`.sort((a, b) =>
  a.nev.localeCompare(b.nev))`, `:68`), sosem relevancia szerinti;
- **nincs semmilyen billentyűzet-navigáció** — a találatok sima `Button`-
  ok (`:186–197`), `onKeyDown` sehol a fájlban, tehát nyílbillentyű/Enter/
  Escape ma nem működik, csak egér (vagy böngésző-alap Tab+Enter);
- a "Vadonatúj páciens" gomb MÁR MA IS mindig látszik, a kereső
  tartalmától függetlenül (`:202–204`) — ez a rész MÁR MEGFELEL D227-nek.

A kiválasztás utáni navigáció (`/paciens`, azaz a "Terv adatai" lépés)
MÁR MEGFELEL D226-nak.

## Döntések

### 1. Kereső autofókusz

A keresőmező `autoFocus` propot kap, amint a "Meglévő páciens keresése"
ág aktívvá válik.

**Miért:** D17 explicit ezt kéri; ma hiányzik, egyszerű, kockázatmentes
pótlás.

### 2. 0–1 karakternél recents, 2+ karakternél élő keresés

A 0–1 karakteres állapotban a lista a 34. tétel (DP-010) megosztott
`legutobbAktivPaciensek()` helperéből jön (max 5, D224), NEM a teljes
pácienslistából. 2+ karaktertől a MEGLÉVŐ `norm()`-alapú szűrés fut
tovább, változatlanul.

**Miért:** D223 explicit ezt a kétállású viselkedést írja elő; a teljes
lista 0 karakternél ma megtévesztő "recents"-nek tűnhetne, miközben csak
alfabetikus — a redesign tudatosan elválasztja a kettőt.

### 3. Relevancia szerinti rendezés 2+ karakternél, azon belül alfabetikus

A 2+ karakteres találati lista rendezése relevancia szerint változik
(pl. a keresett string-re kezdődő név-egyezés a lista elején, a
belsejében egyező utána), holtversenynél alfabetikusan — a MAI, tisztán
`localeCompare`-alapú rendezés helyett.

**Miért:** D221 explicit ezt kéri. **Elvetett alternatíva:** a mai tiszta
alfabetikus rendezés megtartása — elvetve, mert D221 szövege konkrétan
"relevancia szerint, azon belül alfabetikusan" fogalmat használ, ami
kifejezetten a prefix-egyezés előresorolását jelenti.

### 4. Billentyűzet-navigáció: az `ItemPicker.tsx` mintájának adaptálása

A találati lista (és a recents lista) kap egy `onKeyDown` kezelést, az
`app/src/pages/planEditor/ItemPicker.tsx` MÁR BEVÁLT gépel→nyíl→Enter/Esc
ciklusának mintájára (`ItemPicker.tsx:129–159`: `ArrowDown`/`ArrowUp`
kiemelt elem mozgatása, `Enter` kiválasztás, `Escape` törlés/zárás).

**Miért:** D220 ezt kéri, és van rá bevált, ugyanebben a repóban élő
minta — nem kell a nulláról kitalálni a billentyűzet-szemantikát.
**Elvetett alternatíva:** egy generikus Radix `Select`/`Combobox`
komponensre váltás — elvetve, mert a `@radix-ui/themes@3`-ban nincs
ilyen komponens (a `docs/07-felulet-rendszer.md` már megállapítja ezt a
lenyíló panel mintájánál), és az `ItemPicker` mintája már bizonyítottan
működik ugyanebben a designrendszerben.

### 5. No-match állapot: közvetlen `Új páciens` lehetőség

Ha a 2+ karakteres keresés nulla találatot ad, a lista helyén egy
közvetlen "Új páciens" opció jelenik meg (nem csak a kereső alatti,
mindig látható másodlagos gomb) — az `ItemPicker` "nulla találatnál az
Enter egyedi sort vesz fel" mintájának szemléletében, de itt a
"Vadonatúj páciens" ágat indítja el a begépelt névvel előtöltve.

**Miért:** D222 explicit ezt kéri. A MÁR MEGLÉVŐ, mindig látható
"Vadonatúj páciens" gomb (D227, változatlan) emellett is megmarad — ez a
kiegészítés csak azt teszi gyorsabbá, amikor a doki már tudja, hogy nincs
találat, mert épp begépelte a nevet.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A `legutobbAktivPaciensek()` helper és a mögötte álló
  `utolsoAktivitas` adatmodell — 34. tétel (DP-010), ez a tétel csak
  FELHASZNÁLJA.
- A "Vadonatúj páciens" ág tényleges viselkedése (hogy MOST valódi
  Patient-rekordot hoz-e létre rögtön) — 36. tétel (DP-012); ez a tétel
  csak a SELECTOR UX-ét érinti, nem a mögötte induló flow-t.
- Duplikáció-felismerés a kereső/kiválasztás közben — 36./37. tétel
  (DP-012/DP-013); a selector maga nem dönt duplikációról, csak megjelenít
  és navigál.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/NewPlanPage.tsx:67–68,153–159,186–197` — autofókusz,
  recents/keresés kettéválasztás, relevancia-rendezés, no-match ág.
- Új `onKeyDown` kezelés a találati listán, az `ItemPicker.tsx:129–159`
  mintájára.
- `app/src/domain/legutobbAktivPaciensek.ts` (34. tétel) — import és
  hívás recents-hez.

## Tesztelés (irányadó, nem kimerítő)

- A "Meglévő páciens keresése" ág megnyitásakor a kereső automatikusan
  fókuszban van.
- 0–1 karakternél a lista pontosan a legutóbbi aktivitású (max 5)
  pácienst mutatja, nem a teljes listát.
- 2+ karakternél a prefix-egyezésű nevek megelőzik a belső-egyezésűeket.
- Nyíl le/fel mozgatja a kiemelést, Enter kiválasztja a kiemeltet,
  Escape töröl/bezár.
- Nulla találatnál egy közvetlen "Új páciens" opció jelenik meg a
  begépelt névvel előtöltve, a mindig látható "Vadonatúj páciens" gomb
  mellett.
- Kiválasztás után a `/paciens` (Terv adatai) lépésre navigál,
  változatlanul.
