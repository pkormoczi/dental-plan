// Sablonszövegek seedje.
//
// A fizetési feltételek szövege szó szerint a docs/04-nyomtatvany-spec.md
// "2. oldal" szekciójából jön -- ez tényleges, publikálható szöveg.
//
// A nyilatkozat/szerződés szövege NINCS megadva egyetlen doksiban sem, és
// a docs/01-attekintes-es-dontesek.md kifejezetten jogi munkaként jelöli
// (nem gépi fordítás, mert a páciens aláírja). Ide ezért SZÁNDÉKOSAN nem
// kerül kitalált jogi szöveg -- helyette egy jól látható placeholder, amit
// a doki jogásza tölt fel a véglegesben.

export const FIZETESI_FELTETELEK_HU_V1 = `# Fizetési feltételek

- Fogtechnikai munkát nem tartalmazó kezelésnél az elvégzett munka ellenértéke alkalmanként, azonnal fizetendő.
- Fogtechnikai munkát tartalmazó kezelésnél a kezelési összeg 50%-a a munka megkezdésekor fizetendő; ez a feltétele a technikus felé való továbbításnak. A fennmaradó rész a munka átadásakor fizetendő.
- A munka átadásának feltétele a kiegyenlített számla.
- Fizetési mód: készpénz, egészségpénztári kártya, bankkártya.
`;

export const NYILATKOZAT_HU_V1 = `# Nyilatkozat

[PLACEHOLDER -- ez a szövegrész jogi munka, nem gépi fordítás vagy demó
szöveg, mert a páciens aláírja. Lásd docs/01-attekintes-es-dontesek.md,
"Nyitott kérdések, amik a dokira várnak" 2. pont. A doki jogásza tölti fel
a véglegesített szöveget a Beállítások képernyőn, ami itt egy új
verziófájlt hoz létre (pl. nyilatkozat-hu-v2.md), a jelenlegi megmarad.]
`;

// D21: a német sablonok is szükségesek ahhoz, hogy egy német nyelvű terv
// egyáltalán véglegesíthető legyen (lásd storage/DemoStorage.ts
// `ensureSeedTemplates`). A tartalmuk ugyanúgy PLACEHOLDER, mint a
// magyaroké -- ez itt sem gépi fordítás, jogi munka (docs/01, README
// "Nyitott kérdések"). A placeholder szövege szándékosan kétnyelvű, mert
// ha valaki mégis véglegesít vele, ez kerül a PDF-re.

export const FIZETESI_FELTETELEK_DE_V1 = `# Zahlungsbedingungen

- [PLATZHALTER -- Übersetzung ausstehend / fordítás még nincs kész. Forrásszöveg: fizetesi-feltetelek-hu-v1.md]
`;

export const NYILATKOZAT_DE_V1 = `# Erklärung

[PLATZHALTER / HELYKITÖLTŐ -- Dieser Text ist noch nicht freigegeben, weil er
vom Patienten unterschrieben wird und daher juristische Arbeit ist, keine
maschinelle Übersetzung. / Ez a szövegrész jogi munka, nem gépi fordítás,
mert a páciens aláírja. Lásd docs/01-attekintes-es-dontesek.md, "Nyitott
kérdések" 2. pont. A doki jogásza tölti fel a véglegesített szöveget a
Beállítások képernyőn, ami itt egy új verziófájlt hoz létre
(nyilatkozat-de-v2.md), a jelenlegi megmarad.]
`;
