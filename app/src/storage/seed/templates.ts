// Sablonszövegek seedje.
//
// A nyilatkozat és a fizetési feltételek szövege szó szerint az eredeti
// `data/MINTA_Kezelesi_Terv_frissített.xls` `Kezelesi_Terv` lapjáról
// jön -- ez a rendelőnél ma is használatos, a páciens által aláírt szöveg,
// nem gépi fordítás vagy demó szöveg. A `{{orvos}}` helyőrzőt a PDF
// generáláskor a terv kezelőorvosának neve váltja fel (lásd
// pdf/markdownLite.ts `fillPlaceholders`).
//
// A fizetési feltételek `{{eloleg}}` helyőrzője (D66, korábban
// `{{elolegSzazalek}}` -- lásd `FIZETESI_FELTETELEK_HU_V1`/`_DE_V1`, a v1
// sablon MÁR aláírt tervekre pinnelve marad, D4) a terv `elolegOsszeg`
// mezőjéből képzett, formázott kifejezésre old fel (`pdf/labels.ts`
// `elolegKifejezes`), kikapcsolt kapcsolónál a "megállapított"/"vereinbarte"
// megfogalmazásra. Ezért NEM feltételes blokk, csak szöveghelyettesítés.
//
// A doki jogásza a Beállítások képernyőn szerkesztheti/pontosíthatja ezt a
// szöveget -- mentéskor `storage.saveTemplate()` mindig ÚJ verziófájlt hoz
// létre (pl. nyilatkozat-hu-v2.md), a jelenlegi megmarad, mert a már
// véglegesített tervek erre hivatkoznak (D4, `plan.sablonVerzio`).
//
// A hat sablon fix címét (a "# Cím" sor) a `TEMPLATE_HEADINGS` tartja --
// ez teszi lehetővé, hogy a Beállítások szerkesztődobozában a cím nélküli
// törzs látszódjon, mentéskor pedig a cím visszakerüljön.

