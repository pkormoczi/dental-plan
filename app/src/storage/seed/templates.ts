// Sablonszövegek seedje.
//
// A nyilatkozat és a fizetési feltételek szövege szó szerint az eredeti
// `data/MINTA_MINTA_Kezelesi_Terv_frissített.xls` `Kezelesi_Terv` lapjáról
// jön -- ez a rendelőnél ma is használatos, a páciens által aláírt szöveg,
// nem gépi fordítás vagy demó szöveg. A `{{orvos}}` helyőrzőt a PDF
// generáláskor a terv kezelőorvosának neve váltja fel (lásd
// pdf/markdownLite.ts `fillPlaceholders`).
//
// A fizetési feltételek `{{elolegSzazalek}}` helyőrzője (backlog-9) a terv
// `elolegSzazalek` mezőjére old fel, kikapcsolt kapcsolónál az 50-es
// alapértékre -- vagyis a mondat ilyenkor szó szerint az eredeti,
// aláírt szöveget adja vissza. Ezért NEM feltételes blokk, csak
// szöveghelyettesítés.
//
// A doki jogásza a Beállítások képernyőn szerkesztheti/pontosíthatja ezt a
// szöveget -- mentéskor `storage.saveTemplate()` mindig ÚJ verziófájlt hoz
// létre (pl. nyilatkozat-hu-v2.md), a jelenlegi megmarad, mert a már
// véglegesített tervek erre hivatkoznak (D4, `plan.sablonVerzio`).
//
// A négy sablon fix címét (a "# Cím" sor) a `TEMPLATE_HEADINGS` tartja --
// ez teszi lehetővé, hogy a Beállítások szerkesztődobozában a cím nélküli
// törzs látszódjon, mentéskor pedig a cím visszakerüljön.

export const TEMPLATE_HEADINGS = {
  'nyilatkozat-hu': 'Nyilatkozat',
  'fizetesi-feltetelek-hu': 'Fizetési feltételek',
  'nyilatkozat-de': 'Erklärung',
  'fizetesi-feltetelek-de': 'Zahlungsbedingungen',
} as const;

export const NYILATKOZAT_HU_V1 = `# Nyilatkozat

Megrendelő megrendeli a KEZELÉSI TERV szerinti kezeléseket, szolgáltatásokat, anyagokat.

A szolgáltató kötelezettséget vállal ezek teljesítésére. Aláírásukkal szerződő felek kifejezetten megállapodnak abban, hogy a megrendelt szolgáltatások teljesítéséhez, fogászati ellátáshoz, fogtechnikai tevékenységhez, egyéb orvosi beavatkozáshoz, gyógykezeléshez, a szolgáltató alvállalkozókat is igénybe vesz.

Megrendelő az ANAMÉZIS lap-ot kitöltötte, aláírta és átadta Szolgáltatónak.

Megrendelő úgy nyilatkozik, hogy a kezelésekkel és azok esetleges komplikációival, kockázataival kapcsolatban kimerítő tájékoztatást megkapta, a kezelést végző orvos tájékoztatta a tervben nem szereplő alternatív megoldásokról, azok esetleges kockázatairól. Tudomásul veszi, hogy a kezelési terv a klinikai és egyéb vizsgálatok függvényében megváltozhat.

Jelen szerződést a felek elolvasták és egyetértően aláírták.

A fentiekkel egyetértek, kérdéseimre választ kaptam. A kezelési terv közös megbeszélés alapján történt, a fenti kezelések elvégzésével, a fogpótlás(ok) elkészítésével megbízom {{orvos}} fogszakorvost.
`;

export const FIZETESI_FELTETELEK_HU_V1 = `# Fizetési feltételek

Megrendelő a kezelési tervben szereplő kezelés sorozat elvégzésével, az ehhez kapcsolódó fogtechnikai anyagok beépítésével egyetért, ehhez beleegyezését adja. Számlázási, fizetési feltételek tekintetében Megrendelő elfogadja az alábbiakat:

- Amennyiben a kezelés nem tartalmaz fogtechnikai munkát, akkor az alkalmanként elvégzett munka ellenértéke azonnal fizetendő.
- Fogtechnikai munkát tartalmazó kezelés esetén a kezelési összeg {{elolegSzazalek}}%-a fizetendő a munka megkezdésekor; ez a feltétele a technikus felé való továbbításnak. A fennmaradó rész a munka átadásakor fizetendő.
- A munka átadásának feltétele a kiegyenlített számla.
- Fizetési mód: készpénz, egészségpénztári kártya, vagy bankkártyás utalás.
`;

// D21: a német sablonok is szükségesek ahhoz, hogy egy német nyelvű terv
// egyáltalán véglegesíthető legyen (lásd storage/DemoStorage.ts
// `ensureSeedTemplates`). A magyar szöveg megvan, de a német fordítás
// SZÁNDÉKOSAN nem gépi -- ez jogi munka, mert a páciens aláírja (lásd
// docs/01-attekintes-es-dontesek.md, "Nyitott kérdések, amik a dokira
// várnak"). A doki jogásza tölti fel a lektorált fordítást a Beállítások
// képernyőn, ami itt egy új verziófájlt hoz létre (nyilatkozat-de-v2.md
// / fizetesi-feltetelek-de-v2.md), a jelenlegi placeholder megmarad.

export const NYILATKOZAT_DE_V1 = `# Erklärung

[PLATZHALTER / HELYKITÖLTŐ -- Dieser Text ist noch nicht freigegeben, weil er
vom Patienten unterschrieben wird und daher juristische Arbeit ist, keine
maschinelle Übersetzung. / Ez a szövegrész jogi munka, nem gépi fordítás,
mert a páciens aláírja. A magyar forrásszöveg elkészült
(nyilatkozat-hu-v1.md) -- a doki jogásza tölti fel a lektorált fordítást a
Beállítások képernyőn, ami itt egy új verziófájlt hoz létre
(nyilatkozat-de-v2.md), a jelenlegi megmarad.]
`;

export const FIZETESI_FELTETELEK_DE_V1 = `# Zahlungsbedingungen

- [PLATZHALTER -- Übersetzung ausstehend / fordítás még nincs kész. Forrásszöveg: fizetesi-feltetelek-hu-v1.md]
`;
