# demo-menu-megszuntetese
Type: feature
Source: doki felvetés 2026-11-19, a demo-lebontasa kettébontása; desktop-app-migration-plan-final.md §8

A fő navigáció DEMO menüpontja megszűnik, a Pages-demóban és a telepített appban egyaránt. A telepített appban ma három fül él alatta — Funkciók, Összes terv, Változásnapló —, ezek valódi funkciók, és saját helyet kapnak. A migrációs terv §8 kiindulópontja: az Összes terv saját útvonalra (`/tervek`) költözik, a Funkciók súgó jelleggel, a Változásnapló saját útvonalon marad; hogy pontosan hová kerülnek (fő menü, Beállítások, súgó-link), az a tervezés döntése. A Pages-demó két demó-only füle (Filerendszer, és az Adatkezelés a demó-exporttal) a `demo-lebontasa`-ig megmarad, mert a doki a telepítési próbához onnan exportál — nekik is új hely kell, amíg a demó él. A régi `/demo/...` címek ne vezessenek üres oldalra. Nem tartozik ide a `DemoStorage`, a demó-sáv és a Pages-deploy megszüntetése (`demo-lebontasa`).
