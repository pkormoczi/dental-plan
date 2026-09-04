# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo elrendezés

`app/` a tényleges Vite + React + TypeScript alkalmazás — az egyetlen könyvtár,
amit szerkesztünk. Minden más (`docs/`, `backlog/`, `data/`, `assets/`) csak
referencia és dokumentáció. Az `assets/` alatti anyag a navy eredeti (PNG +
eredeti PDF-ek) — az app egy átszínezett másolatot használ belőle.

**A `docs/` és a `backlog/` szerepe élesen elválik.** Minden tartósan
érvényes, élő dokumentáció és döntés a `docs/`-ban él (funkcionális/
nyomtatvány/technológia szakaszok) — ez az egyetlen forrás, aminek
self-containednek kell maradnia. A `docs/01-attekintes-es-dontesek.md`
`D<szám>` döntéstáblája **lezárt, történeti napló** — nem bővül, és nem
hivatkozási cél (lásd a fájl elején lévő megjegyzést). A `backlog/` csak
munkaközi állapot: nyitott tervek és a lezárási napló, folyamatosan mozgó
tartalommal (egy nyitott tétel lezáráskor eltűnik a `BACKLOG.md`-ből és
átkerül a `done/`-ba). **Forráskód-kommentek soha nem hivatkozhatnak a
`backlog/` mappa semelyik fájljára** — sem a `BACKLOG.md`-re, sem a
`plans/`-ra, sem a `done/`-ra, nyitott vagy lezárt tételtől függetlenül —
és **soha nem hivatkoznak `D<szám>` döntési azonosítóra sem** (se meglévőre,
se újra). Ha egy kódrészlet mögötti döntést dokumentálni kell, az anchor
kizárólag egy néven megnevezett `docs/0X` szakasz lehet (pl. „lásd
`docs/02-domain-modell.md` § Fogszám kezelés"); ha a döntés még nincs
migrálva `docs/`-ba (a tétel még nyitott), a komment a WHY-t írja le
közvetlenül, path-hivatkozás nélkül — ne mutasson előre egy még be nem zárt
backlog-tételre.

A márka a klinika nyilvános honlapját (drmandoki.hu) követi (`#976445` /
`#f77409`), forrása `app/src/design/tokens.ts` — lásd
`docs/04-nyomtatvany-spec.md` "Márka" és `docs/07-felulet-rendszer.md` a
teljes felület-szabályrendszerért (kötelező, nem javaslat).

A gyökérben korábban volt egy `ui/` mappa (`PlanEditor.jsx`, `PriceListAdmin.jsx`,
`PrintPreview.jsx`, `tokens.js`) kattintható UX-prototípusként — ez volt az
elrendezés/interakció referenciája, mielőtt az `app/` alatti végleges képernyők
(`PlanEditorPage.tsx`, `PriceListAdminPage.tsx`, `PreviewPage.tsx`) elkészültek.
Miután a segédfüggvényei (`formatMoney`, `norm`, `parseTeeth`, `basePrice`) 1:1
portolva lettek az `app/src/domain/` és `app/src/design/` alá, a mappa elavult, és
törölve lett — a git history-ban elérhető, ha valaha vissza kellene nézni rá.

## Két fázisú build

1. **Mockup** (`app/`, jelenleg ez létezik) — GitHub Pages-re deployolt demó,
   `localStorage`-alapú `DemoStorage` a `PlanStorage` interface mögött, valódi
   letölthető PDF. Cél: a doki validálja a UX-et, mielőtt a fájlrendszeres verzió
   megépül. Nincs benne valódi páciensadat-perzisztencia — ez szándékos, demó adat.
2. **Végleges alkalmazás** — a `PlanStorage` interfészt egy `FileSystemStorage`
   implementáció váltja (File System Access API), `pdf-lib`-bel a `terv.json`
   PDF-be ágyazásával. A `PlanStorage`-on kívül eső kód (domain logika, UI,
   `paths.ts`) változatlan marad — ezért ne kerülje meg senki az interfészt.

## Architektúra

Statikus React SPA a doki gépén. **Nincs backend, nincs adatbázis, nincs
szerveroldali páciensadat** (D2) — a kezelési terv GDPR 9. cikk szerinti különleges
adatot tartalmaz, ezért ez nem implementációs részlet, hanem tervezési korlát.

- A doki egyszer kijelöl egy **gyökérmappát** — ez a teljes rendszerállapot,
  nincs máshol állapot (D3), Google Drive-val szinkronizálva.
- Fájlrendszer-hozzáférés a `PlanStorage` interface mögött.
- Piszkozat-autosave egy külön, a `PlanStorage` MELLETTI `DraftStorage`
  interface mögött (mockupban `localStorage`, lásd
  `app/src/storage/DemoDraftStorage.ts`; a végleges alkalmazásban IndexedDB)
  — soha nem system of record, csak a félbeszakadt szerkesztés cache-e.
- PDF generálás kliensoldalon, a páciensadat nem mehet szerverre.

Részletek (stack, `PlanStorage` interface, PDF generálás, mappastruktúra,
sémaverziózás, hosztolás): `docs/05-technologia.md`.

## Sérthetetlen szabályok

Ezek jogi vagy adatintegritási következménnyel járnak — nem stíluskérdés.

| Szabály | Miért |
|---|---|
| Verziómappát soha nem írunk felül; módosításkor mindig új `_v<n+1>` | D4 — aláírt dokumentumot nem lehet visszamenőleg átírni; mellékesen ez védi a Drive-ot a `conflicted copy`-tól |
| Ártétel-`id`-t soha nem hasznosítunk újra; törlés helyett `aktiv: false` | D17 — a régi tervek évek múlva is értelmezhetők maradnak |
| Pénz **egész számként**, a pénznem alapegységében (HUF: forint, EUR: **cent**) | Nincs lebegőpontos kerekítési hiba egy szerződéses összegben |
| Mentett tervet soha nem rajzolunk újra az aktuális árlistából | D7 — a soron `nevSnapshot` + `listaEgysegar` a pillanatkép, ez az igazság |
| `osszesitok` a fájlból számít igaznak, eltérés esetén figyelmeztetni kell | Az aláírt papírral kell egyeznie, nem az újraszámolt értékkel |
| Kedvezmény csak a szerkesztőben látszik, a nyomtatványon **nem** | D9 |
| A sor `savos` mezője (nem az árlistai `SAVOS` ártípus!) dönt a nyomtatvány `*` + lábjegyzetéről, soha nem csupasz fix szám | D15 — jogi védelem: fix számként kötelező érvényű ajánlattá válna. A szerkesztőben soronként kézzel is átbillenthető — a sor lehet fix árú tételből, de a doki jelölheti becsültnek, ha a mennyiség csak a kezelés során derül ki |
| `null` ár egy pénznemben ≠ `0` — a tétel abban a pénznemben nem ajánlható, a keresőben sem jelenik meg | `02-domain-modell.md` |
| Minden JSON `schemaVersion`-nel indul; magasabb verzió észlelésekor **a betöltést meg kell tagadni**, érthető üzenettel | D18 — ezek a fájlok évekig élnek a Drive-on |
| Placeholder-jelölésű vagy üres nyilatkozat mellett a nyomtatvány nyilatkozat + aláírás oldala nem kerülhet PDF-be — a „csak ajánlat" mód kényszerített, felülírás nélkül | D23 — jogi védelem: a jogász által „még nincs lezárva" jelöléssel ellátott, vagy a doki által kiürített szöveg nem kerülhet aláírásra. Az `isPlaceholderTemplate()` (`app/src/domain/templates.ts`) az EGYETLEN hely, ahol ez eldől |
| Korábbi terv új verzióra nyitásakor a dátumbélyeg (`keltezes`/`ervenyesIg`) a betöltés pillanatában íródik (`frissDatummal`), soha nem véglegesítéskor | D22 — különben a mentett JSON és a már renderelt PDF-blob dátuma szétcsúszik, vagy egy lejárt keltezésű ajánlatot írnak alá |
| Páciensmappa-névben az **ékezetek maradnak**, nincs transzliteráció; csak a tiltott karaktereket (`/ \ : * ? " < > \|`) kell cserélni; nevek rövidek (Windows 260 karakteres útvonalkorlát) | A doki a Fájlkezelőben keres rájuk névre |
| A `DraftStorage` (piszkozat-autosave) nem válhat system of recorddá | Csak piszkozat-cache egy félbeszakadt tervhez; mockupban `localStorage`, véglegesben IndexedDB |
| `@react-pdf/renderer` esetén **Unicode fontot kell regisztrálni** (pl. Inter, Source Sans, Noto Sans) | A beépített Helvetica nem tartalmazza az `ő`/`ű` karaktereket — ez csak a végleges PDF-en látszik, a HTML előnézeten nem |
| `#f77409` (a márka narancsa) **soha nem lehet szövegszín** | Fehéren 2,82:1, kis méretben olvashatatlan; csak díszítővonalra való. A fogtérkép saját, kezelés-kategóriánkénti palettát használ (`design/treatmentVisuals.ts`), nem ezt a színt |
| A `Tetel.leiras` hiányzó német fordítása némán elmarad a nyomtatványról, nem esik vissza magyarra | D27 — ellentétben a `nevSnapshot`-tal: a leírás kiegészítő tartalom, egy vegyes nyelvű nyomtatvány rosszabb lenne, mint a hiánya |
| A `paciens.json` és a `terv-cimke.json` kizárólag azonosító-/kereső-index és szervezési metaadat — soha nem system of record, sosem írhatja felül a `terv.json` `paciens` blokkját | D29 — a terv tartalmi igazsága marad a pillanatkép (D7); a `paciens.json` `nev`-je minden mentéskor frissül, de ez csak a legutóbb mentett terv `paciens.nev`-jének tükre |
| A `paciens-adatok.json` (ELLENTÉTBEN a `paciens.json`/`terv-cimke.json`-nal) valódi system of record a saját mezőire — nincs automatikus szinkron a `terv.json` `paciens` blokkjával egyik irányban sem, egy konkrét terv adatlapján tett módosítás soha nem írja át, és fordítva | D33 — a `terv.json` `paciens` blokkja pillanatkép marad (D7); egy automatikus szinkron összemosná "mit tartalmazott ez a konkrét, esetleg aláírt ajánlat" és "mi a páciens jelenleg ismert adata" fogalmát |
| Az árlista `arlistaVerzio` mezője az Árlista admin MINDEN mentésekor a mai napra áll, mezőnkénti különbségtevés nélkül | D30 — a nyomtatvány lábléce ebből mondja, „melyik árlistából készült"; egy befagyott érték hamis audit-adat lenne vitánál. A már mentett terveken lévő érték ettől függetlenül pillanatkép marad (D7) |
| A `PlanStorage`-t fogyasztó `savePriceList`/`saveSettings` kizárólag updatert fogad, sosem kész objektumot; a memóriabeli állapot a mentés előtt, szinkron frissül, és hibára nem gördül vissza | D31 — a render-idejű closure-be zárt régi állapot két gyors egymás utáni szerkesztésnél némán eldobja az egyiket a doki törzsadatában (árlista, rendelő-adat); a `FileSystemStorage`-váltás alatt a ma kicsi versenyablak nagyságrendekkel tágul |
| Páciens nem törölhető, ha van véglegesített (`statusz === 'VEGLEGES'`) terve, rá mutató aktív mentetlen piszkozata, vagy olvashatatlan terv-lánca/verziója | D50 — egy aláírt/kiadott dokumentum vagy egy folyamatban lévő szerkesztés mögül a törlés adatvesztést jelentene; a `deletePatient` a teljes páciensmappát véglegesen elviszi, nincs „kuka” |
| A terv `ervenyesIg` mezője soha nem maradhat üresen | D62 — üres érték a `formatLongDate`-en át „Invalid Date”-ként kerülne egy szerződéses dokumentumra; a „Terv adatai” lap Dátumok szekciója a mező elhagyásakor automatikusan visszaállítja az alapértékre |
| A terv `elolegOsszeg` mezője soha nem haladhatja meg a fizetendőt egy véglegesített terven, és soha nem vágódik le némán | D66 — a százalék-alapú, strukturálisan garantált `előleg ≤ fizetendő` védelem megszűnt az abszolút összegre váltáskor; a véglegesítés-őr kemény blokkja váltja ki, a doki tudatos rendezését várva, nem automatikus levágást |
| A véglegesítés blokkolva, ha a terv `orvos`-a üres vagy nem szerepel a jelenleg AKTÍV orvosok között | D68 — az aláírás-blokkban szereplő név jogilag releváns; egy már véglegesített terv `plan.orvos` név-pillanatképét ez visszamenőleg nem érinti (D7) |
| Sem a sor-, sem a tétel-szintű, sem a terv-szintű (`kedvezmenyOsszeg`/`elolegOsszeg`) ár/összeg SOHA nem számolódik át automatikusan a két pénznem között; a `Sor.masikPenznemAr` és a `Plan.masikPenznemOsszegek` kizárólag a pénznemváltás munkaállapota, sosem system of record egyetlen renderelt/nyomtatott értékhez sem | D11/D71 — minden HUF/EUR érték egymástól függetlenül, kézzel megadott; egy automatikus árfolyam-átszámítás vagy a stash-mező nyomtatványon való feltűnése a pillanatkép-elvet (D7) sértené |
| Egy kézzel gépelt szöveg nyelvi mismatch-ét (`nevNyelv`/`leirasNyelv`/`megnevezesNyelv`/`megjegyzesNyelv`) KIZÁRÓLAG az explicit „Nyelv ellenőrizve” akció oldja fel — a szöveg szerkesztése, egy teljes (akár helyes) fordítás a másik nyelvre, és a dokumentumnyelv puszta váltása sosem | D72 — a páciens által aláírt dokumentumon egy egyszerű szerkesztés nem bizonyítja, hogy a doki ténylegesen ellenőrizte a szöveg nyelvi helyességét; nincs „jelentős változás” heurisztika |
| A PDF-előnézet render-hibája esetén sem letölteni, sem véglegesíteni nem lehet, amíg a hiba fennáll — az utolsó sikeres PDF csak beszürkítve látható, „Újrapróbálás” akcióval | D73 — a `usePDF()` hibán át megőrzi a korábbi `url`-t/`blob`-ot; letöltésre engedve egy a képernyőn látott tervvel már nem egyező PDF hagyhatná el a gépet |
| Egy tartósan mentett verzió (sikeres `savePlan`+`loadPlan`) UTÁNI piszkozat-takarítási hiba SOHA nem minősül „a mentés nem sikerült"-nek — a sikerképernyő ekkor is megjelenik, a takarítás hibája legfeljebb halk jelzés | D74 — a doki különben egy valójában sikeresen, tartósan mentett dokumentumot hinne elveszettnek, és egy fölösleges újrapróbálkozással egy `_v<n+1>` duplikátumot hozna létre (D4) |
| Egy VÉGLEGESÍTETT terv `csakAjanlat` mezője azt rögzíti, hogy a ténylegesen kiadott PDF tartalmazta-e a nyilatkozat + aláírás oldalt — a placeholder-jelölésű nyilatkozat miatti kényszer (D23) a piszkozatban sosem íródik a mezőbe, csak véglegesítéskor | D75 — enélkül egy placeholder miatt kényszerítve, aláírás nélkül kiadott verzió a mentett fájlban tévesen „teljes dokumentum"-ként (`csakAjanlat: false`) szerepelne, és a verziósor jelvénye (D558) pontosan azon az eseten hallgatna, ahol a legkevésbé engedhető meg a tévedés |
| Német nyelvű terven a véglegesítés blokkolva, ha egy látható sor neve nem igazoltan németül van (sem árlistai `nev.de`-t nem követ, sem D72 szerint igazoltan `de`-re írt kézi szöveg), vagy ha a fogtérkép-legendán ténylegesen megjelenő kategóriának nincs `nev.de`-je | D77 — aláírandó német dokumentumon lefordítatlan magyar tételnév/kategórianév jogilag/kommunikációsan nem elfogadható |
| A fizetési feltételek/garancia szakasz placeholder-jelölésű vagy üres szövege a címével együtt kimarad a nyomtatványból, sosem kerül nyers `[PLACEHOLDER …]` szöveg éles PDF-re | Egy jogilag még le nem zárt, helykitöltő szöveg egy aláírandó/kiadott dokumentumon jogi kockázat — a `sablonNyomtathato()` (`app/src/domain/templates.ts`) dönti el, a véglegesítés-őr pedig puha checklist-tétellel jelzi a dokinak, mely szakaszok maradnak ki |
| Minden új tervet indító akció a megosztott piszkozat-felülírás-őrön megy át; mentetlen piszkozat mellett megerősítés nélkül egyik sem fut | A piszkozat sosem került fájlba — egy megkerült őr csendes, visszafordíthatatlan adatvesztés |
| Egy meglévő páciensmappához kötött piszkozat Terv adatai lapján a Név mező PONTOS egyezése egy MÁSIK, létező páciens nevével kemény véglegesítés-blokk, és letiltja a piszkozat → törzsadat írási utakat (mindkét kézi gomb, a lépés-elhagyási prompt ajánlata) — a törzsadat → piszkozat irány érintetlen | A terv a kötött mappa, azaz egy MÁSIK páciens azonosító adatai (telefon/e-mail/lakcím/TAJ) mellé, de a beírt, idegen névvel mentődne — GDPR 9. cikk szerinti különleges adatot érintő azonosítási kollízió egy aláírásra kész dokumentumon |

A fenti táblázat data-/jogi-integritási szabályokat sorol. A felület
kinézetére és viselkedésére (színek, komponensek, billentyűzet,
akadálymentesség) vonatkozó, ugyanígy kötelező szabályok külön fájlban:
`docs/07-felulet-rendszer.md`.

## Böngésző-automatizálás — nem tárgyalható

A chrome-devtools MCP KIZÁRÓLAG izolált módban futhat.

TILOS a configba kerülnie: --autoConnect, --browserUrl, vagy --user-data-dir
a fejlesztő valós Chrome profiljára mutatva.

TILOS javasolni vagy megkísérelni a futó Chrome példányhoz csatlakozást,
és tilos remote debuggingot bekapcsolni bármilyen böngészőben.

Ha egy feladat látszólag valós profilt igényelne (bejelentkezett munkamenet,
korábban megadott mappa-engedély), NE kerüld meg. Jelezd, hogy ez a
korlátozás miatt nem megy, és javasolj alternatívát a PlanStorage
teszt-implementációval.

Ennek a szabálynak a kikényszerítési pontja a követett, verzió-pinnelt
`.mcp.json` (`--isolated`). A vitest-készlet strukturálisan nem elérhető
rétegeinek (kontraszt, `controlBorder`, valódi PDF, canvas→PNG fogtérkép,
`paint-order`, Radix popover-geometria) böngészős ellenőrzését a
`.claude/skills/browser-validation/` skill végzi — kézzel indítva, sose
automatikusan.

## Meglévő segédfüggvények — használd, ne írd újra

Ezeket ne írd újra: `app/src/CLAUDE.md` sorolja fel a `domain/`, `design/`,
`pdf/`, `storage/`, `components/`, `pages/` és `state/` alatti, már meglévő
segédfüggvényeket és a hívóikat, kategóriánként (formázás, fogtérkép,
piszkozat-perzisztencia, nyelv/pénznem, véglegesítés-őr stb.). Az a fájl
automatikusan betöltődik, amint egy munkamenet `app/src/` alatti fájllal
dolgozik — nem kell ide duplikálni.

## Domain szókincs

A JSON sémák mezőnevei magyarul vannak, és ezek **a lemezre írt séma kulcsai** — ne
fordítsd le őket kódban: `fazisok`, `sorok`, `tetelek`, `kategoriak`, `nevSnapshot`,
`listaEgysegar`, `tenylegesEgysegar`, `mennyiseg`, `fogak`, `osszesitok`,
`arlistaVerzio`, `aktiv`, `gyakori`, `paciensId`, `tervCim`, ártípus `FIX`/`SAVOS`, tervstátusz
`PISZKOZAT`/`VEGLEGES`.

## A UX kritikus pontja

A tételfelvitel billentyűzetes ciklusa dönti el, hogy az app gyorsabb-e az Excelnél:
**gépel → `↑`/`↓` navigál → `Enter` hozzáad → a kereső kiürül és visszakapja a
fókuszt → gépel tovább**, egérhasználat nélkül. Ezt kell elsőként tesztelni, a PDF
generálás előtt. A kereső search-only, nincs kategória böngésző (D19); ékezetfüggetlen
(`norm()`); csak `aktiv: true` tételeket listáz — a pénznem NEM szűr a találatokra
(D71), egy a terv pénznemében beárazatlan tétel is `—` listaárral, kézi ajánlati árral
felvehető. Mindkét nyelven keres (`nev.hu` és `nev.de`) függetlenül a terv nyelvétől —
a doki magyar, magyarul gépel akkor is, ha német ajánlatot állít össze (D21). A tétel
akkor is találat, ha nem a saját neve, hanem a kategóriájának neve illeszkedik —
lásd `docs/03-funkcionalis-spec.md` § Tételkereső.

## Adat és ismert hiányok

`data/arlista.seed.json` = 118 tétel, 13 kategória, az eredeti Excel `Arlista`
lapjából importálva. A tényleges, folyamatosan változó állapot (mi van
lektorálva, mi van bekategorizálva, hány tétel kapott `gyakori` jelölést)
**a `backlog/BACKLOG.md` „24. tétel"-jében él, ne itt** — ez a lista gyorsan
elavulna, mert a doki az adminban éppen ezt takarítja.

A hiányzó/lektorálatlan tartalom **nem blokkolja** a német nyelv
kipróbálását (D21): hiányzó `de` név esetén magyar névre esik vissza `HU`
jelöléssel, hiányzó ár esetén a Terv adatai lap előre jelez. A
Beállítások számszerűsíti a készültséget (`lefedettseg()`).

## Komment-szabályzat

- Ne írj magyarázó kommentet olyan kódrészhez, ami a saját nevéből/
  szerkezetéből egyértelmű. A "mit csinál" típusú kommentet ne írd le
  még akkor sem, ha "hasznosnak" tűnik írás közben.
- Kommentet csak akkor írj, ha WHY-t vagy nem triviális döntést közöl:
  miért ezt a megoldást választottuk (nem a nyilvánvalót), milyen
  invariánst nem szabad megsérteni, milyen gotcha/workaround van
  mögötte, vagy mit nem szabad módosítani X nélkül.
- Meglévő kommentet ne módosíts egy nem kapcsolódó változtatás
  mellékhatásaként. Csak akkor nyúlj hozzá, ha a komment által
  állított tény ténylegesen hamissá vált a kódváltozás miatt.
- Indoklás: minden komment karbantartási költség (a jövőbeli
  session-öknek minden olvasásnál be kell tölteniük, és
  szinkronban kell tartani a kóddal) — ha nem hordoz új
  információt a kód szerkezetén felül, ne írd meg.
- Kommentbe soha nem kerül döntési azonosító (`D<szám>`, `DP-<szám>`) és
  backlog-tételszám sem. A komment vagy a lokális WHY-t írja le közvetlenül,
  vagy egy néven megnevezett `docs/0X` szakaszt nevez meg — sosem egy
  azonosítót, amit a döntéstáblában kellene visszakeresni.

Az architekturális/tervezési döntések forrása a `docs/*.md` fájlokban van
(ADR-ek és döntési dokumentumok), NEM a forráskód kommentjeiben. A
`docs/01-attekintes-es-dontesek.md` `D<szám>` döntéstáblája lezárt,
történeti napló — a jelenleg érvényes szabályok prózaként a megfelelő
`docs/02`–`07` élő dokumentumban élnek; egy-egy nyitott funkció tervezési
háttere külön fájlban, `backlog/plans/backlog-<n>-<cim>-terv.md` néven.
Amikor egy modul vagy komponens "miért így van megcsinálva" kérdés merül
fel, először nézd meg a `docs/` és a `backlog/` könyvtárat, mielőtt
találgatnál vagy rákérdeznél.

## Backlog-tétel lezárása

**A `backlog/done/` mappára és a benne lévő fájlokra sehonnan sem szabad
hivatkozni** — sem `docs/*.md`-ből, sem forráskódból, sem ebből a
fájlból. Kivétel: a `backlog/BACKLOG.md` NYITOTT tételeinek `**Terv:**`
sora a még nyitott (a `backlog/plans/` alatt élő) tervfájlra mutathat —
ez lezárásig élő navigáció, és lezáráskor a 4. lépéssel együtt, magával a
tétellel tűnik el, nem marad dangling pointerként.

Egy backlog-tétel megvalósítása után ezt a sorrendet kell követni,
ugyanabban a körben, nem később:

1. **Lezárás, amint a tétel eldöntött hatóköre kész.** Amint a tétel
   eldöntött munkája (jellemzően a kódrész) elkészült, a tétel **teljesen
   lezárul** — a 2–5. lépés szerint, azonnal, ugyanabban a körben. Nem
   marad nyitva „Kódrész — KÉSZ" + „Még nyitva" jelöléssel, akkor sem, ha
   marad hátra kapcsolódó, de különálló munka (pl. tisztán doktori
   adatmunka, kódot nem igénylő feladat). A maradék **új, önálló
   backlog-tételként** kerül be a `backlog/BACKLOG.md`-be, saját új
   sorszámmal, a leírásában egy mondattal hivatkozva arra, melyik lezárt
   tételből vált le — ahogy a 24. tétel is a korábban lezárt tételek
   (8., 13.) visszamaradt doktori adatmunkájából állt össze.
2. **Döntések átvezetése.** A tervdokumentum (`backlog/plans/backlog-N-*-terv.md`)
   döntéseiből, ami tartósan érvényes (nem feladatlista, nem elvetett
   alternatíva, nem teszt-terv), az bekerül a megfelelő `docs/02`–`07`
   szakaszba prózaként, önhordozóan — a szabály és az indoka egy helyen,
   azonosító nélkül. Ha a döntés valóban sérthetetlen (jogi/
   adatintegritási következménnyel jár), új sor a „Sérthetetlen
   szabályok" táblába, ahol a Miért oszlop a tényleges indokot írja le,
   nem egy hivatkozást. **A `docs/01` D-táblája le van zárva: új döntés
   soha nem kap D-számot, és meglévő D-számra sem forráskód, sem
   `CLAUDE.md`, sem `docs/` nem hivatkozhat új helyen.** Ha a tétel új,
   újrahasznosítható segédfüggvényt vezetett be, egy új bekezdés kerül a
   „Meglévő segédfüggvények" alá, a meglévők mintájában (docs-anchorra
   hivatkozva, SOHA a terv-fájlra, SOHA D-számra).
