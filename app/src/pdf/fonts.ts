// Unicode font regisztrálása a react-pdf-hez. A beépített Helvetica nem
// tartalmazza az 'ő'/'ű' karaktereket -- ez csak a végleges PDF-en látszik,
// a HTML előnézeten nem.
//
// Statikus (nem variable) TTF kell -- lásd src/assets/fonts/README.md a
// forrásról és a szűkítés lépéseiről.

import { Font } from '@react-pdf/renderer';
import notoSansRegular from '../assets/fonts/NotoSans-Regular.ttf';
import notoSansSemiBold from '../assets/fonts/NotoSans-SemiBold.ttf';

let registered = false;

export function registerPdfFonts(): void {
  if (registered) return;
  Font.register({
    family: 'NotoSans',
    fonts: [
      { src: notoSansRegular, fontWeight: 400 },
      { src: notoSansSemiBold, fontWeight: 600 },
    ],
  });
  registered = true;
}
