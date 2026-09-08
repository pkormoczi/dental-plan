# datummezo-formatum-inkonzisztens
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 6. megállapítás
Target: master
Baseline: b882ae9f9abf5e74bfc6164a7c35db6af8e72bd2

## Goal
A doki minden dátumot ugyanabban a magyar alakban olvassa el a natív dátummezők mellett is,
a Chrome felület-nyelvétől függetlenül.

## Current state
Négy natív `type="date"` mező, mind `components/Field.tsx` `Field` alatt:
`app/src/pages/PatientPage.tsx:298` (Született) és `:508` (Érvényes eddig),
`app/src/pages/paciensek/UjPaciensDialog.tsx:240`, `app/src/components/PatientEditorPanel.tsx:266`.
A kijelzett alakot a Chrome felület-nyelve adja; `app/index.html:2` már `<html lang="hu">`, és
a `lang` öröklődik — angol Chrome ettől függetlenül `mm/dd/yyyy`-t mutat.

Kézi formázók: `app/src/domain/date.ts` `formatShortDate` („1978.03.14.") és `formatLongDate`
(„2026. szeptember 5."). Rövid alak ma: `components/PatientListRow.tsx:28`,
`pages/paciensek/PatientTableRow.tsx:15`, `components/PatientDetailHeader.tsx:21`,
`pages/paciensek/JeloltSor.tsx:52`, `components/PatientEditorPanel.tsx:202` (nézet mód),
`pages/TervReszleteiPage.tsx:312`. Hosszú alak: `pages/PatientPage.tsx:502` („Kiadás dátuma"),
`pages/TervReszleteiPage.tsx:504`.

Nyers ISO ugyanarra az értékre: `app/src/components/PatientPlanChains.tsx:444` és `:524`
(„v2 · 2026-07-22"), miközben `pages/TervReszleteiPage.tsx:442`/`:462` ugyanezt
`formatShortDate`-tel írja. Az ISO-t rögzítő teszt: `app/src/pages/demo/OsszesTervSection.test.tsx:871`.

Érintett tesztek még: `app/src/pages/PatientPage.test.tsx:1122` („dátumok szekció"),
`app/src/pages/paciensek/UjPaciensDialog.test.tsx`, `app/src/pages/PatientDetailPage.test.tsx` —
ezek `getByLabelText('Született')`-tel érik el az inputot.

## Approach
A négy natív mező alá kerül a kitöltött érték kézzel formázva, olvasható szövegként; a mező
marad natív `type="date"` (naptár, billentyűzet, a11y változatlan). A `components/Field.tsx`
adja a helyet, a `domain/date.ts` a formázást — új formázó nem kell.
`components/PatientPlanChains.tsx` két nyers ISO helye `formatShortDate(..., 'hu')`-ra vált, az
`OsszesTervSection.test.tsx` várakozása követi.

NEM tartozik ide: a `keltezes` szerkeszthetővé tétele és a „Kiadás dátuma" címke terminológiája
(`keltezes-datum-szerkesztheto`) — ha az a mező közben natív dátummezővé válik, ugyanezt a
kezelést kapja; a `pdf/` formázás (a nyomtatvány a terv nyelvét követi, változatlan); a
`pages/PriceListAdminPage.tsx:391` árlistaverzió (verzióazonosító, nem a dokinak felolvasott
naptári dátum); a `formatShortDate`/`formatLongDate` szerződése és a `domain/date.test.ts`.

## Decisions
- Csak olvasható érték a mező alatt, `lang="hu"` nélkül — az `index.html:2` már `lang="hu"`, és a
  review angol Chrome-ja mégis `mm/dd/yyyy`-t mutatott: a Chrome a felület-nyelvéből formáz. Egy
  bizonyítottan hatástalan attribútumért nem kérünk kézi tesztet, így a változás teljes egészében
  jsdomban ellenőrizhető.
- Az olvasható érték a környező szakasz alakját követi: Született → rövid („1978.03.14.", mint a
  listákban és a sticky fejlécben), Érvényes eddig → hosszú (mint a fölötte álló Kiadás dátuma);
  nem egyetlen alak mindenhol, mert az bármelyik irányban új eltérést nyitna a közvetlen
  szomszédjával.
- Az olvasható érték a `<label>`-en KÍVÜL renderelődik — a `Field` `<label>`-jébe zárt szöveg
  beleszámítana az input accessible name-jébe (ugyanaz a csapda, amit a `Field.tsx` `FieldGroup`
  kommentje dokumentál), és elrontaná a meglévő `getByLabelText('Született')` hívásokat.
- Üres mezőnél nincs olvasható érték (nem `—`) — az üres input maga a jelzés, egy gondolatjel
  alatta zaj.
- A nyers ISO is ide tartozik — ugyanaz az érték a Terv részletei lapon már `formatShortDate`; a
  két hely eltérése ugyanannak a megállapításnak a része.

## Verification
- [ ] tests — kitöltött Született mező alatt „1978.03.14." olvasható a Terv adatai lapon, az Új
      páciens dialógusban és a páciens-szerkesztő panelen; a Terv adatai lap „Érvényes eddig"
      mezője alatt „2026. december 4." alakú érték áll, és a mező átírását követi; üres mezőnél
      nincs érték; a `getByLabelText('Született')` továbbra is az inputot találja; a Tervek lista
      verziósorai „v2 · 2026.07.22." alakban írják a dátumot
- [ ] typecheck/lint
- [ ] docs-check
