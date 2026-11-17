# storage-kozos-mag
Type: chore
Source: fs-storage-alap tervezése közben (közös storage-mag döntés, 2026-11-17)
Target: master
Baseline: 4eb7a608ad29a5373b1f2e6ffa9cf3d4a2da672f

## Goal
A `DemoStorage` szerződés-logikája egy közös, DOM-mentes magba kerül egy kis fájlprimitív-interfész
mögé, amire a demó localStorage-primitívekkel épül; a Pages-demó viselkedése és a böngészőben tárolt
demóadat változatlan.

## Current state
- `app/src/storage/DemoStorage.ts` (816 sor): a `PlanStorage` teljes szemantikája — mappanév-építés a
  `paths.ts`-sel, `paciens.json`-index és aktivitás, `terv-cimke.json`, `terv-ervenytelenitesek.json`,
  sablon-verziózás (`-vN.md`), `enqueue`/`savingChain`, validálás (`assert*Shape`,
  `assertKnownSchemaVersion`, `parseJson`) — közvetlen `localStorage`-hívásokkal. Mellette demó-only
  rész: seed-páciensek, `resetDemoData`/`clearAll`, `migrateLegacyLayout`, `ensureSeedTemplates`,
  `listFileTree`/`readRawFile`/`isSeedVersion`, a PDF base64-tárolása.
- `app/src/storage/DemoStorage.test.ts`: 66 teszt, köztük „savePlan on an existing tervId appends v2
  without touching v1” és „rejects loading a paciens-adatok.json with a newer-than-known
  schemaVersion” (a root `CLAUDE.md` és az `app/src/storage/CLAUDE.md` anchorjai).
- `app/src/storage/localKeys.ts` `PREFIX`: a kulcsok a lemezes útvonalstruktúrát követik.
- `app/src/storage/StorageContext.tsx`: a `DemoStorage` példányosítása és a demó-only mezők.
- `app/.oxlintrc.json`: a `src/storage/**` override engedi a `localStorage`-t; a `DemoStorage` importja
  kívülről tiltott.
- Migrációs terv §4.3 (a későbbi `InMemoryStorage` is manifestet ír, hogy a tesztek ugyanazt a
  szerződést ellenőrizzék), §11, §14.

## Approach
- Új közös mag az `app/src/storage/` alatt: a `PlanStorage` metódusai a mai szemantikával, egy
  fájlprimitív-interfészen át (olvasás szövegként és bájtként, atomi írás, gyerekek listázása,
  létezés, mappa létrehozása, rekurzív törlés, mappa átnevezése); az `enqueue` sorosítás a magban él.
  A mag DOM-mentes: sem `localStorage`, sem más böngésző-API.
- A `DemoStorage` = mag + localStorage-alapú primitívek + a demó-only rész (seed-páciensek,
  reset/clear, legacy-migráció, seed-sablon pótlás, fájlfa, nyers olvasás, seed-verzió jelzés). A
  localStorage-kulcsok és a PDF base64-tárolása változatlan — ez a primitív réteg dolga.
- A szerződés-tesztek implementációra paraméterezhetők, és egy memóriás primitívvel is lefutnak.
- `StorageContext`, a hívók és a `PlanStorage` interfész nem változik. Nem tartozik ide:
  `FileSystemStorage`, fájlrendszer, Electron, manifest, ütközésőr.

## Decisions
- Közös mag (fejlesztő) — mert egy szemantika fut a demóban, a tesztekben és az éles appban, és a
  meglévő tesztek szerződéstesztként mindkét implementációra futnak; nem átportolás, mert az két,
  egymástól elcsúszó implementációt adna.
- A localStorage-kulcsok és a PDF base64 változatlan — mert a doki böngészőjében élő demóadatnak
  tovább kell működnie.
- A seed-páciensek, a legacy-migráció és a demó-only felület a `DemoStorage`-ban marad, nem a magban —
  mert éles gyökérmappába fiktív páciens és régi elrendezés nem kerülhet.
- Önálló tétel az `fs-storage-alap` előtt — mert önmagában ellenőrizhető refaktor, változatlan
  viselkedéssel.

## Verification
- [ ] tests — a `DemoStorage.test.ts` mind a 66 tesztje változatlan állításokkal zöld, a szerződés-rész
      egy memóriás primitívvel is; a teljes vitest-készlet zöld
- [ ] typecheck/lint — a mag nem hivatkozik `localStorage`-ra vagy más böngésző-globálisra
- [ ] docs-check
