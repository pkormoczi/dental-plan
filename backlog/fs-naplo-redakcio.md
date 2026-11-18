# fs-naplo-redakcio
Type: feature
Source: desktop-app-migration-plan-final.md §10.2a
Target: master
Baseline: 02f29550bea3985ca65399a764f003d7178cb7ac

## Goal
A telepített app helyi diagnosztikai naplót ír a fájlrendszeri hibákról és a két gép közti ütközésekről, hogy egy hiba utólag kivizsgálható legyen, a naplóban páciens- vagy tervnév és tartalom nélkül.

## Current state
- `app/electron/fsPrimitivek.ts` `ioHiba`, `errnoKod` (a syscall ma elvész); `app/src/storage/taroloHibak.ts` `IoError` (`errno`, `utvonal` abszolút), `FelulirasUtkozesError` (`fajl` relatív, `lemezenLevo`), `HianyosVerzioError`, `TorlesAkadalyError`; `app/src/storage/paths.ts` `VersionConflictError`, `parsePatientDirName`/`parsePlanDirName`.
- IPC-határ a mainben: `app/electron/ipcKezelok.ts` `taroloHivas`, `megmutatKezelo`, `pdfKezelok` — minden hiba itt fut át, `hibaBolStorageHiba`-ként.
- `app/electron/main.ts` (`userData`, `TESZT_GYOKER`, tároló-indítás), `app/electron/preload.ts`, `app/src/storage/StorageContext.tsx` (`megmutat`, `pdfMuveletek` képesség-minta).

## Approach
- Új main-oldali naplómodul `app/electron/`-ban: `userData/naplo/io.log`, egy sor eseményenként (időpont, művelet, hibakód, I/O-nál errno és syscall, redaktált útvonal); ~1 MB fölött `io.1.log`-ra forgat (a régit felülírva), `fsync` nélkül; a napló saját írási hibája csendben elmarad, a hívást sosem rontja. Induláskor fejléc-sor: app-verzió, OS, a gyökérmappa útvonala.
- Redakció egy függvényben, ami a gyökérhez képest számol, és külön `RedaktaltUtvonal` típust ad; a naplózó csak ezt fogadja. Szabályok: `paciensek/<páciensmappa>` és a tervmappa → `#<id6>`; mintán kívüli név a `paciensek/` alatt (pl. Drive-ütközéses) → `#?`; az `_utkozesek/` alatti páciensmappa-előtag → `#<id6>` vagy `#?`; a gyökéren kívüli út → csak „gyökéren kívül” és a kiterjesztés; verziómappa-, sablon- és gyökérfájl-nevek maradnak.
- Mit naplóz: az IPC-határon minden `IoError`, `VersionConflictError`, `FelulirasUtkozesError`, `HianyosVerzioError`, `TorlesAkadalyError` — kód és redaktált út, a tartalom (`lemezenLevo`, terv, törzsadat) és a hibaüzenet soha. Az `IoError` a syscallt is hordozza (`ioHiba`).
- Szűk „naplómappa megmutatása” csatorna a meglévő küldő-ellenőrzéssel és a `StorageContext`-en képességként (demóban `null`); felület nincs.
- NEM ide: a „Napló megnyitása” gomb (`gyokermappa-varazslo` Adattárolás szekciója), a sikeres műveletek naplózása, bármilyen továbbítás — a napló csak helyi fájl.

## Decisions
- A gomb a varázsló szekciójában — doki döntése: a fájlrendszeres tároló, és vele a napló, úgyis csak a varázslótól él a telepített appban.
- Az ütközések is a naplóba — doki döntése: a kétgépes próbán épp ezek a vizsgálandó események.
- Naplózás az IPC-határon, nem a tárolón belül — minden hiba egyszer és egy helyen fut át ott, a művelet neve is ott ismert; a tároló kódja nem tud a naplóról.
- A redakció a naplózáskor, a gyökérből számolva, nem a hibán tárolva — a renderer felé utazó hibának nem kell második útvonal; a típus így is kikényszeríti, hogy nyers út ne kerülhessen a naplóba.
- A hibaüzenet nem kerül a naplóba, csak mezők — az `IoError` szövege a teljes utat, a `VersionConflictError`-é az orvos nevét tartalmazza; a nyers OS-üzenet amúgy sem éri el a hibát.
- Mintán kívüli név `#?`, gyökéren kívüli út csak kiterjesztéssel — egy Drive-másolat vagy a „Másolás máshová” fájlneve páciensnevet hordozhat; inkább kevesebbet árul el, mint egy nevet.
- A napló saját hibája néma — diagnosztika nem teheti használhatatlanná a mentést.

## Verification
- [ ] tests — redakció: páciens- és tervmappa `#<id6>`, mintán kívüli `#?`, `_utkozesek/` páciens-előtag, gyökéren kívüli út, megmaradó verzió- és fájlnevek; a naplózó nyers stringet nem fogad (típushiba)
- [ ] tests — egy IPC-n át elbukó hívás naplósora: művelet, errno, syscall, redaktált út; nincs benne páciens- vagy tervmappa-név, OS-üzenet, hibaszöveg; ütközésnél kód és út, tartalom nélkül
- [ ] tests — forgatás ~1 MB-nál `io.1.log`-ra; induláskori fejléc (verzió, OS, gyökér); a napló írási hibája mellett az IPC-eredmény változatlan; a naplómappa-csatorna idegen küldőt elutasít
- [ ] typecheck/lint
- [ ] docs-check
