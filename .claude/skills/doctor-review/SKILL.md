---
name: doctor-review
description: Simulates the app's real end user — a busy practicing fogorvos — walking a real clinic-day scenario through the running Mándoki Dental app in an isolated Chrome, then produces a prioritized Hungarian findings report on friction, discoverability, and trust. Complements code-and-architecture-review (developer lens) and browser-validation (spec-compliance lens) with the missing user-experience lens; never edits application code. Invoke explicitly with /doctor-review [scenario-slug].
disable-model-invocation: true
---

# Orvosi felhasználó-szimuláció

## Cél

A `code-and-architecture-review` a fejlesztői nézőpontot fedi le
(architektúra, kód-egészség), a `browser-validation` a specifikáció-nézőpontot
(kontraszt, PDF-bájtok, billentyűzet-geometria) — egyik sem azt méri, hogy egy
elfoglalt, két páciens között dolgozó orvos ténylegesen gyorsabban, biztonsá-
gosabban és kevesebb mentális teherrel tudja-e elvégezni a napi munkát az
alkalmazásban, mint papírral, Excellel vagy egy kollégához fordulva.

Ez a skill nem szabálysértést keres, hanem súrlódást, felfedezhetőséget és
bizalmat — a `persona.md`-ben rögzített orvosi nézőpontból. **Csak jelentést
készít, a kódot NEM módosítja a skill része** (ugyanaz az elv, mint a másik
két review-skillnél).

## Nem tárgyalható korlát

A `CLAUDE.md` „Böngésző-automatizálás — nem tárgyalható" szakasza szó
szerint érvényes erre a skillre is: a chrome-devtools MCP kizárólag izolált
módban futhat, a skill soha nem módosítja a `.mcp.json`-t, és soha nem
javasol/kísérel meg kapcsolódást egy futó, valós Chrome-hoz.

**Soha nem kerülhet valódi páciensadat a böngészőbe** — kizárólag a demó
seed-adat (`app/src/storage/seed/`) és szükség esetén kitalált, nyilvánvalóan
fiktív nevek/adatok (D2, GDPR 9. cikk).

---

## 0. fázis — előkészítés (fő ügynök)

1. **Forgatókönyv kiválasztása.** Argumentumból (`/doctor-review
   veglegesites`), vagy ha nincs argumentum, kínáld fel a `scenarios.md`
   hét forgatókönyvét `AskUserQuestion`-nel — ne találgass, melyiket akarja
   a felhasználó.
2. **Dev szerver.** `cd app && npm run dev` háttérben; a tényleges portot a
   szerver kimenetéből olvasd (Vite 5174+-ra léphet, ha az 5173 foglalt).
3. **Determinisztikus reset.** Kövesd szó szerint a
   `.claude/skills/browser-validation/SKILL.md` „Determinisztikus reset —
   KRITIKUS gotcha" szakaszát: `dp:` kulcsok törlése `evaluate_script`-tel,
   majd `about:blank` → app URL két lépéses újratöltés (egy közvetlen
   ugyanarra-az-URL-re navigálás SPA no-op, nem old ki reload-ot). Egy
   forgatókönyv = egy reset, a fázis legelején.
4. **Viewport.** 1440×900 (rendelői laptop).
5. **Belépő állapot.** Navigálj a forgatókönyv `Belépő állapot` mezője
   szerinti route-ra/kiindulási képernyőre.

## 1. fázis — a naiv bejárás (`orvos-persona` alügynök)

Indítsd az `orvos-persona` egyedi ügynököt (`Agent` tool,
`subagent_type: "orvos-persona"`). A promptja **pontosan** ez legyen, semmi
más:

1. a `.claude/skills/doctor-review/persona.md` teljes szövege, szó szerint
   beillesztve;
2. a kiválasztott forgatókönyv `Cél` és `Belépő állapot` mezője a
   `scenarios.md`-ből;
3. az app aktuális URL-je (port + route).

**Ne adj hozzá semmit** — komponensnevet, útvonal-tippet, spec-idézetet.
Az `orvos-persona` ügynök eszközkészlete strukturálisan nem éri el a
forráskódot vagy a `docs/`-ot; ez az izoláció kikényszerítési pontja, nem
csak egy prompt-kérés.

Az elakadás **eredmény, nem hiba** — ha az alügynök nem talál egy funkciót,
azt kell jegyzőkönyveznie, nem neked kell segítened neki. A visszatérési
érték egy nyers, szerkesztetlen magyar napló (`persona.md` § Kimenet
szerint) — ezt vedd át változtatás nélkül a 2. fázis bemeneteként.

Fusson le `list_console_messages` a forgatókönyv végén is (ezt az
`orvos-persona` ügynök teheti meg, ugyanaz az eszköz, ami neki is elérhető).

## 2. fázis — tényellenőrzés és jelentésírás (fő ügynök)

