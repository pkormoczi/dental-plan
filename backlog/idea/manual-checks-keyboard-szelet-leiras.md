# manual-checks-keyboard-szelet-leiras
Type: chore
Source: review:2026-11-16-manual-checks-keyboard-a11y#1

A `keyboard-a11y` böngészős szelet leírása (`.claude/skills/manual-checks/keyboard-a11y.md` „A
kritikus ciklus”) a katalógus-tétel felvételét „gépel → ArrowDown → Enter” lépéssorral írja le.
A kereső ma gépeléskor már kiemeli az első találatot, így a leírt ArrowDown az „Egyedi tétel
felvétele” sorra lép, és a kör egyedi sort vesz fel a katalógus-tétel helyett. A ciklus megállói
ettől még helyesek, de a szelet így nem azt méri, amit állít, és a katalógus-tétel útja
ellenőrizetlen marad. Elvárt: a katalógus-tétel körei Enter-rel induljanak, az egyedi sor
ellenőrzése külön lépés maradjon, egyértelmű várt eredménnyel. Alkalmazáskód nem változik.
