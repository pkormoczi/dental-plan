# Orvosi felhasználó-szimuláció — jelentés

```
Dátum: 2026-08-25
Forgatókönyv: zsufolt-reggel — nap indítása, félbehagyott piszkozat felismerése, vadonatúj páciens csak névvel, visszatérés telefon-megszakítás után
Eszköz: chrome-devtools MCP (izolált), 1440×900
Lefedett folyamatok: 1 (nap indítása, piszkozat felismerése/folytatása), 2 (új páciens gyors felvétele), 21 (visszatérés megszakítás után)
Bizonyosség-eloszlás: megfigyelt 2 / erős következtetés 0 / feltételezés 0
```

## 1. Napi munkamenet összefoglalója

A forgatókönyv indulásakor egy előkészített, tartalmas piszkozat várta a perszónát a Kezdőlapon (Rácz Ildikó, egy 20 000 Ft-os tétellel) — ezt a "Piszkozat folytatása" kártya egyértelműen felismerte és felkínálta, a doki tudatosan úgy döntött, egyelőre megtartja, és inkább egy vadonatúj pácienst vesz fel. Itt két, egymástól független súrlódás jelentkezett: a gyorsfelvétel-dialógusban begépelt név megszakításkor (navigáció) nyomtalanul elveszett, majd — súlyosabb módon — amikor a doki a frissen létrehozott, még terv nélküli páciens saját adatlapjáról indított új tervet, az alkalmazás megerősítés nélkül, csendben felülírta és véglegesen eldobta a korábban tudatosan megtartott Rácz Ildikó-piszkozatot. Ez utóbbi különösen éles kontrasztban áll azzal, hogy ugyanez a védelem a Kezdőlap "+ Új kezelési terv" gombjánál korábban helyesen működött (a doki ott kapott és el is utasított egy "Piszkozat felülírása" figyelmeztetést). A menet így egy megfigyelt, súlyos adatvesztési inkonzisztenciával zárult.

## 2. Legfontosabb megállapítások

### 1. Egy terv nélküli páciens "+ Új terv" gombja megerősítés nélkül, csendben felülírja bármely aktív piszkozatot

