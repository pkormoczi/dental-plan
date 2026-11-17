# lassu-pricelistadmin-tesztek
Type: chore
Source: mac-intel-tamogatas implementálása közben talált (release próbafutás, 2026-11-17)

Az `app/src/pages/PriceListAdminPage.test.tsx` kategória-panel és „+ Új tétel” dialógus tesztjei a
GitHub Windows-runnerén ~4 s-osak, a lassú `macos-26-intel` runneren viszont 15–41 s-ig futottak,
és a vitest 15 s-os `testTimeout`-jába ütköztek: az egyik próbán 1, a másikon 12 bukás, az összes
ebből a fájlból, a teljes készlet ott 349–685 s volt. Most nem okoz piros CI-t, mert a `release.yml`
az Intel-runneren kihagyja a `npm test`-et, de lassú vagy terhelt gépen a kapu ugyanígy
villódzhat. Elvárt: ezek a tesztek lassú gépen is bőven a timeout alatt maradnak, a megfigyelt
viselkedés ellenőrzése nem gyengül, a globális `testTimeout` nem emelkedik. A reprodukcióhoz
javasolt (még nem kipróbált) út: a készlet helyben, CPU-korlátos konténerben (pl. `--cpus=1`).
