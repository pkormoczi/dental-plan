// react-pdf renderer bundle-be épített fetchImage()-e minden <Image> node
// feloldásakor lefuttat egy Buffer.isBuffer(source) ellenőrzést try/catch-ben;
// böngészőben a csupasz Buffer hivatkozás ReferenceError-t dob, amit a
// könyvtár elnyel, de a catch ág console.warn-t ír. A hiányzó globálist itt
// pótoljuk -- csak az isBuffer() metódusra van szükség, egy teljes
// Buffer-polyfill felesleges bundle-súly volna.
//
// A `@react-pdf/renderer` típusdefiníciói `/// <reference types="node" />`-ot
// tartalmaznak, ezért a `window.Buffer` itt a Node `BufferConstructor`
// típusára ellenőrizne -- ténylegesen csak az `isBuffer()` metódust adjuk,
// ezért a hozzárendelés lazán tipizált.
const globalWindow = window as unknown as { Buffer?: { isBuffer: (value: unknown) => boolean } };
if (typeof window !== 'undefined' && !globalWindow.Buffer) {
  globalWindow.Buffer = { isBuffer: () => false };
}
