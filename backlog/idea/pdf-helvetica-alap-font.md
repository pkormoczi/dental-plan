# pdf-helvetica-alap-font
Type: chore
Source: manual-checks pdf szelet (2026-09-07), /implement-batch futásból

A generált PDF `/BaseFont` listája a két beágyazott NotoSans mellett
(`KTZEST+NotoSans-Regular`, `MOHCXA+NotoSans-SemiBold`, `/FontFile2` × 2) `Helvetica`-t is
tartalmaz, beágyazás nélkül. A `pdf/CLAUDE.md` szerint a Helvetica nem tud `ő`/`ű`, és ez a
hiba csak a kész PDF-en látszik — a mért menetben viszont minden glyph helyesen renderelt
(„Tőkés Ödönné”, „Gyökérkezelés felső őrlőfogon, űrtömítéssel”), tehát vélhetően egy nem
használt pdfkit-alapértelmezés kerül a font-erőforrások közé, nem tényleges szövegfutam.
Ezt igazolni kell: ha mégis van olyan szövegfutam, ami az alapértelmezett fontra esik
vissza, az egy aláírandó dokumentumon néma glyph-vesztés; ha nincs, egy teszt rögzítse a
tényt, hogy a `hasHelvetica: true` a jövőben ne tűnjön riasztásnak minden manual-checks
menetben. Mért értékek: `bytes: 931839`, `fontFile2Count: 2`, `hasHelvetica: true`,
`objStmCount: 0` (a nyers regex-vizsgálat tehát megbízható). Nem tartozik ide a font-készlet
bővítése vagy a NotoSans lecserélése.
