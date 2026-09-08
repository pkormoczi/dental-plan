# manual-checks-fokuszgyuru-snippet-outline-style
Type: chore
Source: /implement-batch futás (2026-09-08), a pdf+keyboard-a11y szeletek végrehajtása közben

A `.claude/skills/manual-checks/keyboard-a11y.md` „Fókuszhoz kötött megjelenés + wrapper
fókuszgyűrű” snippetje `wrapperOutlineWidth: '0px'`-et vár fókusz előtt, de a böngésző az
`outline-width` computed értékét `outline-style: none` mellett is megtartja — a 2026-09-08-i
menetben a még nem fókuszált fogtérkép-toolbaron `3px` jött vissza, holott fókuszgyűrű nem
látszott (`outlineStyle: 'none'`), Tab után pedig `solid` / `2px`. A snippetnek az
`outlineStyle` váltását kell néznie, nem a szélességet; enélkül a következő böngészős menet
hamis találatot ad ott, ahol az app helyes. A szelet másik elavult elvárását (a
tételfelvitel-ciklus utáni `isSearch === true`) NEM ez a tétel rendezi — az a már tervezett
`tetelfelvitel-ciklus-doksi-atvezetes` scope-jában van.