export const TEMPLATE_HEADINGS = {
  'nyilatkozat-hu': 'Nyilatkozat',
  'fizetesi-feltetelek-hu': 'Fizetési feltételek',
  'garancia-hu': 'Garancia',
  'nyilatkozat-de': 'Erklärung',
  'fizetesi-feltetelek-de': 'Zahlungsbedingungen',
  'garancia-de': 'Garantie',
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

// D66: az előleg százalékról abszolút összegre váltott -- ez a v2 az
// egyetlen érintett felsorolás-pont mondatát igazítja hozzá, a v1 (fenti)
// örökre változatlan marad (D4, már véglegesített tervek `sablonVerzio`-ja
// rá mutathat).
export const FIZETESI_FELTETELEK_HU_V2 = `# Fizetési feltételek

Megrendelő a kezelési tervben szereplő kezelés sorozat elvégzésével, az ehhez kapcsolódó fogtechnikai anyagok beépítésével egyetért, ehhez beleegyezését adja. Számlázási, fizetési feltételek tekintetében Megrendelő elfogadja az alábbiakat:

- Amennyiben a kezelés nem tartalmaz fogtechnikai munkát, akkor az alkalmanként elvégzett munka ellenértéke azonnal fizetendő.
- Fogtechnikai munkát tartalmazó kezelés esetén {{eloleg}} fizetendő a munka megkezdésekor; ez a feltétele a technikus felé való továbbításnak. A fennmaradó rész a munka átadásakor fizetendő.
- A munka átadásának feltétele a kiegyenlített számla.
- Fizetési mód: készpénz, egészségpénztári kártya, vagy bankkártyás utalás.
`;

// D21: a német sablonok is szükségesek ahhoz, hogy egy német nyelvű terv
// egyáltalán véglegesíthető legyen (lásd storage/DemoStorage.ts
// `ensureSeedTemplates`).
//
// Eredetileg ez a két szöveg placeholder volt: a német fordítás jogi munka,
// mert a páciens aláírja, ezért a projekt korábbi szabálya szerint nem
// gépi/AI fordítás töltötte volna ki, hanem a doki jogásza a Beállítások
// képernyőn (lásd docs/01-attekintes-es-dontesek.md, "Nyitott kérdések,
// amik a dokira várnak" #1). A doki 2026-08-10-én kifejezetten úgy döntött,
// hogy ehelyett AI-fordítás kerüljön be, jelölés (és a hozzá kötött
// biztonsági zár, lásd `isPlaceholderTemplate`/PreviewPage) NÉLKÜL -- tehát
// ez a két szöveg NEM esett át jogi lektoráláson. Ha ez változna (pl. a
// jogász mégis átnézi), a Beállításokban szerkesztve/mentve új
// verziófájl (nyilatkozat-de-v2.md / fizetesi-feltetelek-de-v2.md)
// keletkezik, a jelenlegi (v1, AI-fordítás) megmarad.

export const NYILATKOZAT_DE_V1 = `# Erklärung

Der Auftraggeber bestellt die im BEHANDLUNGSPLAN aufgeführten Behandlungen, Leistungen und Materialien.

Der Dienstleister verpflichtet sich zu deren Erbringung. Mit ihrer Unterschrift vereinbaren die Vertragsparteien ausdrücklich, dass der Dienstleister zur Erbringung der bestellten Leistungen, der zahnärztlichen Versorgung, der zahntechnischen Tätigkeit sowie sonstiger medizinischer Eingriffe und Heilbehandlungen auch Subunternehmer in Anspruch nimmt.

Der Auftraggeber hat den ANAMNESE-Bogen ausgefüllt, unterschrieben und dem Dienstleister übergeben.

Der Auftraggeber erklärt, dass er über die Behandlungen sowie deren mögliche Komplikationen und Risiken umfassend aufgeklärt wurde; der behandelnde Arzt hat ihn über im Behandlungsplan nicht enthaltene alternative Lösungen und deren mögliche Risiken informiert. Er nimmt zur Kenntnis, dass sich der Behandlungsplan in Abhängigkeit von klinischen und sonstigen Untersuchungen ändern kann.

Die Vertragsparteien haben den vorliegenden Vertrag gelesen und einvernehmlich unterschrieben.

Mit dem Vorstehenden bin ich einverstanden, meine Fragen wurden beantwortet. Der Behandlungsplan wurde im gemeinsamen Gespräch erstellt; mit der Durchführung der oben genannten Behandlungen sowie mit der Anfertigung des Zahnersatzes/der Zahnersätze beauftrage ich {{orvos}}.
`;

export const FIZETESI_FELTETELEK_DE_V1 = `# Zahlungsbedingungen

Der Auftraggeber stimmt der Durchführung der im Behandlungsplan aufgeführten Behandlungsreihe sowie dem Einbau der damit verbundenen zahntechnischen Materialien zu und erteilt hierzu seine Einwilligung. Hinsichtlich der Rechnungsstellung und der Zahlungsbedingungen akzeptiert der Auftraggeber Folgendes:

- Enthält die Behandlung keine zahntechnische Arbeit, ist der Gegenwert der jeweils erbrachten Leistung sofort fällig.
- Bei einer Behandlung mit zahntechnischer Arbeit sind {{elolegSzazalek}} % des Behandlungsbetrags bei Beginn der Arbeit fällig; dies ist Voraussetzung für die Weiterleitung an den Zahntechniker. Der Restbetrag ist bei Übergabe der Arbeit fällig.
- Voraussetzung für die Übergabe der Arbeit ist die beglichene Rechnung.
- Zahlungsart: Bargeld, Gesundheitskassenkarte oder Kartenüberweisung.
`;

// D66, a HU v2 párja (lásd ott).
export const FIZETESI_FELTETELEK_DE_V2 = `# Zahlungsbedingungen

Der Auftraggeber stimmt der Durchführung der im Behandlungsplan aufgeführten Behandlungsreihe sowie dem Einbau der damit verbundenen zahntechnischen Materialien zu und erteilt hierzu seine Einwilligung. Hinsichtlich der Rechnungsstellung und der Zahlungsbedingungen akzeptiert der Auftraggeber Folgendes:

- Enthält die Behandlung keine zahntechnische Arbeit, ist der Gegenwert der jeweils erbrachten Leistung sofort fällig.
- Bei einer Behandlung mit zahntechnischer Arbeit ist {{eloleg}} bei Beginn der Arbeit fällig; dies ist Voraussetzung für die Weiterleitung an den Zahntechniker. Der Restbetrag ist bei Übergabe der Arbeit fällig.
- Voraussetzung für die Übergabe der Arbeit ist die beglichene Rechnung.
- Zahlungsart: Bargeld, Gesundheitskassenkarte oder Kartenüberweisung.
`;

// Garancia szakasz a nyomtatványon (docs/04-nyomtatvany-spec.md § „2. blokk
// — fizetési feltételek és garancia" § „Garancia"): az eredeti Excelben
// nincs garancia-szöveg, tehát -- a fenti kettővel ellentétben -- itt a
// MAGYAR sem valódi, lektorált tartalom, hanem
// szándékos placeholder: a doki adja meg (kezeléstípusonkénti
// garanciaidők, kivételek), a Beállítások képernyőn. A német is
// placeholder marad, de más okból, mint a fenti DE szövegeknél: nincs mit
// AI-fordítani, amíg a magyar forrás maga is helykitöltő.
export const GARANCIA_HU_V1 = `# Garancia

[PLACEHOLDER — a garanciafeltételek még nincsenek megadva]
`;

export const GARANCIA_DE_V1 = `# Garantie

[PLATZHALTER — Übersetzung ausstehend]
`;
