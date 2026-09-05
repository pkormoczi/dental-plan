# ket-ful-piszkozat-utolso-iro-nyer
Type: bug
Source: 2026-09-05 doctor-review (első megnyitás) 14. megállapítás

Ugyanaz a piszkozat két böngészőfülön megnyitva: az automatikus mentés a másik fülön felvett
sorokat jelzés nélkül eldobja. Repró: a Teszt Elek-piszkozat megnyitva két fülön; a 2. fülön
fogkő sor felvéve („Piszkozat mentve 19:20”, 199 000 Ft), majd az 1. fülön panoráma sor felvéve
(184 000 Ft) — a tárolt piszkozatban csak az 1. fül három sora marad, a fogkő elvész, és a 2.
fül továbbra is 199 000 Ft-ot mutat, mintha bent lenne. A doki a 2. fülön dolgozva biztos benne,
hogy a fogkő szerepel a tervben; a véglegesítés az 1. fül állapotát adja ki. Elvárt viselkedés:
egyik fülön felvett sor sem tűnik el csendben — a piszkozat-írás előtt a tárolt piszkozat
frissessége ellenőrizhető (időbélyeg), eltérésnél a doki dönt (Betöltés / Felülírás), vagy a
másik fül a `storage` eseményre frissül. Nem tartozik ide a tartósan félretett tervek kérdése
(`tobb-felretett-terv`) és az új terv indításakor felülírt piszkozat (`uj-terv-kiemelt-elso-sor`
kizárt scope-ja).
