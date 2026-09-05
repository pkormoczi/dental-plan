# Dental Plan redesign – döntési napló

**Állapot:** 2026-08-18, D606-ig

Ez a fájl a redesign-interjú során meghozott döntéseket tartalmazza kronologikus sorrendben. Ahol egy későbbi döntés explicit módon finomított vagy felülírt egy korábbit, ott **a későbbi döntés az irányadó**. A döntések most szándékosan nincsenek oldalanként/feature-önként kategorizálva; ezt külön következő körben érdemes megtenni.

## Döntések

1. **D1** – Patient-first UI.
2. **D2** – A fő navigáció eredetileg Home / Patients / Price list / Settings; ezt később D46 finomította.
3. **D3** – Páciens részletein két fő tab: `Páciens adatai | Kezelési tervek`.
4. **D4** – A páciensadatok alapból read-only; szerkesztés explicit Edit/Save/Cancel; fallback állapot jelzett.
5. **D5** – Normál megnyitáskor a `Kezelési tervek` az alapértelmezett tab.
6. **D6** – A tervláncok és verzióik közvetlenül látszanak.
7. **D7** – Stabil CTA: `+ Új kezelési terv`; „új terv” = új chain, „verzió” = folytatás.
8. **D8** – Meglévő páciens új terve `Terv adatai` lépéssel indul, utána `Kezelések`.
9. **D9** – A terv páciens-snapshotja szerkeszthető; live master sync csak explicit, soha nem automatikus.
10. **D10** – Snapshot/master eltéréskor kilépésnél mezőszintű összevetés és checkboxos master-frissítés; alapból semmi nincs kijelölve.
11. **D11** – A workflow stepper lépései szabadon kattinthatók.
12. **D12** – `Új verzió` közvetlenül a `Kezelések` lépésre nyit; `Terv adatai` továbbra is elérhető.
13. **D13** – Home `Új kezelési terv` dedikált páciensválasztóra visz.
14. **D14** – Quick new patient valódi Patient/paciensId rekordot hoz létre még a terv előtt.
15. **D15** – Quick patient: név kötelező; születési dátum és telefon opcionális, de látható.
16. **D16** – Duplikációfigyelés intelligens, nem blokkoló; normalizált név + DOB + telefon alapján.
17. **D17** – Páciensválasztó: üres kereső + recent lista; kereső autofókuszban.
18. **D18** – Recent lista a legutóbbi jelentős aktivitást követi.
19. **D19** – Jelentős aktivitás = tényleges tartalmi módosítás, nem egyszerű megnyitás.
20. **D20** – Home minimalista: fő CTA + egy aktív draft + 5 recent páciens.
21. **D21** – Egyszerre pontosan egy aktív draft lehet.
22. **D22** – Új szerkesztési workflow indításakor meglévő draft esetén kötelező guard.
23. **D23** – Finalizált verzió külön, read-only `Terv részletei` nézet.
24. **D24** – `Új verzió` csak a legfrissebb verzióból indítható; régebbiből csak `Másolás új tervként`, linkkel a latestre.
25. **D25** – Copy New Plan másolja a kezelési tartalmat, de az aktuális live patient masterből készít új snapshotot; új chain; Plan Details-re nyit.
26. **D26** – Generált tervnév: `YYYY.MM.DD – Kezelési terv`.
27. **D27** – A generált cím véglegesíthető; csak soft suggestion, hogy legyen beszédesebb.
28. **D28** – Új verzió megtartja a chain címét; copy friss aktuális dátumos generált címet kap.
29. **D29** – Fő pácienskereső csak páciensmezőkben keres, tervadatokban nem.
30. **D30** – Pácienslista alfabetikus.
31. **D31** – Kompakt sorok: név / DOB / telefon; csak kivétel-badge-ek; teljes sor kattintható.
32. **D32** – Verziósorok navigation-only elemek.
33. **D33** – `Terv részletei`: strukturált read-only tartalom + total + fázisok + meta; PDF hangsúlyos.
34. **D34** – Latest verzión elsődleges `Új verzió`, másodlagos PDF, overflow copy; historicalnál PDF + copy/latest.
35. **D35** – Felső vízszintes főnavigáció.
36. **D36** – Teljesen kattintható breadcrumb domain-hierarchia + workflow stepper.
37. **D37** – Draftból szabadon ki lehet lépni; autosave megőrzi; konfliktus csak új szerkesztési task indításakor.
38. **D38** – Stepper végleges címkéi: `Terv adatai → Kezelések → Előnézet és véglegesítés`; desktopon preview bal, checklist jobb.
39. **D39** – Finalization checklist kompakt read-only összegzés + validációk/warningok.
40. **D40** – Sikeres finalization után `Terv részletei`.
41. **D41** – Páciens szerkesztése mindig explicit.
42. **D42** – Páciensek oldalon külön `+ Új páciens` teljes form; quick create marad minimalista.
43. **D43** – Teljes pácienslétrehozás után egyszer `Páciens adatai` nyílik; később normál megnyitáskor `Kezelési tervek`.
44. **D44** – `Páciens adatai` tabon nincs duplikált új-terv CTA.
45. **D45** – Üres kezelési terv listán first-plan CTA jelenik meg.
46. **D46** – Fő nav végleges nevei: `Kezdőlap | Páciensek | Kezelések és árak | Beállítások`.
47. **D47** – `Kezelések és árak` tabjai: `Tételek | Kategóriák`; Tételek az alapértelmezett.
48. **D48** – Tételszerkesztés AS-IS inline accordion; teljes editor a sor alatt.
49. **D49** – Egyszerre csak egy tétel-accordion lehet nyitva.
50. **D50** – Tétel editor explicit Save/Cancel; dirty váltás guarddal.
51. **D51** – Kategóriák kompakt lista + accordion; sorrend D76 szerint nyilakkal.
52. **D52** – Kategória-átrendezés explicit mentéssel + dirty guard.
53. **D53** – Beállítások tabjai: `Rendelő | Orvosok | Dokumentum | Tárolás`.
54. **D54** – Beállítások alapértelmezett tabja: Rendelő.
55. **D55** – Logo a Rendelő beállításokhoz tartozik.
56. **D56** – Minden settings tab saját explicit Save/Cancel + dirty guard.
57. **D57** – Orvosok: lista + accordion; egyszerre egy nyitva.
58. **D58** – Egy aktív default orvos; új tervek ezt preselectelik; inaktív orvos historical marad.
59. **D59** – Globális nyelv- és pénznem-default a Dokumentum beállításokban; egymástól független; tervenként felülírható.
60. **D60** – Német nyelv mindig támogatott; feature flag nem kell.
61. **D61** – Globális validity default napokban; tervben konkrét valid-to szerkeszthető.
62. **D62** – New/copy/version mindig friss aktuális kiadási/érvényességi dátumokkal indul.
63. **D63** – Dokumentum tab tetején defaultok, alatta hosszú template accordions; közös Save/Cancel.
64. **D64** – Tárolás user-centered státusz + mappa; normál UI-ban nincs API/schema/debug/demo filesystem képernyő.
65. **D65** – Root storage hiánya hard startup gate.
66. **D66** – Nincs setup wizard a tárolás beállításán túl.
67. **D67** – Hiányzó kötelező business config a finalizationt blokkolja, a szerkesztést nem.
68. **D68** – `Terv adatai` stacked sections: cím, páciens snapshot, dokumentumnyelv, pénznem, orvos, dátumok.
69. **D69** – Snapshot/master eltérés mezőszinten, visszafogottan jelezve.
70. **D70** – Kezelésszerkesztő alapvetően AS-IS: kis fog-popover, felső fogtérkép, fázisonként kereső, mennyiség-sync.
71. **D71** – Felső fogtérkép alapból összecsukva.
72. **D72** – Fázisok egymástól függetlenül nyithatók/csukhatók; több nyitva lehet; collapsed header: név/count/total.
73. **D73** – Fázisok alapból mind nyitva.
74. **D74** – Egyetlen `Fázis hozzáadása` gomb a lista végén.
75. **D75** – Fázissorrend ↑↓ nyilakkal.
76. **D76** – Kategóriasorrend ↑↓ nyilakkal, explicit mentéssel.
77. **D77** – Fázis törlés trash + confirmation.
78. **D78** – Kezelési tétel törlés trash ikonnal.
79. **D79** – Sor törlése azonnali + Undo; teljes fázis törlése confirmationnel.
80. **D80** – Egyedi kezelési név finom jelzés + reset.
81. **D81** – Listaár read-only referencia; ajánlati egységár szerkeszthető; eltérés és reset látszik.
82. **D82** – `Becsült ár` inline checkbox az ajánlati ár alatt.
83. **D83** – Mennyiség/fog parser warning + sync ikon; nincs folyamatos autosync státuszszöveg.
84. **D84** – Gyakori tételek AS-IS quick gombok a kereső alatt.
85. **D85** – Alap fázisnév: `N. kezelés`, szerkeszthető.
86. **D86** – Fázisnév inline pencil, autosave.
87. **D87** – Tételleírás AS-IS `+ leírás`; lokalizált default snapshotból indul; terven belül szerkeszthető.
88. **D88** – Egyedi leírásnál nincs külön label; kompakt reset van.
89. **D89** – Nyelvváltás az érintetlen defaultokat váltja, manuális szöveg marad.
90. **D90** – Potenciálisan rossz nyelvű egyedi szöveg finalizationkor soft warning.
91. **D91** – HUF/EUR ajánlati árak külön tárolódnak; nincs FX; váltás visszaállítja az adott pénznem saját override-ját.
92. **D92** – Terv összegzés csak a fázislista végén.
93. **D93** – Summaryban egyedi végösszeg és előleg egymástól független; jelentését később D308–D313 pontosította.
94. **D94** – `Leírások nyomtatása` plan-level toggle a bottom summary/settingsben.
95. **D95** – Fázismegjegyzés progressive disclosure.
96. **D96** – Fázismegjegyzés mindig páciensnek szóló tartalom.
97. **D97** – Fázismegjegyzés mindig nyomtatódik; leírás-toggle csak tételleírásokra hat.
98. **D98** – Nincs általános tervszintű megjegyzés.
99. **D99** – Új tételnél első fókusz a Fog mező.
100. **D100** – Enter a Fog mezőben visszavisz a fázis keresőjére.
101. **D101** – Új fázis létrehozásakor kereső autofókusz.
102. **D102** – Tételsorok sorrendje nem átrendezhető.
103. **D103** – Üres fázis draftban engedett, finalizationt blokkolja és navigálható hiba.
104. **D104** – Friss Treatments draft egy nyitott első fázissal és fókuszált keresővel indul.
105. **D105** – Fog mező minden tételnél opcionális.
106. **D106** – Fog mező free text; felismeri az érvényes fogszámokat, de az arbitrary textet is megőrzi.
107. **D107** – Ugyanaz a tétel többször is hozzáadható.
108. **D108** – Nincs tétel-duplicate action.
109. **D109** – Package egyelőre csak metadata; valódi bundle funkció backlog.
110. **D110** – Package checkbox magyarázata: jövőbeli csomagkezeléshez előkészítés.
111. **D111** – Inaktív tétel új tervbe nem választható; history változatlan.
112. **D112** – Active és Frequent egymástól független állapot.
113. **D113** – Draftban közben deaktivált tétel megmarad, warninggal finalizálható; törlés után már nem adható vissza újra.
114. **D114** – Árlista-változás nem módosítja automatikusan a draft snapshotot; explicit refresh kell.
115. **D115** – Listaár refresh az ajánlati árat csak default-following állapotban módosítja.
116. **D116** – Név/leírás változásnál snapshot marad; explicit refresh; manuális override nem íródik felül.
117. **D117** – Field refresh + row refresh csak nem manuális mezőkre hat automatikusan.
118. **D118** – Sor szintjén eltérésszám + refresh ikon.
119. **D119** – Kategória is snapshot; row refresh frissítheti.
120. **D120** – Row refresh popover felsorolja a változásokat.
121. **D121** – Refresh popover old→new konkrét értékeket mutat; hosszú leírások rövidítve.
122. **D122** – Field-level refresh azonnal alkalmazódik.
123. **D123** – Árlista-tételek nem törölhetők, csak deaktiválhatók.
124. **D124** – Aktiválás azonnali; deaktiválás confirmationt kér.
125. **D125** – Inaktív tétel továbbra is szerkeszthető adminban.
126. **D126** – Inaktív tételek muted megjelenéssel látszanak és quickfilterrel szűrhetők.
127. **D127** – `Új tétel` AS-IS minimal modalból indul, majd az editor nyílik meg.
128. **D128** – Új tétel kezdetben inaktív.
129. **D129** – Első sikeres teljes mentés aktiválja az új tételt.
130. **D130** – Első aktiválás minimumfeltétele: HU név, kategória, HUF ár; többi opcionális.
131. **D131** – 0 Ft valid ár; első aktiváláskor explicit confirmation.
132. **D132** – EUR tervbe EUR listaár nélküli tétel is felvehető; manual offered ár megadható; offered hiánya finalizationt blokkol.
133. **D133** – DE tervben hiányzó DE névnél editor HU fallbacket mutat, de finalization előtt kötelező terv-specifikus DE név.
134. **D134** – Hiányzó DE leírás egyszerűen kimarad; nincs fallback és warning.
135. **D135** – Később megjelenő DE default nem írja felül a custom DE tervnevet; current + refresh lehetőség.
136. **D136** – Reset törli a manual override-ot és default-following állapotba visz.
137. **D137** – N megváltozott tételnél top info bar + jump first.
138. **D138** – Árlista-eltéréssel is finalizálható, soft warninggal.
139. **D139** – `Új verzió` pontosan az előző snapshotból indul, auto-refresh nélkül.
140. **D140** – `Másolás új tervként` másolja a szakmai struktúrát/manual override-okat, de default-following árlistaértékeket aktuálisra frissít.
141. **D141** – Inaktív másolt tételek megmaradnak erősebb warninggal és finalizálhatók.
142. **D142** – Inaktív tétel finalizationkor soft warning.
143. **D143** – Örökölt manual offered ár finom markerrel látszik edit/resetig.
144. **D144** – Checklist info mutatja az örökölt manual offered tételek számát.
145. **D145** – Custom név/leírás esetén nincs inherited marker.
146. **D146** – Fázismegjegyzés másolódik és inherited marker marad editig.
147. **D147** – Checklist info mutatja az örökölt fázismegjegyzéseket.
148. **D148** – Draft autosave státusz látható.
149. **D149** – Startup Home-on aktív draft block jelenik meg.
150. **D150** – Continue az utolsó workflow-lépésre visz vissza.
151. **D151** – Draft discard trash az editorban; Home-on overflow; confirmation szükséges.
152. **D152** – Editorból discard után páciens terveihez térünk vissza; Home-ról Home-on maradunk.
153. **D153** – Quick-created páciens draft eldobása után is megmarad.
154. **D154** – Páciens csak akkor törölhető, ha nincs finalizált terve és nincs aktív draftja.
155. **D155** – Páciens törlés csak a patient detail overflowban érhető el.
156. **D156** – Nincs patient merge funkció.
157. **D157** – Live patient master módosítása nem frissíti automatikusan az aktív draftot.
158. **D158** – Master→draft frissítés mezőszintű refresh + aggregate comparison.
159. **D159** – Aggregate comparisonben semmi nincs alapból kijelölve; van Select all.
160. **D160** – Master→plan és plan→master két külön, explicit irányú művelet.
161. **D161** – Ugyanaz a diff plan→master prompt csak egyszer jelenik meg, amíg a diff nem változik.
162. **D162** – Final checklistben patient/master eltérés info szinten megjelenik.
163. **D163** – Finalizationkor újraolvassuk a patient mastert.
164. **D164** – Finalizationkor újraolvassuk az árlistát.
165. **D165** – Finalization atomikus PDF+JSON mentés; hiba esetén nincs verzió, draft megmarad, partial file cleanup történik.
166. **D166** – Sikertelen finalization nem fogyaszt verziószámot.
167. **D167** – Finalization lock/idempotence; gomb progress alatt disabled.
168. **D168** – Draft csak durable/ellenőrzött final siker után törlődik.
169. **D169** – Ha commit sikeres, de draft cleanup hibázik, finalization sikeresnek számít; cleanup később automatikusan.
170. **D170** – Sikeres finalization után PDF nem nyílik meg automatikusan.
171. **D171** – Egyszeri success banner jelenik meg.
172. **D172** – Final detail sorrend: total → phases → metadata.
173. **D173** – Final detailben fázisok alapból nyitva, de összecsukhatók.
174. **D174** – Read-only detail sorban list/offered megjelenítés; később D282/D285 finomítja.
175. **D175** – Final detail mindig a tárolt descriptions-t használja.
176. **D176** – Final detail tooth map alapból collapsed.
177. **D177** – Final detail pénzügyi summary később D307+ döntések szerint finomítva.
178. **D178** – Fázis header: item count + subtotal.
179. **D179** – Historical patient snapshot mellett subtle master-diff link.
180. **D180** – Detail headerben patient name + DOB; teljes historical snapshot lejjebb.
181. **D181** – Prev/next version + all versions navigáció.
182. **D182** – Nincs verzió-diff funkció.
183. **D183** – Chain title finalization után immutable.
184. **D184** – Finalizált verzió nem törölhető és nem invalidálható.
185. **D185** – Latest verzió badge-et kap.
186. **D186** – Tervláncok latest final date szerint rendezve.
187. **D187** – Aktív draft block a finalizált chain-ek fölött.
188. **D188** – Draft block mutatja a draft típusát/contextjét.
189. **D189** – Draft block mutatja az aktuális workflow-lépést és last modified időt.
190. **D190** – Home recent sor activity type + time.
191. **D191** – Recents max 5.
192. **D192** – Recent click a páciens `Kezelési tervek` tabjára visz.
193. **D193** – Patient list rows navigation-only.
194. **D194** – Full patient creationnél csak név kötelező.
195. **D195** – Full patient form egyoldalas, dense, kétoszlopos szekciókkal.
196. **D196** – Cím egyetlen free-text mező.
197. **D197** – Telefon free text, kereséshez normalizált.
198. **D198** – Email opcionális, de ha van, valid syntax szükséges.
199. **D199** – DOB opcionális teljes dátum; jövőbeli dátum tiltott.
200. **D200** – Páciensnév egyetlen free-text mező, kereséshez normalizált.
201. **D201** – Duplikációjelzés inline és save-time is fut.
202. **D202** – Full create duplicate esetén `Meglévő használata` megszakítja az új rekordot és megnyitja a meglévő páciens terveit.
203. **D203** – Quick create duplicate esetén meglévő kiválasztása továbbvisz a terv flow-ban.
204. **D204** – Quick modalban begépelt új adatok meglévő választásakor eldobódnak.
205. **D205** – Quick modal Cancel visszatér a selectorhoz és megtartja a keresést.
206. **D206** – Full create Cancel visszatér a listához és megtartja a list state-et.
207. **D207** – Dirty patient form elhagyásakor guard.
208. **D208** – Patient edit save-kor is duplicate check.
209. **D209** – Read-only üres páciensmező megjelenése: `Nincs megadva`.
210. **D210** – Fallback patient master állapot információs blokkban jelzett.
211. **D211** – Fallback esetben új terv a legutóbbi terv snapshotjából indul.
212. **D212** – Plan Details elhagyásakor fallback esetén unchecked opció master létrehozására.
213. **D213** – Ha kijelölik, a master azonnal létrejön.
214. **D214** – Master write failure esetén a felhasználó marad, Retry vagy Continue lehetőséggel.
215. **D215** – Patient save filesystem hiba esetén edit state megmarad.
216. **D216** – Patient save success toast.
217. **D217** – Patient delete success toast.
218. **D218** – Univerzális pácienskereső.
219. **D219** – Live filter 2 karaktertől.
220. **D220** – Kereső keyboard: arrows / Enter / Esc.
221. **D221** – Találatok relevancia szerint, azon belül alfabetikusan.
222. **D222** – No-match selectorból közvetlen `Új páciens` lehetőség.
223. **D223** – Selector 0–1 karakteren recents, 2+ karakteren search results.
224. **D224** – Selector recents max 5, ugyanaz a meaningful activity logika.
225. **D225** – Recent row: név + DOB + telefon.
226. **D226** – Selector row kiválasztása azonnal Plan Detailsre visz.
227. **D227** – Selectorban mindig elérhető secondary `Új páciens`.
228. **D228** – Quick modal autofocus Name; Esc = Cancel.
229. **D229** – Duplicate suspicion inline megjelenik.
230. **D230** – Max 3 duplicate suggestion + expand.
231. **D231** – Ha meglévő páciens adatai eltérnek, kiválasztáskor confirmation.
232. **D232** – `Mégis új páciens létrehozása` confirmation dialoggal.
233. **D233** – Patient listre visszatérés megőrzi search + scroll state-et.
234. **D234** – Normál patient open mindig `Kezelési tervek` tabra nyit.
235. **D235** – Sticky compact patient header: név + DOB + telefon.
236. **D236** – Patient header sticky és compact.
237. **D237** – Csak a latest chain nyitott alapból.
238. **D238** – Collapsed chain header: title + latest date/version + final amount.
239. **D239** – Version row: version + date + final amount.
240. **D240** – Detailből vissza chain listre az előző open/scroll state visszaáll.
241. **D241** – Chain header csak toggle, nem navigáció.
242. **D242** – Chain header jelzi a draft státuszt.
243. **D243** – Draft status marker nem kattintható.
244. **D244** – Felső draft block teljesen kattintható + külön Continue.
245. **D245** – Draft block mutatja az aktuális final offer amountot.
246. **D246** – Ha nincs tétel, amount nem jelenik meg.
247. **D247** – Draft amount = final offer custom final figyelembevételével, deposit nélkül.
248. **D248** – Draft blockban nincs item/phase count.
249. **D249** – Egyverziós chain is chain→version hierarchiát tart.
250. **D250** – Több chain egyszerre nyitva lehet.
251. **D251** – Tree keyboard navigáció támogatott.
252. **D252** – `Összes verzió` visszatéréskor az aktuális verzió fókuszban.
253. **D253** – Prev/Next csak ugyanazon chainen belül.
254. **D254** – Prev/Next gombon verzió + dátum látszik.
255. **D255** – Final detailben a PDF beágyazva jelenik meg.
256. **D256** – A PDF a strukturált detail után látható.
257. **D257** – PDF viewer fix kb. 70–80vh native viewer.
258. **D258** – App-level `Megnyitás külön` csak top actionként.
259. **D259** – Viewer környékén nincs duplikált open action.
260. **D260** – Historical version copy esetén warning, ha newer exists; exact copy továbbra is engedett.
261. **D261** – Detail action header sticky.
262. **D262** – Historical patient/doc data collapsed alapból.
263. **D263** – Collapsed patient header jelzi, ha master eltér.
264. **D264** – Expanded historical snapshot side-by-side diffet mutat, sync nélkül.
265. **D265** – Current patient data deep link ugyanabban a tabban; Back visszaállítja detail state-et.
266. **D266** – Final detail tooth map collapsed alapból.
267. **D267** – Read-only tooth map interaktív navigációra.
268. **D268** – Tooth map multi-select sima kattintásokkal toggle-ol, Ctrl nélkül.
269. **D269** – Csak az első kiválasztás auto-scrolloz a megfelelő tételhez.
270. **D270** – Selection clear: Esc + külön Clear gomb.
271. **D271** – Map highlights a selected uniont mutatja.
272. **D272** – Csak matching tételek highlighted; nem matching nincs dimmelve.
273. **D273** – Highlight neutral accent.
274. **D274** – Map collapse megtartja selectiont és countot.
275. **D275** – Verzióváltás reseteli a selectiont.
276. **D276** – Verzióváltás detail scroll topra.
277. **D277** – Verzióváltás minden local detail state-et resetel; phases újra open default.
278. **D278** – Final detailben item descriptions alapból hiddenek.
279. **D279** – Phase note látható, ha létezik.
280. **D280** – Phase note label egyszerűen `Megjegyzés`.
281. **D281** – Estimated jelzés compact badge.
282. **D282** – Ha list = offered, detailben egyetlen unit price érték látszik.
283. **D283** – Qty detailben mindig explicit `×N` logikával jelenik meg.
284. **D284** – Stabil oszlopok: unit / qty / row amount.
285. **D285** – Offered price az elsődleges; list price csak másodlagosan jelenik meg, ha eltér.
286. **D286** – Fázis header: név + count + aktuális offer subtotal.
287. **D287** – Category nem jelenik meg a treatment rowban.
288. **D288** – Minden fázisnak saját table headerje van.
289. **D289** – Description csak explicit expandre nyílik.
290. **D290** – Description teljes szélességű second row.
291. **D291** – Több description egyszerre nyitva lehet.
292. **D292** – Phase collapse/expand megőrzi description open state-eket.
293. **D293** – Collapsed phase header jelzi, ha note van.
294. **D294** – Detailben tooth text pontosan az eredeti free text.
295. **D295** – Hiányzó tooth: `—`.
296. **D296** – Hosszú treatment name wrap; numeric cell top-align.
297. **D297** – Text left; numeric right + tabular nums.
298. **D298** – Phase table header sticky.
299. **D299** – Phase title nem sticky.
300. **D300** – 4+ fázisnál phase jump dropdown.
301. **D301** – Jump kinyitja a collapsed fázist és a headerre fókuszál.
302. **D302** – Dropdown ordinal + actual phase name.
303. **D303** – Phase nav scrollspy-t használ.
304. **D304** – Sticky phase nav csak a treatment sectionön belül aktív.
305. **D305** – Phase nav + table header compact két-soros sticky a global header alatt.
306. **D306** – Jump nem reseteli a local states-eket.
307. **D307** – Financial summaryban a `Végösszeg` domináns; csak releváns sorok, cardok nélkül.
308. **D308** – Item offered<list = kedvezmény, offered>list = felár; custom final lehet lefelé/felfelé; nem „kerekítés”. PDF nem mutat explicit discount/surcharge mechanikát.
309. **D309** – Internal detail mutat discount/surcharge infót; PDF nem.
310. **D310** – Item adjustment badge százalékos.
311. **D311** – Plan final correction abszolút összegként jelenik meg.
312. **D312** – `Kerek végösszeg` átnevezése `Egyedi végösszeg`-re.
313. **D313** – Ha custom final = Treatment Sum, override automatikusan törlődik.
314. **D314** – Detailben list sum megjelenhet; aggregate item adjustment külön sor nincs.
315. **D315** – List sum akkor releváns, ha eltérés van; D319 pontosítja.
316. **D316** – Offered subtotal label: `Kezelések összege`.
317. **D317** – Domináns internal total label: `Végösszeg`.
318. **D318** – Treatment sum külön sor csak ha eltér Finaltól, kivéve D346.
319. **D319** – List sum akkor is megjelenik, ha item szinten vannak eltérések, még ha nettóban kiegyenlítik egymást.
320. **D320** – Csak item-level adjustment esetén summary: Final + opcionális List sum; duplicate Treatment Sum elhagyható.
321. **D321** – Item + plan adjustment esetén: Final mellett List sum / Treatment sum / Final correction releváns sorok.
322. **D322** – Deposit és remainder külön `Fizetés` subgroupban.
323. **D323** – Pricing subgroup title csak akkor, ha van tényleges magyarázó tartalom.
324. **D324** – Hátralévő összeg vizuálisan erősebb, mint Előleg, de gyengébb, mint Végösszeg.
325. **D325** – Deposit érvényesség: 0 ≤ deposit ≤ final; D519 később a 0 canonical state-et pontosítja.
326. **D326** – Ha final deposit alá csökken: deposit marad, inline hard error, finalization block, remainder `—`.
327. **D327** – Deposit = final esetén remainder explicit 0.
328. **D328** – Label csak `Előleg`; nem sugalljuk, hogy már kifizették.
329. **D329** – Adjustment badge neutral.
330. **D330** – Estimated + adjustment badge egyszerre is megjelenhet.
331. **D331** – Estimated jelzés csak egyszer, a unit price mellett.
332. **D332** – Estimated itemek countja neutral info a final alatt.
333. **D333** – Estimated count nem kattintható.
334. **D334** – Nincs phase-level estimated marker.
335. **D335** – Internal UI-ban nincs PDF `*` jelmagyarázat.
336. **D336** – Estimated státusz független az adjustmenttől.
337. **D337** – list=0, offered>0 esetén badge `[Felár]`, százalék nélkül.
338. **D338** – offered=0 pozitív list mellett `[-100%]`, legit állapot.
339. **D339** – Monetáris értékek nemnegatívak; negatív érték invalid; 0 valid.
340. **D340** – Százalék megjelenítés alapból egészre kerekített.
341. **D341** – Nemnulla eltérés nem jelenhet meg `0%`-ként; szükség esetén 1 tizedes.
342. **D342** – Hiányzó list + manual offered esetén `listaár nincs megadva`; nincs adjustment classification.
343. **D343** – Ha bármelyik list price hiányzik, nincs partial list sum; `Nem számolható` + count.
344. **D344** – Missing list neutral info.
345. **D345** – Missing list önmagában elég a Pricing block megjelenítéséhez.
346. **D346** – Missing list esetén Treatment Sum akkor is látszik, ha egyenlő Final-lal.
347. **D347** – PDF total blokk stabil két total-sor struktúrát tart.
348. **D348** – Ha deposit van, PDF-ben deposit + remainder is megjelenik.
349. **D349** – Deposit=final esetén PDF remainder 0.
350. **D350** – PDF label `Fizetendő` helyett `Végösszeg`.
351. **D351** – `Kezelések összege` elnevezés mindenhol egységes.
352. **D352** – PDF item row csak offered unit price + row amount; list/adjustment nem jelenik meg.
353. **D353** – 0 Ft offered PDF-ben explicit `0 Ft`.
354. **D354** – PDF stabil oszlopok: `Kezelés | Fog | Db | Egységár | Összeg`.
355. **D355** – PDF Db sima szám (`1`), nem `×1` vagy `db`.
356. **D356** – Treatment block lehetőleg együtt marad oldaltörésnél.
357. **D357** – Split phase új oldalon `Fázis – folytatás` + table header ismétlődik.
358. **D358** – Phase subtotal csak egyszer, a valódi fázis végén.
359. **D359** – Eredeti note/subtotal sorrendet D411 később felülírta.
360. **D360** – Fázis closure keep-together; D411 után `Fázis összesen + Megjegyzés` egység.
361. **D361** – Phase title + table header + first item együtt marad.
362. **D362** – Extrém hosszú description törhet oldalra; base row együtt marad; best effort.
363. **D363** – Split description új oldalon treatment name + `– leírás folytatása`.
364. **D364** – Description continuation oldalon phase `– folytatás` + treatment `– leírás folytatása`; table header csak következő normál rownál.
365. **D365** – Teljes financial summary együtt marad, ha lehet.
366. **D366** – PDF financial block címe `Összesítés`.
367. **D367** – Final total bold és enyhén nagyobb, card nélkül.
368. **D368** – Deposit finom elválasztóvonallal különül el; nincs külön `Fizetés` alcím a PDF-en.
369. **D369** – Remainder erősebb, mint deposit, de gyengébb, mint Final.
370. **D370** – Phase subtotal labelt D410 felülírta `Fázis összesen`-re.
371. **D371** – PDF üres tooth: `—`.
372. **D372** – Hosszú treatment name wrapol.
373. **D373** – PDF tooth az exact stored original text.
374. **D374** – Item description közvetlenül a row alatt, full-width, kisebb secondary text, label nélkül.
375. **D375** – Phase note label döntést D412 később AS-IS formára pontosította.
376. **D376** – Estimated `*` csak az Egységár mellett.
377. **D377** – Estimated footnote egyszer, minden fázis után, Summary előtt, ha van estimated item.
378. **D378** – HU estimated footnote pontos szövege: `* A csillaggal jelölt tételek ára becsült, a tényleges ár a kezelés körülményeitől függően változhat.`
379. **D379** – Érvényesség az Összesítés után látható.
380. **D380** – Ott csak validity ismétlődik, issue date nem.
381. **D381** – Summary + validity egy keep-together closing block.
382. **D382** – Footer AS-IS minden oldalon ugyanaz a struktúra; csak oldalszám változik. Bal: rendelő/cégadatok; jobb: páciens + árlista dátum + `N/M`.
383. **D383** – Page 1 nagy dekoratív header AS-IS; page 2+ compact header AS-IS.
384. **D384** – Compact header jobb oldala: `Kezelési terv · Páciens neve`.
385. **D385** – First-page header AS-IS: nagy logo+clinic contact balra; jobbra `Kezelési terv és árajánlat` + verzió + dátum; nincs extra plan title a headerben.
386. **D386** – Custom plan title külön jelenik meg page1 contentben.
387. **D387** – Plan title után: Patient Data → tooth map → phases.
388. **D388** – PDF full patient snapshotot mutat, nem csak minimális azonosítást.
389. **D389** – Üres patient field kimarad a PDF-ből.
390. **D390** – Patient field order eredetileg Name→DOB→Phone→Email→Address; D431 screenshot később TAJ-t is rögzített.
391. **D391** – Patient Data blokk egészben marad oldaltörésnél.
392. **D392** – Tooth map atomikus blokk, nem törik.
393. **D393** – Tooth map cím: `Érintett fogak`.
394. **D394** – Ha nincs felismert fogszám, az egész tooth-map blokk kimarad.
395. **D395** – Legend a map alatt csak a ténylegesen használt kategóriákat mutatja.
396. **D396** – Legend kategóriák konfigurált sorrendben.
397. **D397** – Legend wrapolhat több sorba; font nem shrinkel.
398. **D398** – Title + map + legend egy keep-together blokk.
399. **D399** – Legend csak azoknak a kategóriáknak a neveit mutatja, amelyek színe ténylegesen látszik a mapen.
400. **D400** – Tooth map vizuálisan AS-IS: teljes neutral outline dentition, érintett fogak category colorral.
401. **D401** – Ugyanaz a fog több kategóriában: egyetlen szín category priority alapján.
402. **D402** – Tooth mapen nincs fogszám label.
403. **D403** – Legend category name a PDF nyelvét követi.
404. **D404** – DE finalization hard block, ha látható kategóriának nincs DE neve.
405. **D405** – Admin category list subtly jelzi a hiányzó DE nevet; nonblocking.
406. **D406** – First phase ugyanazon az oldalon indulhat a map után, ha D361 minimum blokk elfér.
407. **D407** – PDF-ben nincs külön `Kezelések` section title.
408. **D408** – Phase title AS-IS: bold + brand color; nincs background/extra rule.
409. **D409** – Table header AS-IS: kisebb secondary text, `Beavatkozás | Fog | Db | Egységár | Összeg`, subtle underline, background nélkül.
410. **D410** – Phase subtotal label végleg AS-IS: `Fázis összesen`; subdued label, bold amount.
411. **D411** – Phase zárás AS-IS sorrend: items → `Fázis összesen` → `Megjegyzés`.
412. **D412** – Phase note AS-IS inline: `Megjegyzés: <szöveg>`.
413. **D413** – Phase subtotal style AS-IS: finom top rule, subdued label, bold amount, background nélkül.
414. **D414** – `Fázis összesen + Megjegyzés` closure keep-together best effort; nagyon hosszú note törhet.
415. **D415** – Split long phase note next page: phase `– folytatás`, majd `Megjegyzés – folytatás:`; subtotal nem ismétlődik.
416. **D416** – Summary követheti az utolsó fázist ugyanazon oldalon, ha a teljes closing block elfér.
417. **D417** – Estimated footnote nem a Summary keep-together része; treatment contenthez tartozik.
418. **D418** – Estimated footnote az utolsó phase closure-rel együtt marad.
419. **D419** – Ha nincs note, `Fázis összesen + footnote` együtt marad.
420. **D420** – Summary+validity után explicit page break a későbbi dokumentumrészek előtt.
421. **D421** – Custom plan title csak page1-en; későbbi oldalak saját section title + compact header.
422. **D422** – Page count folyamatos az egész PDF-en.
423. **D423** – Footer `árlista dátum` = a terv historical price-list snapshot reference date; immutable.
424. **D424** – Footer ugyanazt az árlista dátumot mutatja manual/custom árak mellett is; nincs `egyedi árak` label.
425. **D425** – Footer patient name a plan snapshotból jön, immutable.
426. **D426** – Hosszú patient name teljesen kiíródik, max két sor, ellipsis nélkül.
427. **D427** – Footer magasság dokumentumszinten dinamikus a hosszú névhez, de minden oldalon azonos.
428. **D428** – Hosszú névnél price-list date + page number külön sorra kerül a név alatt.
429. **D429** – Hosszú plan title teljesen wrapol, nincs shrink/ellipsis.
430. **D430** – Plan title + teljes Patient Data közös keep-together blokk.
431. **D431** – Patient Data AS-IS két oszlop, dividers/cards nélkül; left: Név, Született, TAJ, Cím; right: Telefon, Email; subdued labels + stronger values.
432. **D432** – Fixed semantic columns; hiányzó mezők miatt nincs rebalance.
433. **D433** – Hosszú patient value a saját oszlopában wrapol.
434. **D434** – DOB display nyelv szerint lokalizált: HU `1978.03.14.`, DE `14.03.1978`; storage ISO.
435. **D435** – Minden látható PDF-dátum a dokumentum nyelvén formázott; JSON ISO.
436. **D436** – Monetary formatting a document language-et követi, currencytől függetlenül: HU grouping space, DE dots; decimals comma.
437. **D437** – HUF egész; EUR max 2 decimal, trailing zero decimals rejtve.
438. **D438** – Currency label stabil: `Ft`, `EUR` minden nyelven.
439. **D439** – Amount + currency nonbreaking.
440. **D440** – Teljes monetary value egy sorban marad, no-wrap.
441. **D441** – Monetary values right-aligned + tabular nums.
442. **D442** – PDF `Db` centered.
443. **D443** – PDF `Fog` left-aligned.
444. **D444** – Hosszú Fog free text wrapol a cellában.
445. **D445** – Item rows között nincs divider line; whitespace separation.
446. **D446** – Item row vertical spacing AS-IS compact.
447. **D447** – Item description enyhén indentált.
448. **D448** – Description kisebb/lighter secondary text.
449. **D449** – Description után nincs extra spacing.
450. **D450** – Phase gap AS-IS moderate.
451. **D451** – DE patient labels lokalizáltak, de `TAJ` label marad `TAJ`.
452. **D452** – Patient data values nem fordítódnak/lokalizálódnak; exact snapshot.
453. **D453** – Minden system-generated static PDF text HU/DE szerint lokalizált; brand/user/snapshot text változatlan.
454. **D454** – Default-following plan title lokalizálódik (dátummal együtt); manual title változatlan user text.
455. **D455** – Default phase names lokalizálódnak; manual phase names változatlanok.
456. **D456** – Phase note user text nem fordítódik; nyelvi mismatch finalization soft warning.
457. **D457** – Language mismatch soft warning egy checklist item, countokkal + navigációval.
458. **D458** – Eredeti language metadata elnevezést D478 később `authoredInLanguage`/`reviewedForLanguage`-re finomította.
459. **D459** – Mismatch elfogadásához explicit field-level `Nyelv ellenőrizve` kell; önmagában edit nem elég.
460. **D460** – Language metadata modell részleteit D478 pontosította.
461. **D461** – Review invalidation logikát D477/D479 pontosította.
462. **D462** – Csak tényleges normalizált content change invalidál review-t; no-op/whitespace edge nem.
463. **D463** – Normalization csak leading/trailing trim; belső space/newline/punctuation változás valódi change.
464. **D464** – Field-level language review UI csak akkor jelenik meg, ha current document language mismatch van.
465. **D465** – Review után warning teljesen eltűnik; nincs success badge.
466. **D466** – Document language váltás önmagában nem módosít review metadata-t.
467. **D467** – Checklist guided review-t indíthat minden pending texten; nincs bulk accept.
468. **D468** – Guided review review után auto-advance, de Back támogatott.
469. **D469** – Guided review a valódi editor mezőkhöz navigál, nincs külön duplicate modal editor.
470. **D470** – Review nonmodal; normál nav engedett; compact review bar + Continue.
471. **D471** – Field review eredmények persistent draft data; session position transient.
472. **D472** – Review order: plan title → phases/items/descriptions/notes dokumentum/workflow sorrendben.
473. **D473** – Queue dinamikus current draft alapján; status `még N ellenőrizendő`, nem fix N/M.
474. **D474** – Back a session historyt követi, nem a pending queue-t.
475. **D475** – Back után Forward is historyt követ.
476. **D476** – Már reviewed field újralátogatásakor normál UI, nincs ✓ badge.
477. **D477** – Ha mismatch van, másik nyelven történő szerkesztés önmagában nem oldja fel; explicit `Nyelv ellenőrizve` továbbra is kell.
478. **D478** – Language metadata végleges nevei: `authoredInLanguage` + `reviewedForLanguage`; authored = aktuális manual text bázisnyelve, reviewed = másik nyelvre explicit elfogadás.
479. **D479** – Ha current language-re reviewed textet abban a nyelvben ténylegesen módosítják, új text version `authoredInLanguage=current`, `reviewedForLanguage=null`; másik nyelv új review-t igényel.
480. **D480** – Ha mismatch nincs reviewed, akkor teljes rewrite a másik nyelven sem oldja fel automatikusan; explicit review kötelező, nincs „significant change” heuristic.
481. **D481** – Reset `↺` system/price-list defaultra törli a manualOverride + authored/reviewed metadata-t, és default-following állapotba tér vissza.
482. **D482** – New Version és Copy New Plan örökli a manual text + language metadata-t, ha a szöveg pontosan változatlan.
483. **D483** – Copy New Plan örökli a forrás document language-et.
484. **D484** – New Version örökli az előző language-et, de draftban módosítható.
485. **D485** – Copy New Plan örökli a forrás currencyt.
486. **D486** – New Version örökli az előző currencyt, de draftban módosítható.
487. **D487** – Custom final amount pénznemenként külön tárolódik; nincs FX.
488. **D488** – Deposit teljes state-je pénznemenként külön: enabled + amount.
489. **D489** – Custom final teljes state-je pénznemenként külön: enabled + amount.
490. **D490** – `Leírások nyomtatása` egyetlen plan-level flag; nyelvtől/pénznemtől független.
491. **D491** – Estimated Price közös item property, nem currency-specific.
492. **D492** – Offered unit price teljes state-je pénznemenként: amount + manualOverride/default-following.
493. **D493** – Listaár snapshot pénznemenként; explicit `null` hiány ≠ 0.
494. **D494** – Tétel hozzáadásakor HUF és EUR listaár snapshot egyszerre készül; hiány explicit null.
495. **D495** – Offered mindkét currencyben saját listaárból inicializálódik, manualOverride=false; hiányzó listánál offered null/default-following.
496. **D496** – Row refresh mindkét currency listaár snapshotját frissíti; offered csak az adott currency default-following állapotában követi.
497. **D497** – Field-level list-price refresh csak az aktuálisan látható currencyt; row-level refresh mindkettőt.
498. **D498** – Listaár refresh value→missing: list=null; default-following offered=null; manual offered marad.
499. **D499** – Listaár refresh missing→value: list frissül; default-following offered felveszi; manual offered marad.
500. **D500** – Ha list és offered is létezik, adjustment classification/percentage automatikusan származtatott.
501. **D501** – Manuálisan beírt offered akkor is manualOverride=true marad, ha pontosan egyezik a listával; csak reset szünteti meg.
502. **D502** – Manual offered később is lehet egyenlő a megváltozott listával; manual intent megmarad, 0 eltérésnél badge nincs.
503. **D503** – Manual, de listával egyező árnál nincs `Egyedi ár` badge; a `↺` jelzi az intentet; tooltip: `Visszaállítás listaár követésére`.
504. **D504** – Hiányzó listaárnál reset továbbra is elérhető, de confirmation kell, mert törli a manual offeredet és null/default-following állapotot hoz létre.
505. **D505** – Később megjelenő aktuális listaár nem módosítja automatikusan a draftot; explicit refresh kell.
506. **D506** – Refresh konkrét old→new értékeket mutat, missing→value/value→missing esettel; nincs külön change-type badge.
507. **D507** – Row refresh confirmation minden tényleges változást mutat, a nem aktuális currencyt is.
508. **D508** – Default-following offered+list együtt változás egy kombinált sor; manual offered esetén külön `változatlan (egyedi)` jelzés.
509. **D509** – Row refresh confirmation mindig mutat `Hatás a tervre`: Kezelések összege és ahol releváns Final old→new.
510. **D510** – Aktív custom final esetén az impact mutatja a final-total discount/surcharge old→new változását is.
511. **D511** – Ha custom final szemantikája surcharge↔discount irányt vált, ugyanabban a confirmationben soft warning; nincs második dialog/block.
512. **D512** – Refresh akkor is engedett, ha deposit>final hibát okoz; confirmation erős warning, deposit változatlan, draft inline hard error + remainder `—`, finalization blokkolt.
513. **D513** – Ha refresh miatt custom final = Treatment Sum, custom final override auto-disables; confirmation ezt előre jelzi.
514. **D514** – Equality miatti auto-disable a custom final amountot is törli; nem „éled fel” később csendben.
515. **D515** – Custom final kézi kikapcsolása is törli az amountot.
516. **D516** – Deposit kézi kikapcsolása is törli az amountot.
517. **D517** – Deposit bekapcsolásakor üres, fókuszált amount mező; nincs 0/default/százalék előtöltés.
518. **D518** – Deposit required hiba csak blur vagy finalization attempt után; toggle pillanatában még nem.
519. **D519** – Explicit deposit `0` valid input, de blur/Enter után canonical state: `deposit.enabled=false`, `amount=null`.
520. **D520** – `Egyedi végösszeg` bekapcsolásakor üres amount mező jelenik meg azonnali autofókusszal; nincs előtöltés.
521. **D521** – Custom final required validation csak blur vagy finalization attempt után jelenik meg, nem azonnal toggle-kor.
522. **D522** – `0 Ft` / `0 EUR` custom final üzletileg valid, de egyszer explicit megerősítést kér.
523. **D523** – A 0 custom-final confirmation addig érvényes, amíg az amount 0 marad; 0→más→0 új confirmationt kér.
524. **D524** – A zero-confirmation pénznemenként külön state.
525. **D525** – 0 final pozitív deposit mellett beállítható; deposit nem törlődik, invalid draft keletkezik, finalization blokkolt a deposit rendezéséig.
526. **D526** – Currency switch mindig engedett; a célcurrency saját invalid állapota azonnal látszik, adat automatikusan nem korrigálódik.
527. **D527** – Finalizationkor csak az aktuális/document currency state-jének kell validnak lennie; a másik currency hibája nem blokkol és nem warning.
528. **D528** – Final `terv.json` mindkét currency teljes plan-state-jét megőrzi; `documentCurrency` jelzi, melyikből készült a PDF.
529. **D529** – Final `Terv részletei` kizárólag a tényleges `documentCurrency` történeti nézetét mutatja; alternatív currency state nem browse-olható ott.
530. **D530** – `Új verzió` induló currencyje az előző finalizált verzió `documentCurrency` értéke; a másik state is öröklődik.
531. **D531** – Draftban a HUF/EUR váltás maga a `documentCurrency` módosítása; nincs külön „nézett” és „dokumentum” currency.
532. **D532** – Currency csak a `Terv adatai` lépésen módosítható. A terv/verzió közbeni többpénznemes és többnyelvű váltogatás **nagyon low-priority backlog**; a korábbi state/validációs döntések ettől nem invalidálódnak.
533. **D533** – Dokumentumnyelv is csak a `Terv adatai` lépésen módosítható; nincs globális quick switch a workspace-ben.
534. **D534** – Új chain meglévő páciensnél a legutóbbi finalizált terv nyelvét és pénznemét örökli; első tervnél globális defaultok.
535. **D535** – Új chain orvosa mindig az aktuális globális default aktív orvos.
536. **D536** – Új verzió az előző orvost örökli, ha még aktív; ha inaktív, aktuális globális default + rövid info.
537. **D537** – Aktív draft megtartja az időközben inaktivált orvost, de ilyen állapotban hard validation miatt nem finalizálható.
538. **D538** – `Másolás új tervként` aktuális globális default orvossal indul; a forrás orvosa nem másolódik.
539. **D539** – Új terv default orvos nélkül is létrejöhet; orvos mező üres, finalization hard-block aktív orvos kiválasztásáig.
540. **D540** – Default orvos deaktiválásakor, ha van másik aktív orvos, rögtön új defaultot kell választani; ha nincs, deaktiválás engedett explicit warninggal.
541. **D541** – Kezelőorvos neve a PDF meglévő aláírási blokkjában jelenik meg, nem az első oldali páciensadatoknál.
542. **D542** – Tervhez egyelőre csak az orvos neve snapshotolódik; nincs komplex doctorSnapshot titulus/aláírásképpel.
543. **D543** – Az orvosnév finalizationkor snapshotolódik az akkor aktuális orvos-masterből.
544. **D544** – Orvos törölhető; nem építünk „már használt orvos csak deaktiválható” szabályt. Final historyt a név snapshot védi; aktív draft árva hivatkozásnál orvos nélkülivé válik és nem finalizálható.
545. **D545** – Aláírási blokk layout AS-IS marad; csak a kezelőorvos neve dinamikus.
546. **D546** – Aláírási blokkban AS-IS marad a helyszín + dátum sor is.
547. **D547** – Helyszín egyelőre fixen `Budapest`; nem konfiguráljuk.
548. **D548** – Aláírási blokk statikus labeljei HU/DE szerint lokalizálódnak.
549. **D549** – Aláírási dátum hosszú szöveges formátum, lokalizálva: pl. HU `2026. augusztus 18.`, DE `18. August 2026`.
550. **D550** – `Csak ajánlat` módban a nyilatkozati/aláírási blokk teljesen elmarad.
551. **D551** – `Csak ajánlat` AS-IS kis checkbox csak az `Előnézet és véglegesítés` képernyőn; nincs külön banner/badge a draft editorban.
552. **D552** – Ha nyilatkozat hiánya miatt forced offer-only szükséges, ugyanaz a checkbox checked + disabled, rövid magyarázattal.
553. **D553** – Ha a nyilatkozat konfigurált, új terv alapból teljes dokumentum (`Csak ajánlat` = false).
554. **D554** – Új verzió örökli az előző verzió `Csak ajánlat` állapotát.
555. **D555** – `Másolás új tervként` nem örökli a forrás offer-only állapotát; új chain normál defaultból indul, kivéve forced eset.
556. **D556** – `Csak ajánlat` checkbox módosítása azonnal újragenerálja a PDF-előnézetet; nincs külön Refresh gomb.
557. **D557** – Aláírás kizárólag papíron/kézzel; nincs digitális aláírás, signature image vagy `aláírva` státusz.
558. **D558** – Finalizált offer-only verzió neutral `Csak ajánlat` badge-et kap a verziósorban és detail headerben.
559. **D559** – Offer-only checkbox kézi bekapcsolása nem kér külön confirmationt; maga a checkbox az explicit döntés.
560. **D560** – Nyilatkozat nem szerkeszthető tervenként; finalizationkor az aktuális globális template kerül a PDF-be. A JSON-snapshot részét D595 később elvetette.
561. **D561** – Új verzió mindig az akkor aktuális globális nyilatkozatsablont használja, nem az előző verzió szövegét.
562. **D562** – Már megnyitott draft preview/finalization is mindig az aktuális globális nyilatkozatsablont használja; nincs draft-level template snapshot.
563. **D563** – Nem különböztetjük meg a kézi és forced offer-only state-et; forced eset true-ra állítja, és config javulása után bepipálva marad, amíg kézzel ki nem kapcsolják.
564. **D564** – „Nincs használható nyilatkozat” csak empty/whitespace-only szöveg esetén; nincs placeholder felismerés vagy approval flag.
565. **D565** – Nyilatkozat meglétét az aktuális document language szerint vizsgáljuk; nincs HU↔DE fallback.
566. **D566** – `Nyomtatvány szövegei` AS-IS kis `Magyar | Deutsch` tab/gomb váltót használ.
567. **D567** – Egy közös nyelvváltó az összes nyomtatványszöveget egyszerre váltja (Nyilatkozat, Fizetési feltételek, Garancia stb.).
568. **D568** – HU/DE tabváltás közben a nem mentett módosítások mindkét nyelv form-state-jében megmaradnak; nincs váltási guard.
569. **D569** – `Mentés` egyszerre menti mindkét nyelv összes dirty módosítását; `Mégse` mindkettőt visszavonja az utolsó mentésig.
570. **D570** – HU/DE tab neve mellett diszkrét `•` mutatja az adott nyelv unsaved state-jét.
571. **D571** – AS-IS marad a technikai `Jelenleg: ...md` fájlnév a szövegmezők alatt.
572. **D572** – Ez a fájlnév read-only metadata; innen fájlt választani/átnevezni nem lehet.
573. **D573** – Nyomtatványszöveg-sablonok mentéskor nem verziózódnak; az aktuális fájl felülíródik.
574. **D574** – A meglévő `...-v1.md` fájlnevek ettől függetlenül maradnak; nem nevezzük át őket.
575. **D575** – Nyilatkozat, Fizetési feltételek és Garancia ugyanazt az „aktuális globális template finalizationkor” logikát követi; történeti eredmény a mentett PDF-ben marad (D595 pontosítás).
576. **D576** – Hiányzó Fizetési feltételek vagy Garancia soft warning finalizationkor; nem blokkol és nem force-ol offer-only módot.
577. **D577** – Több hiányzó opcionális dokumentumszöveg egyetlen közös warningban, konkrét felsorolással.
578. **D578** – A warningból nincs direkt link a Beállításokhoz; csak tájékoztatás.
579. **D579** – `Csak ajánlat` módban Fizetési feltételek és Garancia továbbra is a PDF része; csak Nyilatkozat + aláírás marad el.
580. **D580** – Offer-only módban is megmarad a hiányzó Fizetési feltételek/Garancia soft warning.
581. **D581** – Üres opcionális dokumentumszöveg teljes szekciója kimarad a PDF-ből, címmel együtt.
582. **D582** – PDF oldaltörés hibrid: Fizetési feltételek + Garancia folyamatosan tördelhetők; Nyilatkozat + aláírás mindig új oldalon indul.
583. **D583** – Nyilatkozat több oldalra törhet; az aláírási blokk mindig egyben marad, lehetőleg az utolsó bekezdéssel együtt.
584. **D584** – Ha az aláírási blokk nem fér ki, az utolsó teljes nyilatkozati bekezdés is átkerül vele a következő oldalra.
585. **D585** – Fizetési feltételek/Garancia címe legalább az első teljes bekezdéssel együtt marad.
586. **D586** – Többoldalas Fizetési feltételek/Garancia folytatásnál a cím ismétlődik `– folytatás` jelzéssel.
587. **D587** – Többoldalas Nyilatkozat folytatásnál is `Nyilatkozat – folytatás` cím ismétlődik.
588. **D588** – `.md` nyomtatványszövegek szűk Markdown subsetet támogatnak: bekezdés, `**félkövér**`, unordered és ordered list.
589. **D589** – Markdown headingek (`#`, `##`, `###`) nem támogatottak; section title-t a rendszer adja.
590. **D590** – Minden kézi sortörés megőrződik a PDF-ben.
591. **D591** – Egy Enter = sortörés; üres sor = új bekezdés nagyobb vertikális térközzel.
592. **D592** – Nyomtatványszöveg editor AS-IS egyszerű textarea; nincs Markdown toolbar/rich-text editor.
593. **D593** – Settingsben nincs külön Markdown preview; a renderelt eredmény a terv PDF-előnézetében látszik.
594. **D594** – Nem támogatott Markdown-szintaxis nem hiba; literal/plain textként jelenik meg.
595. **D595** – Nyilatkozat/Fizetési feltételek/Garancia szövege **nem kerül snapshotként a `terv.json`-ba**. A mentett final PDF elegendő történeti dokumentum.
596. **D596** – A `terv.json` template-fájlnevet vagy hash/reference-et sem tárol ezekhez a szövegekhez.
597. **D597** – Final `Terv részletei` strukturált nézet nem próbálja külön megjeleníteni a történeti nyomtatványszövegeket; azok a mentett PDF-ben láthatók.
598. **D598** – Két PDF-életciklus: **draftban az Előnézet mindig frissen generált** az aktuális draft+template state-ből; **korábbi finalizált tervnél a lementett PDF-et** mutatjuk.
599. **D599** – Ha egy historical final PDF hiányzik/nem olvasható, hibát mutatunk és nem próbáljuk újragenerálni; strukturált JSON-adatok továbbra is olvashatók.
600. **D600** – Finalizationkor pontosan ugyanazok a PDF-byte-ok kerülnek mentésre, amelyeket az orvos az utolsó érvényes preview-ban látott; nincs „titkos” újragenerálás.
601. **D601** – Preview kötelező workflow-gate: friss PDF → orvos szemmel átnézi → csak utána finalization/mentés. Bármely PDF-et érintő módosítás invalidálja a preview-t; addig Finalize disabled.
602. **D602** – Nincs külön `Átnéztem` checkbox; a kötelező Preview lépés maga a kontroll.
603. **D603** – Preview automatikusan generálódik az `Előnézet és véglegesítés` lépésre belépéskor, és automatikusan újragenerálódik minden preview-t érintő változásra.
604. **D604** – Preview generation error esetén a felhasználó ugyanazon képernyőn marad, hiba + `Újrapróbálás`; Finalize disabled.
605. **D605** – AS-IS loading: generálás idejére a korábbi preview beszürkül, és a két alsó akciógomb is disabled/beszürkített.
606. **D606** – Ha az újragenerálás hibára fut, a korábbi preview beszürkítve látható marad; Retry elérhető; Finalize disabled.

---

## Prioritási megjegyzés

A HU↔DE és HUF↔EUR váltogatás egy már létező páciens tervei/verziói között vagy szerkesztés közben **nagyon ritka használati eset**, ezért a hozzá kapcsolódó kifinomult switching UX **nagyon alacsony prioritású backlog**. Az adatmodellre, snapshotokra, validációkra és öröklésre meghozott korábbi döntések ettől továbbra is érvényesek.
