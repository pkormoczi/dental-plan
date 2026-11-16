# manual-checks-keresolista-ellenorzes
Type: chore
Source: review:2026-11-16-manual-checks-keyboard-a11y-megerosito-ablak#2

A `keyboard-a11y` böngészős szelet (`.claude/skills/manual-checks/keyboard-a11y.md` „A kritikus
ciklus”) a tételkereső találati listájának bezárulását a `popoverOpen` mezővel méri, ami a lebegő
Radix-elemet (`[data-radix-popper-content-wrapper]`) keresi. A tervszintű kereső listája viszont
helyben, nem lebegő elemként jelenik meg: a 2026-11-16-i menetben a lista látható volt, miközben a
`popoverOpen` hamis. A ciklus „`popoverOpen === false`” várt eredménye így akkor is teljesül, ha a
lista nyitva maradt, az ellenőrzés nem bizonyít semmit. Elvárt: a szelet a lista nyitottságát a
ténylegesen látható opciókon mérje, és a leírás mondja ki, mikor várható lebegő elem (a soron
belüli, portál-módú kereső) és mikor nem. Alkalmazáskód nem változik.
