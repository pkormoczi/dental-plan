# checklist-callout-szoveg-kontraszt
Type: bug
Source: manual-checks visual-css szelet (2026-09-07), /implement-batch futásból

Az `#/elonezet` puha checklist-dobozainak szövege 3,79–3,95:1 kontrasztot ad, az
`app/src/CLAUDE.md` szerint nem opcionális WCAG AA 4,5:1 alatt. Mért érték: szövegszín
`rgb(171, 100, 0)` a Radix amber Callout saját washén; a 3,79 a jelvény-feliraté (11,4 px), a
3,95 a tétel-címeké (11,4 és 13,3 px). A hatókör NEM a checklist: a
`VeglegesitesChecklist.tsx` `SULYOSSAG_SZIN` a `soft` súlyossághoz a Radix `color="amber"`
Calloutját rendeli, és ez a szín 23 helyen fordul elő (`PatientPage.tsx` öt Callout-ja,
`ToothPickerPopover.tsx`, a sikerképernyő cimke-/piszkozattörlés-jelzései, jelvények) — a
javításnak a tokennél kell eldőlnie, nem komponensenként. Pont a puha figyelmeztetések azok,
amiket a doki átfut véglegesítés előtt; ha halványak, átugorja őket. Elvárt: az amber Callout
szövege és jelvény-felirata érje el a 4,5:1-et a saját washén. jsdom alatt strukturálisan nem
fogható (nincs Radix CSS a tesztkészletben), a bizonyíték a `/manual-checks visual-css`
szelete. Nem tartozik ide a Calloutok szövegezése (`checklist-figyelmeztetes-szovege`), a
súlyosság-besorolás, és a `#/terv` halvány slate szövege (`terv-lap-halvany-szoveg-kontraszt`).