- Súlyosság: **blokkoló**
- Gyakoriság: **ritka, de reális** — pontosan akkor lép fel, amikor egy orvos egy megszakított, mentetlen terv közepén egy másik, még terv nélküli páciensen indít új tervet, ami éppen egy zsúfolt, megszakításokkal teli rendelési nap tipikus mintája
- Érintett folyamat: 1, 2, 21
- Bizonyosság: **megfigyelt** (a persona élőben reprodukálta; magam is élőben visszaellenőriztem — a Kezdőlap "Piszkozat folytatása" kártyája Rácz Ildikó helyett Fehér Bálintot mutatja, Rácz Ildikó 20 000 Ft-os tétele nyomtalanul eltűnt; a gyökérokot forráskódból is pontosan azonosítottam)
- Dedup: **ÚJ**
- Helyzet és reprodukció: a Kezdőlapon volt egy aktív, mentetlen piszkozat (Rácz Ildikó, "Gyökértömés eltávolítása /csatorna", 20 000 Ft). A perszóna a Kezdőlap "+ Új kezelési terv" → "+ Új páciens" útvonalon próbált új pácienst indítani — itt HELYESEN megjelent a "Piszkozat felülírása" AlertDialog ("Van mentetlen piszkozatod... a jelenlegi piszkozat elvész... Biztosan folytatod?"), amit a doki Mégse-vel elutasított, a piszkozat védelmében. Ezután a Páciensek lista "+ Új páciens" gyorsfelvételével létrehozott egy új pácienst (Fehér Bálint, terv nélkül), majd az ő saját adatlapján, a "Kezelési tervek" tab üres-állapotának "+ Új terv" gombjára kattintott. Ez a gomb **semmilyen megerősítést nem kért**, azonnal betöltötte a Terv adatai lépést egy vadonatúj, üres piszkozattal Fehér Bálint nevére — és a Kezdőlapra visszatérve a "Piszkozat folytatása" kártya immár Fehér Bálintot mutatta, Rácz Ildikó terve véglegesen eltűnt. Forráskódban pontosan azonosítva a gyökérokot: `app/src/pages/PatientDetailPage.tsx:180-192` `startFirstPlan()` közvetlenül hívja a `copyPlanIntoDraft(next, patient.dirName)`-t, **minden megerősítés-ellenőrzés nélkül** — szemben a `app/src/components/PlanVersionActionDialog.tsx` `usePlanVersionActions().inditas()` függvényével (ezt hívja a Kezdőlap "+ Új kezelési terv" gombja, valamint egy MÁR meglévő tervlánccal rendelkező páciens saját "+ Új terv" gombja is a `PatientPlanChains.tsx` fejlécében), ami minden alkalommal lefuttatja a `kellMegerosites(action, vanMentetlenPiszkozat)` ellenőrzést, és ha van aktív piszkozat, felugrasztja a figyelmeztető dialógust. A `vanMentetlenPiszkozat` (`app/src/state/AppState.tsx:421`) app-szintű, nem páciensfüggő állapot — tehát a védelemnek itt is ugyanúgy le kellett volna futnia, csak a `startFirstPlan()` egyszerűen sosem kérdezi meg.
- Orvosi elvárás: ha egy helyen a rendszer megvéd a piszkozat elvesztésétől, minden "új terv indítása" gombtól ugyanezt várom, függetlenül attól, melyik képernyőről indítom.
- Tapasztalt probléma: a két, egyformán "+ Új terv" feliratú gomb közül az egyik véd, a másik nem — ez nem következetes, és a felhasználó előre nem tudhatja, melyik "biztonságos".
- Napi hatás: egy egész reggeli/napi, még nem mentett munka (akár több fázis, több tétel) nyomtalanul, visszaállítási lehetőség nélkül elveszhet — a doki csak akkor venné észre, amikor a páciens előtt ülve keresné a korábban felvitt adatokat.
- Jelenlegi kerülőút: tudatosan mindig a Kezdőlap "+ Új kezelési terv" gombján keresztül indítani új tervet, soha nem közvetlenül egy még terv nélküli páciens saját adatlapjáról — ez azonban nem magától értetődő, és egy másik felhasználó (asszisztens, helyettesítő orvos) valószínűleg nem fedezné fel ezt a különbséget, mielőtt egyszer már veszítene valamit.
- Javasolt javítási irány: a `startFirstPlan()` (`PatientDetailPage.tsx`) is menjen át a meglévő `usePlanVersionActions().inditas({ kind: 'ujTerv', ... })` úton, vagy legalább hívja meg közvetlenül a `kellMegerosites`/`vanMentetlenPiszkozat` ellenőrzést és mutassa meg ugyanazt az AlertDialog-ot — egyetlen, közös védelmi út minden "új terv indítása" művelethez, nem négy, egymástól függetlenül karbantartott hely.
- Siker mércéje: egy terv nélküli páciens "+ Új terv" gombja is felugrasztja a "Piszkozat felülírása" megerősítést, ha van bárhonnan aktív, mentetlen piszkozat — ugyanúgy, mint a Kezdőlap gombja.

### 2. Az "+ Új páciens" gyorsfelvétel-dialógus elveszíti a begépelt nevet megszakításkor

