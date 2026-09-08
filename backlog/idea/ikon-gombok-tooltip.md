# ikon-gombok-tooltip
Type: feature
Source: doki felvetés

A csak ikonos gombokon nincs látható magyarázat: a doki nem tudja kattintás előtt, mit csinálnak.
Ilyen a fogválasztó célkeresztje, a kuka a soron / fázison / piszkozaton / kategórián, a csillag a
„gyakori" jelölésnél, a szem az árlista aktív–inaktív kapcsolójánál, a fel–le nyilak és a
visszaállító / frissítő ikonok. `aria-label` mindenhol van, de az csak képernyőolvasónak szól;
natív `title` csak szórványosan (LineRow, FazisMegjegyzes) — az is késve jelenik meg és kilóg a
felület stílusából. A kérés: egérrel fölé állva minden ikon-gomb mondja el egy rövid mondatban,
mit tesz, beleértve az állapotfüggőket (a csillag „gyakoriba tesz" vs. „kivesz", a szem „elrejt az
ajánlásból" vs. „visszakapcsol"). Egységes megoldás kell — a Radix Themes `Tooltip` már elérhető —
nem újabb szórvány `title`; a tooltip szövege és az `aria-label` ne mondjon mást. Kizárt scope: a
feliratos gombok, a mezőcímkék és a fogtérkép fogszámai — ez a tétel csak a felirat nélküli
ikon-vezérlőkről szól.