3. **Tervdokumentum archiválása.** `git mv backlog/plans/backlog-N-*.md
   backlog/done/`. A tétel száma (N) ezután véglegesen nyugdíjazva —
   soha nem osztható ki új tételnek, ugyanaz az elv, mint a D17
   ártétel-`id`-nél.
4. **Backlog-bejegyzés törlése + zárt-napló bővítése.** A tétel teljes
   szakasza törlődik a `backlog/BACKLOG.md`-ből (nem jelöljük KÉSZ-nek, nem
   hagyunk stub-ot) — a maradék tételek „N. hely" rangsorát
   újraszámozzuk. Egy tömör összefoglaló (méret, a végleges megoldás 1-2
   mondatban, `docs/0X` hivatkozás a részletekhez) bekerül a
   `backlog/done/BACKLOG_DONE.md` végére — ez a bejegyzés NEM
   hivatkozhat a most archivált terv-fájlra, csak a fő dokumentumokra és a
   git history-ra.
5. **Referencia-seprés.** Minden helyen (forráskód-kommentek, ez a fájl,
   `docs/*.md`), ahol a most archivált terv-fájlra vagy a `backlog/done/`
   mappára mutató hivatkozás volt, át kell írni a megfelelő, néven
   megnevezett `docs/0X` szakaszra — D-számra soha.
