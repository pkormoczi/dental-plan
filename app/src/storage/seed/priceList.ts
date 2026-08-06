// Az árlista seed egyetlen forrása: data/arlista.seed.json (a repo gyökeréhez
// képest). Ne másold be duplikátumként ide -- innen importáljuk, hogy egy
// helyen éljen az igazság.

import type { PriceList } from '../../domain/types';
import { assertPriceListShape } from '../../domain/validate';
import raw from '../../../../data/arlista.seed.json';

// P1-6: eddig egy bare `as PriceList` volt itt -- egy szerkezetileg hibás
// seed (pl. egy jövőbeli Excel-importban becsúszó hiba) csendben bejutott
// volna az alkalmazásba. Ugyanaz a guard fut itt, induláskor, mint amit a
// DemoStorage minden JSON.parse betöltési határon lefuttat.
assertPriceListShape(raw, 'data/arlista.seed.json');
export const seedPriceList: PriceList = raw as PriceList;
