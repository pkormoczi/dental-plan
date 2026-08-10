/// <reference types="node" />
// Ez az egyetlen fájl az app/-ban, ami Node API-t (fs/path) importál -- a
// tesztek Node alatt futnak, nem jsdomban kell fájlt olvasniuk. A globális
// tsconfig.app.json "types" listája szándékosan nem tartalmazza a "node"-ot
// (böngésző-only kódhoz Node globálisok szivárgását kerüli), ezért a Node
// típusokat itt, fájl-szinten kell bekérni.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// A NotoSans-SemiBold.ttf name-táblája korábban 'NotoSans-Regular'-t mondott
// (a fontTools varLib.instancer az OS/2.usWeightClass-t helyesen állítja be,
// de a name-record-okat nem nevezi át) -- lásd
// app/src/assets/fonts/README.md. @react-pdf/pdfkit a beágyazott fontok
// cache-ét a postscriptName-mel kulcsolja, tehát az ütköző név miatt a
// SemiBold-ot csendben a már beágyazott Regularral helyettesítette a
// generált PDF-ben. Ez csak a valódi PDF bájtjain látszik, se jsdom, se a
// mockolt usePDF nem kapja el -- lásd
// docs/reviews/2026-08-10-browser-validation.md K3.
//
// A name-record-ok (3,1) Windows/Unicode platformon UTF-16BE-kódoltak, tehát
// a nyers bájtokban minden ASCII karakter előtt egy nullbájt áll -- a
// nullbájtok kiszűrése után az ASCII jelölők egyszerű substring-kereséssel
// megtalálhatók, külön font-parser függőség nélkül.
const NUL_BYTE = String.fromCharCode(0);

function readAsciiMarkers(path: string): string {
  const buffer = readFileSync(path);
  return buffer.toString('latin1').split(NUL_BYTE).join('');
}

const FONTS_DIR = join(import.meta.dirname, '../assets/fonts');

describe('NotoSans font files', () => {
  it('SemiBold name table identifies itself as SemiBold, not Regular', () => {
    const semibold = readAsciiMarkers(join(FONTS_DIR, 'NotoSans-SemiBold.ttf'));

    expect(semibold).toContain('NotoSans-SemiBold');
    expect(semibold).not.toContain('NotoSans-Regular');
  });

  it('Regular name table identifies itself as Regular, not SemiBold', () => {
    const regular = readAsciiMarkers(join(FONTS_DIR, 'NotoSans-Regular.ttf'));

    expect(regular).toContain('NotoSans-Regular');
    expect(regular).not.toContain('NotoSans-SemiBold');
  });
});