6. **CHANGELOG.** Ha a tétel a pácienst/dokit érintő, felhasználó-szemszögű
   változás, a `/update-changelog` továbbra is külön, explicit lépés — ez
   a checklist nem helyettesíti. Ha a tétel megváltoztatta, mit lehet egy
   képernyőn csinálni, a `/update-features` (`FEATURES.md` frissítése)
   ugyanígy külön, explicit lépés. **Mindkét skill kizárólag kézi hívásra
   fut** (`disable-model-invocation`) — a lezárás végén ne próbáld
   automatikusan meghívni egyiket sem, csak írj emlékeztetőt a dokinak,
   hogy futtassa le a `/update-changelog`-ot és/vagy a `/update-features`-t.

## Dokumentáció-térkép

| Fájl | Mikor nyisd meg |
|---|---|
| `docs/01-attekintes-es-dontesek.md` | Miért nem elég az Excelt javítani; adatvédelmi keret; kockázatok. A `D<szám>` döntéstábla **lezárt, történeti napló** — nem bővül, nem hivatkozási cél |
| `docs/02-domain-modell.md` | Mappastruktúra, `arlista.json`/`terv.json`/`beallitasok.json` sémák, fogszám-parsolás szabályai |
| `docs/03-funkcionalis-spec.md` | Képernyők és viselkedés (terv szerkesztő, kezelések és árak, korábbi tervek stb.) |
| `docs/04-nyomtatvany-spec.md` | A generált PDF felépítése, tipográfia, márkaszínek, számformátum |
| `docs/05-technologia.md` | Stack, `PlanStorage` interface, PDF generálás, sémaverziózás, hosztolás |
| `docs/07-felulet-rendszer.md` | Felület- és nyomtatvány-kinézeti szabályok: márkatokenek, komponensek, billentyűzet, akadálymentesség — kötelező, nem javaslat |
| `backlog/BACKLOG.md` | Még fejlesztendő tételek (priorizálva), technikai adósság, és honnan jönnek az igények |
| `backlog/plans/backlog-N-*-terv.md` | Egy nyitott backlog-tétel részletes döntései — a `backlog/BACKLOG.md` tétel `**Terv:**` sora mutat rá; lezáráskor a `backlog/done/`-ba költözik és eltűnik a listából (lásd „Backlog-tétel lezárása") |
