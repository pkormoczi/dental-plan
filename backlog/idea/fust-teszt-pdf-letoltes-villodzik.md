# fust-teszt-pdf-letoltes-villodzik
Type: chore
Source: mac-intel-tamogatas implementálása közben talált (release próbafutás, 2026-11-17)

Az `app/e2e/fust.spec.ts` „egy seed-terv előnézetén a PDF saját blob: URL-ről betölt…” tesztje az
arm64 Mac-runneren egyszer `interrupted` letöltési állapotot adott `completed` helyett (release run
44148231341, 2. próba; a Playwright-kimenet a `fust-teszt-macos-latest` run-artifactban), miközben
ugyanaz a job a 44143876059-es futásban 8/8 zöld volt, és az Intel- és a Windows-runner is átment
rajta. A bukás a tag-kiadást is megállítaná, mert a `publish` minden build-jobra vár. Gyanú
(nem igazolt): az előnézet blob-URL-je az iframe `src`-jének kiolvasása és a main process
`downloadURL`-je között újragenerálódik és revoke-olódik. Elvárt: a teszt stabilan zöld lassú
vagy terhelt runneren is, a PDF-tartalom (NotoSans, logó) ellenőrzése nem gyengül. Nem tartozik
ide: az előnézet termékviselkedésének változtatása.
