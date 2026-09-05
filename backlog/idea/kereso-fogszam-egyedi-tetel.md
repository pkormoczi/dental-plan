# kereso-fogszam-egyedi-tetel
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 4. megállapítás
Kerdes: Amikor a kezelést gépeled, először a beavatkozás neve jut eszedbe és utána a fog, vagy fordítva — a papíron eddig melyiket írtad előbb?

A doki első megfogalmazása („tétel felvétele után a kurzor ugorjon az új sor Fog mezőjébe”) a
tételfelvitel billentyűzetes ciklusát törné el, amit az `app/src/CLAUDE.md` kizár — ezért a tétel
a jelentés megengedő irányát viszi. Ma: tétel felvétele után a fókusz a keresőben marad
(`ItemPicker.tsx` `finishPick`), a doki a következő lépésnek a fogszámot gondolja, és a „36”-ot a
keresőbe gépeli. A kereső „Nincs találat.”-ot ír, és kiemelve kínálja az „Egyedi tétel felvétele:
»36«” sort (nulla találatnál ez a 0. index) — Enterre egy „36” nevű, 0 Ft-os sor keletkezik. Repro:
„tomes” → Enter → azonnal „36” gépelése. Elvárt: a ciklus megmarad, de csupa szám (fogszám-alakú
token, `parseTeeth`) keresésre ne az egyedi tétel legyen a kiemelt választás, hanem egy nem
választható tipp-sor a Fog mezőre — a „Nincs találat.” és a „még N találat” sor mintájában, ami
nincs benne az `opcioSzam`-ban. Ez a 3. megállapítás (fogszám nélkül kiadott korona) fő oka. Ha a
Kerdes válasza „mi → mi → mi”, a tétel elvethető. Nem ide tartozik: a fókusz áthelyezése a Fog
mezőre.