- Súlyosság: **alacsony**
- Gyakoriság: **naponta**, ha megszakítás pont egy gyorsfelvétel közben történik
- Érintett folyamat: 2, 21
- Bizonyosság: **megfigyelt** (persona) + kód-megerősített (`app/src/pages/paciensek/UjPaciensDialog.tsx` — helyi `useState`, nincs draft-mentés; a fájl fejléc-kommentje explicit rögzíti: "semmi nem kerül a törzsadatba a Mentés gomb megnyomása előtt")
- Dedup: **ÚJ**
- Helyzet és reprodukció: a Páciensek lista "+ Új páciens" gyorsfelvétel-dialógusába a perszóna beírta a nevet ("Fehér Bálint"), majd — telefonhívást szimulálva — elnavigált a "Kezelések és árak" menüpontra mentés nélkül. Visszatéréskor a dialógus és a beírt név nyomtalanul eltűnt, a Páciensek lista változatlan "23 páciens" számot mutatott, semmi nem utalt a félbehagyott adatra.
- Orvosi elvárás: legalább valamilyen jelzés vagy megmaradó állapot, hasonlóan ahhoz, ahogy a nagy kezelési terv-piszkozat a Kezdőlapon "Piszkozat folytatása" kártyaként megjelenik.
- Tapasztalt probléma: a dialógus tartalma szótlanul elvész navigációra.
- Napi hatás: alacsony önmagában (egyetlen mező, a név, gyorsan újra begépelhető) — ez tudatos tervezői döntés eredménye (a dialógus szándékosan könnyűsúlyú, a teljes terv-workflow piszkozat-mechanizmusa nélkül, a "priceListAdmin/UjTetelDialog.tsx" mintáját követve), de a doki tapasztalata mégis valós súrlódás volt, és ha időközben már a telefonszámot/születési dátumot is beírta volna, azt is újra kellene kérdeznie/keresnie.
- Jelenlegi kerülőút: emlékezetből újra begépelni a nevet.
- Javasolt javítási irány: mivel csak rövid, kevés mezős adat veszhet el, nem feltétlenül szükséges a teljes autosave-mechanizmus — egy egyszerű "elvetnéd a bevitt adatot?" megerősítés navigáció előtt (a meglévő `DiscardChangesDialog` mintáján) arányos, olcsó javítás lehet.
- Siker mércéje: a dialógusból kinavigálva a doki explicit dönthet arról, hogy elveti-e a begépelt adatot, nem szótlanul vész el.

## 3. Nehezen felfedezhető vagy kihasználatlan funkciók

- A Kezdőlap "Piszkozat folytatása" kártyáján a "Piszkozat elvetése" gomb jól látható és egyértelmű volt — a perszóna nem próbálta ki (tudatosan megtartotta a piszkozatot), de a felirat és elhelyezés alapján magabiztosnak tűnt, hogy ez egy explicit, szándékos törlési út, nem véletlenül elérhető.

## 4. Fejlesztési lehetőségek

1. **Bizalom-növelés / adatintegritás** — a `startFirstPlan()` (`PatientDetailPage.tsx`) kösse be a meglévő piszkozat-felülírás-védelmet (1. megállapítás). Ez a legmagasabb prioritású tétel: egy már bevált, mindenhol máshol működő védelmi mechanizmus hiányzik egyetlen belépési pontról, és a hiánya csendes adatvesztéshez vezet.
2. **Gyors UX-javítás** — az "+ Új páciens" gyorsfelvétel-dialógus kapjon egy egyszerű "elvetnéd a bevitt adatot?" megerősítést navigáció előtt (2. megállapítás), a teljes piszkozat-mechanizmus bevezetése nélkül.

## 5. Ami jól működik

- A Kezdőlap "Piszkozat folytatása" kártyája azonnal, egyértelműen felismerte az aktív piszkozatot, a páciens nevével és az utolsó módosítás időbélyegével — a doki egy pillantással tudta, van folytatható munkája.
- A Kezdőlap "+ Új kezelési terv" gombja a tervezett módon működött: amikor a doki egy aktív piszkozat mellett új pácienst próbált indítani, helyesen megjelent a "Piszkozat felülírása" figyelmeztető dialógus, világos szöveggel és egyértelmű Mégse/Folytatás választással — ez pontosan az a védelem, aminek minden "új terv indítása" gombon működnie kellene (lásd 1. megállapítás).

## 6. Következő validációs kérdések

1. Előfordult-e már, hogy egy megszakítás után nem találta a korábban elkezdett tervét? Ha igen, emlékszik-e, melyik gombról indított új tervet közvetlenül előtte?
2. Mennyire jellemző, hogy egy vadonatúj páciens felvétele közben pont egy másik, félbehagyott terv van folyamatban a rendszerben?
3. Amikor egy gyorsfelvétel-dialógusba (pl. "+ Új páciens") csak a nevet írja be, majd megszakítják, hajlamos-e emlékezetből újra begépelni, vagy inkább papírra jegyzi fel előbb?
4. Mennyire tartja fontosnak, hogy egy ilyen rövid, egy-két mezős dialógus is emlékezzen a bevitt adatra, vagy elfogadható, hogy csak a teljes kezelési terv piszkozata véd?
5. Használja-e valaha más (asszisztens, helyettesítő kolléga) ugyanezt a felületet? Ha igen, ő is tudná-e, hogy melyik "+ Új terv" gomb "biztonságos"?
