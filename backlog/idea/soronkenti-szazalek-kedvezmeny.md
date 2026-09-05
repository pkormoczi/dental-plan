# soronkenti-szazalek-kedvezmeny
Type: feature
Source: doctor-review papirrol (2026-09-05), 4. megállapítás
Kerdes: A „koronára 10%” kedvezményt eddig hogyan írtad az Excelbe — a sorban csökkentett árral, vagy a végén egy „kedvezmény” sorral? Mutasd meg egy régi terven.

A papíron a kedvezmény százalékban áll („koronára 10% kedv.”), a felületen viszont nincs mező,
ahova százalék írható: a soron csak Ajánlati ár van (`LineRow`), a terv-szintű „Egyedi végösszeg”
blokk pedig összeget vár. A doki fejben szorzott — 95 000 → 85 500 és 135 000 → 121 500 —, a
„−10%” jelvény (`app/src/domain/sorElteres.ts`) utólag, az árból számolva igazolta vissza. Saját
szavaival: „pont ez az, amiben az Excelben is elrontottam régen” — egy szerződéses dokumentumon
fejszámolt ár. Az adott összegű kedvezmény sehol nem látszik egy számban („mennyit engedtem
összesen?”). Irány: az Ajánlati ár mező fogadjon el „−10%” alakú bevitelt, vagy a jelvény mellé
egy kis „%” gomb, ami százalékot kér és árat számol; a Mindösszesen alatt „Kedvezmény összesen”.
Siker: a „koronára 10%” számolás nélkül bevihető, és a kedvezmény összege egy helyen látszik.
