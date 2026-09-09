# kereso-nem-talal-ra-kategorianevre
Type: bug
Source: review:2026-08-25-doctor-review-uj-terv#1

A Kezelések lépés tétel-keresője csak a tétel saját nevére talál rá, a kategórianévre nem —
pedig a doki jellemzően a kategória köznyelvi nevére emlékszik (pl. "fogkő" a
"Fogkőeltávolítás" kategórián belüli, más nevű tételekre). Nulla találat esetén csak az
"Egyedi tétel felvétele" opció marad, ami könnyen felesleges, kézzel árazott egyedi sorhoz
vezet egy ténylegesen karbantartott árlistai tétel helyett — pénzügyi pontossági kockázat.

Repró: Kezelések lépés, keresés "fogkő"-re — nulla találat, holott az árlistán van
"Fogkőeltávolítás" kategória "Komplett kezelés: ultrahang, sófúvás..." és "Ismételt kezelés
3-6 havonta" tételekkel.

Ok: `app/src/pages/planEditor/ItemPicker.tsx:95` kizárólag `nevEgyezik(x.nev, nq)`-t hívja,
ami (`app/src/domain/search.ts:30-31`) csak a tétel saját nevét nézi, a kategórianevet sosem.

Javasolt irány (a jelentésből): a keresés terjedjen ki a kategórianévre is, vagy nulla találat
esetén jelenjen meg utalás a helyes tételekre — mindkettő a meglévő `nevEgyezik` hívás
bővítése, nem új funkció.
