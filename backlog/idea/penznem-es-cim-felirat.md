# penznem-es-cim-felirat
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 13. megállapítás

A Terv adatai lap két magyarázó felirata a fejlesztő fogalmait használja. „Pénznem (ez dönti el,
mely tételek ajánlhatók)” (`app/src/pages/PatientPage.tsx`): a doki nem tudja, mi az „ajánlható
tétel” — a mondat ráadásul félrevezető is, mert a kereső a pénznemre nem szűr
(`app/src/domain/CLAUDE.md`); a pénznem valójában azt dönti el, mely tételnek VAN listaára az adott
pénznemben (`ar[penznem] === null` → a sor kemény `araztalan-sor` blokkot kap a véglegesítésnél).
„Üresen a domináns kategória neve lesz a cím — a véglegesítéskor rögzül.”
(`app/src/pages/patientPage/TervCimField.tsx`): a „domináns kategória” a legnagyobb ÖSSZEGŰ
kategória (`app/src/domain/tervCim.ts`), ami a mondatból nem derül ki — a doki egy tömés + egy
korona tervre a „Korona és hídpótlások” címet kapta, és furcsának találta, mert nem tudta, honnan
jött. Elvárt: mindkét felirat a doki nyelvén, példával — „Euróban csak azoknak a kezeléseknek van
ára, amelyekhez euró-árat rögzítettél”; „Ha üresen hagyod, a legnagyobb összegű kezeléscsoport neve
lesz a cím (pl. »Korona és hídpótlások«)”. Csak a felületi feliratok: a pénznem-logika, a
cím-javaslat algoritmusa és a véglegesítéskori rögzülés változatlan; a `null` ár jelentését magyarázó
kód-kommentek maradnak.
