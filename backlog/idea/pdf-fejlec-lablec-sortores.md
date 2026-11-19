# pdf-fejlec-lablec-sortores
Type: bug
Source: felvetés 2026-11-19, PDF-fejléc képernyőkép alapján

A PDF fejlécének rendelő-blokkja és a lábléc bal blokkja a szélesség mentén tördel, szótagolva:
alapbeállítással a fejléc így jön ki: „1117 Budapest, Móricz Zsigmond / körtér 15. 3/8 / +36 70 617
3172 · istvan@drmando- / ki.hu” — az e-mail-cím kötőjellel kettétörik, a láblécben a „Zsig-mond”
szó. Elvárt: a fejléc négy sora tartalmi határon törjön — irányítószám, város / utca, házszám /
telefon / e-mail —, a lábléc három sora: rendelő neve / címe / Adószám: … · Cégjegyzékszám: …
(az adószám és a cégjegyzékszám mezői már léteznek a Beállításokban és nyomtatódnak). Szót,
e-mail-címet sosem kötőjelez szét a nyomtatvány. A cím ma egyetlen szabadszöveges mező
(`rendelo.cim`); hogy a vesszőnél törjön vagy külön mezőkre bomoljon, a /plan dönti el.
