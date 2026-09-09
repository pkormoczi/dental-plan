# kiadas-datuma-es-az-ervenyesseg
Type: bug
Source: review:2026-09-09-doctor-review-elso-megnyitas#2

Helyi 00:00–02:00 (nyáron; télen 00:00–01:00) között indított új tervnél a „Kiadás dátuma” és
az „Érvényes eddig” egy nappal korábbi, mint a valós helyi nap — miközben ugyanazon a képernyőn
az „Automatikusan mentve” sor a helyes helyi napot mutatja. Ok: `app/src/domain/date.ts`
`todayIso()` `new Date().toISOString().slice(0,10)`-t ad, ami UTC-naptári nap, nem helyi; ezt
írja `blankPlan.ts` a `Plan.keltezes`-be és az `ervenyesIg`-be, és ez kerül a mentett verzió
mappanevébe is. Ugyanabban a fájlban létezik a helyes `localIsoDate()` segéd, de csak a relatív
időjelzés használja. Elvárt viselkedés: a `todayIso()` a helyi naptári napot adja vissza
(`localIsoDate(new Date())`), így a keltezés, az érvényesség és a mappanév egyezik az
„Automatikusan mentve” nappal. Kizárt: az `addDaysIso`/`formatLongDate` UTC-alapú számítása —
azok tiszta naptári dátumon (nem időbélyegen) dolgoznak, nem érintettek.
