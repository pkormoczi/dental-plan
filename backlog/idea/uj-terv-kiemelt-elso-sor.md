# uj-terv-kiemelt-elso-sor
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 8. megállapítás

Az „Új terv indítása” lap üres, még nem érintett keresővel is kiemeli a páciens-lista első sorát
(narancssárga sáv), mintha a doki már választott volna — a persona emiatt nem mert Entert nyomni,
és egérrel kattintott. A kiemelés nem díszítés: a `hi` index kezdőértéke 0
(`app/src/pages/NewPlanPage.tsx`), és Enterre tényleg elindul az új terv a 0. indexű páciensnek —
egy véletlen leütés a legutóbbi páciensnek nyit tervet, ami a meglévő piszkozatát is elviheti.
Repro: Kezdőlap → „+ Új kezelési terv”; kattintás és gépelés nélkül a lista első sora kiemelt.
Elvárt: érintetlen keresőnél nincs kiemelt sor és az Enter nem indít semmit; a kiemelés az első
leütésre vagy az első nyílra jelenik meg, onnantól a gépel → nyíl → Enter ciklus változatlan (a `q`
változásakor futó `setHi(0)` miatt a gépelt keresés első találata továbbra is kiemelt marad).
Gyengébb alternatíva, ha a kiemelés maradna: a kiemelt sor kapjon feliratot („Enter: terv indítása
neki”). Nem ide tartozik a lista sorrendje és a meglévő piszkozat csendes felülírása.
