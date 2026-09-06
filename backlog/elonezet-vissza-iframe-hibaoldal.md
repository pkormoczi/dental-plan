# elonezet-vissza-iframe-hibaoldal
Type: bug
Source: doctor-review nagy-terv (2026-09-05), 4. megállapítás; doctor-review papirrol (2026-09-05), 6. megállapítás
Target: master
Baseline: 251a46791610f895097ba40be891aeac3eebaf87

## Goal
Az Előnézeten a böngésző Vissza gombja az appban lép vissza (a szokásos úton a Kezelések
lapra), nem a beágyazott PDF-nézegetőben — az angol „szomorú fájl” hibaoldal eltűnik.

## Current state
- `app/src/pages/PreviewPage.tsx` — az `<iframe title="Kezelési terv előnézet"
  src={pdfInstance.url}>` ugyanaz a DOM-elem marad, amikor a `usePDF()` új blob-URL-t ad; egy
  meglévő iframe `src`-cseréje a szülő böngésző-előzményébe kerül, a régi blob-URL viszont
  ekkorra visszavont.
- `app/src/pages/PreviewPage.tsx` `updatePdf(tervDocument)` effekt — a sablonok és a
  fogtérkép-PNG a mount UTÁN töltődnek be, tehát egyetlen Előnézet-megnyitás alatt is több
  URL-csere történik.
- `app/src/pages/PreviewPage.pdfHiba.test.tsx` — a `vi.hoisted` mutálható `usePDF` mock
  mintája; a `PreviewPage.test.tsx` mockja állandó URL-t ad, azon ez a viselkedés nem
  figyelhető meg.
- `app/src/pages/tervReszletei/MentettPdfPanel.tsx` — a másik PDF-iframe; ott a
  `usePlanPdfObjectUrl` verzióváltáskor előbb `null`-ra állítja az URL-t, az iframe unmountol,
  tehát nincs `src`-csere élő elemen.

## Approach
Egyetlen fájl: `app/src/pages/PreviewPage.tsx` — az előnézet-iframe URL-változáskor új
elemként jöjjön létre (`key` a blob-URL-en), ne a meglévő elem `src`-je cserélődjön.
Változatlan: a `usePDF()` hívás és a stale-URL szerződés (`app/src/pdf/CLAUDE.md` — hibán át
megmarad a régi `url`, a letöltés/véglegesítés ekkor tiltott), a Letöltés-link, a checklist, a
`MentettPdfPanel`. Hatókör-határ: a sikerképernyő utáni Vissza
(`sikerkepernyo-nyomtatas-letoltes`), a véglegesítés közbeni frissítés
(`frissites-veglegesites-kozben-ures-elonezet`) és a blob-URL-cserék számának csökkentése nem
ide tartozik.

## Decisions
- Iframe-remount kulccsal — mert egy frissen beszúrt iframe első betöltése a saját
  about:blank bejegyzését váltja fel, nem ad új előzmény-bejegyzést; nem `popstate`-figyelés,
  mert iframe-en belüli előzmény-lépésre a szülő `popstate`-je nem sül el, és az app ma sehol
  nem nyúl a history-hoz; nem `contentWindow.location.replace()`, mert az a beágyazott
  PDF-nézegető dokumentumához nyúlna, több kód ugyanazért.
- A Vissza a természetes előzményre visz (a szokásos úton Kezelések), nem kényszerítjük mindig
  a `/terv`-re — a Kezdőlap piszkozat-kártyájáról érkező dokit egy felülírt Vissza meglepné.
- A PDF-nézegető a frissüléskor az első oldalra ugrik — ez ma is így van (az `src`-csere is
  újratölti a dokumentumot), a változás nem ront rajta.

## Verification
- [ ] tests — a PDF frissülése után az előnézet-iframe MÁS DOM-elem, mint előtte (nem ugyanazon
      elem `src`-je íródik át); a Letöltés-link és a véglegesítés-gomb viselkedése változatlan
- [ ] typecheck/lint
- [ ] docs-check
- [ ] kézi, izolált Chrome-ban: Kezelések → Előnézet, a PDF betöltése után egyetlen
      böngésző-Vissza a Kezelések lapra visz, hibaoldal nélkül; a nézegető görgethető marad
