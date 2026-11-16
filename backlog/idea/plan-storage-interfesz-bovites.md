# plan-storage-interfesz-bovites
Type: chore
Source: desktop-app-migration-plan-final.md §4.3 és §10.0

A `loadPlanPdf` és a `loadLatestTemplateByBase` ma csak a `StorageContext`-en él demó-mezőként,
pedig a telepített appban is kellenek; a `listTemplates()` pedig hiányzik, holott a demó-export és
a FileSystemStorage `sablonok/` listázása is igényli. Mindhárom a `PlanStorage` interfészre kerül,
a `DemoStorage` implementálja. Ugyanekkor a `listVersions()` eredménye `allapot: 'teljes' |
'hianyos'` mezőt kap, ami a `DemoStorage`-ban mindig `teljes`; a hiányos ágat később a
FileSystemStorage tölti ki manifest alapján. A doki számára nincs látható változás.