1. **Reprodukálás.** Menj végig a nyers naplón, és minden megállapítást
   próbálj meg te magad is előidézni a böngészőben (ugyanazon a futó
   szerveren, szükség esetén friss reset-tel). Ahol ez nem megy (pl. a PDF
   iframe belseje, tényleges lemezre írás — lásd „Nem ellenőrizhető" lent),
   a forráskód/`docs/` alapján ellenőrizd a leírt viselkedést.
2. **Bizonyosság.** Minden megállapításnál állítsd be/pontosítsd a
   `Bizonyosság` mezőt: **megfigyelt** (te magad is reprodukáltad),
   **erős következtetés** (nem reprodukáltad közvetlenül, de a kód/spec
   egyértelműen alátámasztja), **feltételezés** (egyik sem).
3. **Kemény szabály — mit NEM szabad tenned:** egy megállapítást sem
   törölhetsz vagy tompíthatsz azon az alapon, hogy a súrlódás mögött
   szándékos tervezői döntés vagy jogi kényszer áll (pl. a
   véglegesítés-őr kemény blokkjai, D4 verzió-immutabilitás, a nyelvi
   review kényszere). Az orvos nyers hangja megmarad. **Kizárólag tárgyi
   tévedést javíthatsz** (pl. a persona azt írja, nincs ilyen gomb, pedig
   van) — ilyenkor is tartsd meg az eredeti megfogalmazást, és fűzz hozzá
   egy „Pontosítás:" sort, ne írd felül.
4. **Dedup-címke.** Olvasd át a `docs/reviews/*doctor-review*.md` korábbi
   jelentéseket, a `backlog/BACKLOG.md`-t és a
   `backlog/ideas/USER_FEEDBACK.md`-t, és minden megállapítást jelölj:
   `ÚJ` / `MÁR JELZETT (<korábbi review-fájl neve>)` /
   `MÁR TERVEZETT (BACKLOG N. tétel)`. Az ismétlődés megerősítő jel, nem
   zaj — ne hagyd ki emiatt a megállapítást.
5. **Súlyosság + gyakoriság** kiosztása a `persona.md` § Mire figyelj
   különösen szempontjai szerint (betegbiztonsági/pénzügyi kockázat,
   adatvesztés veszélye, gyakoriság, elvesztegetett idő, van-e elfogadható
   kerülőút).

## Jelentés-szerződés

Fájl: `docs/reviews/YYYY-MM-DD-doctor-review-<scenario-slug>.md`, azonnal,
megerősítés nélkül. Magyar nyelvű.

Fejléc-blokk a cím alatt:

```
Dátum:
Forgatókönyv: <slug> — <Cél egy mondatban>
Eszköz: chrome-devtools MCP (izolált), 1440×900
Lefedett folyamatok: <a scenarios.md szerinti számok>
Bizonyosság-eloszlás: megfigyelt N / erős következtetés N / feltételezés N
```

Utána a hat kötelező szekció, a `persona.md` korábbi § Kimenet szakaszának
szerkezete szerint:

1. **Napi munkamenet összefoglalója**
2. **Legfontosabb megállapítások** — priorizált lista, minden tételnél:
   `Súlyosság`, `Gyakoriság`, `Érintett folyamat`, `Bizonyosság`, `Dedup`,
   `Helyzet és reprodukció`, `Orvosi elvárás`, `Tapasztalt probléma`,
   `Napi hatás`, `Jelenlegi kerülőút`, `Javasolt javítási irány`,
   `Siker mércéje`
3. **Nehezen felfedezhető vagy kihasználatlan funkciók**
4. **Fejlesztési lehetőségek** (max. 5 kiemelve, kategorizálva: gyors
   UX-javítás / munkafolyamat-rövidítés / bizalom-növelés / új
   funkcióötlet / további kutatást igénylő kérdés)
5. **Ami jól működik**
6. **Következő validációs kérdések** (max. 10, konkrét múltbeli
   viselkedésre kérdezve, nem véleményre)

## Nem ellenőrizhető

| Nem ellenőrizhető | Miért | Alternatíva |
|---|---|---|
| Pixelek/szöveg a PDF iframe-en belül | PDFium OOPIF, nincs szövegréteg | `take_screenshot` + vizuális ellenőrzés a 2. fázisban |
| A letöltött fájl tényleges lemezre kerülése | Izolált profil | A perszóna leírt szándéka/elvárása alapján `feltételezés` |
| Valódi fájlrendszeres tárolás (a mockup `DemoStorage`-t használ) | A `PlanStorage` mögötti `FileSystemStorage` még nem létezik | Jelezd, hogy ez a mockup-fázis korlátja, ne állíts mást |
| A ténylegesen kinyomtatott papír | Nincs nyomtató a menetben | Jelezd „nem ellenőrizhető"-ként |
| `prefers-reduced-motion` | Az `emulate` tool nem támogat CSS media-feature emulációt | Jelezd „nem ellenőrizhető"-ként |

Ami ide esik, kötelezően `feltételezés` bizonyosságú a jelentésben.

## Lezárás

Állítsd le a dev szervert. A jelentés átmeneti munkatermék — a valódi
találatok a `backlog/BACKLOG.md`-be vándorolnak, utána a jelentés törölhető
(ugyanaz az elv, mint a `browser-validation` és a `code-and-architecture-
review` kimeneténél).
