// Az árlista seed egyetlen forrása: data/arlista.seed.json (a repo gyökeréhez
// képest). Ne másold be duplikátumként ide -- innen importáljuk, hogy egy
// helyen éljen az igazság.

import type { PriceList } from '../../domain/types';
import raw from '../../../../data/arlista.seed.json';

export const seedPriceList: PriceList = raw as PriceList;
