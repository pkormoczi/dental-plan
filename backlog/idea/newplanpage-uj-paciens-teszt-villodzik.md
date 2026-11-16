# newplanpage-uj-paciens-teszt-villodzik
Type: chore
Source: CI deploy-futás 2026-11-16 17:20 (run 43917358722), demo-export-akcio implementálása közben talált

Az `app/src/pages/NewPlanPage.test.tsx` „"+ Új páciens" megerősítést kér mentetlen piszkozatnál --
Mégse megtartja” tesztje a 2026-11-16 17:20-as CI-futásban elbukott („Unable to find an accessible
element with the role "button" and name "Mentés"”), egy csak backlogot érintő commiton; ugyanez a
kód előtte és utána zölden futott. A keresés a teszt végén, az „Új páciens” dialógusban, a név
begépelése után szinkron `getByRole`-lal történik, ami terhelt runneren megelőzheti a dialógus
végleges állapotát. Elvárt: a teszt determinisztikusan zöld, egy villódzó teszt ne bukjon el egy
docs-only pusht és vele a Pages-deployt. Ha a vizsgálat valódi alkalmazáshibát talál (a gomb
tényleg nem jelenik meg), a tétel `bug`-gá válik.
