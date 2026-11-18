# lanc-fejlec-hianyos-jelzes
Type: feature
Source: fs-verzio-manifest implementálása közben talált

A telepített appban, ha egy terv-lánc legfrissebb verziója még hiányos (a másik gépről szinkronizálódik), ezt ma csak a kinyitott lánc verziósora mutatja („Szinkron folyamatban vagy hiányos” jelvény, Újraellenőrzés). A csukott lánc fejlécén csak a sorszám, a dátum és egy magyarázat nélküli „—” összeg áll, így a doki nem látja, miért nincs összeg, és miért nem indíthat új verziót, amíg ki nem nyitja a láncot. A fejléc jelezze ugyanezt az állapotot (pl. a verziósor jelvényével), a nyitott lánc viselkedése nem változik. A Pages-demót nem érinti: ott minden verzió teljes.
