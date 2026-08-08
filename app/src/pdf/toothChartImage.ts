// SVG->PNG adapter, KIZÁRÓLAG a nyomtatványhoz. A @react-pdf/renderer SVG
// motorja nem ismeri a `<use>`, CSS-osztály/`currentColor` mechanizmust,
// amit az asset (dental-chart-fdi-32.svg) a színezéshez és a szintetikus
// bölcsességfogak körvonalához használ (lásd design/toothChartSvg.ts
// fejlécét). Ahelyett hogy a fogtérképet react-pdf primitívekben újra
// megrajzolnánk -- egy MÁSODIK, külön karbantartandó vizuális forrást
// nyitva --, a webbel MEGEGYEZŐ markupot canvas-on át PNG-vé alakítjuk, és a
// PDF-be `<Image>`-ként ágyazzuk. Csak böngésző-API, nincs új függőség.
//
// Sosem dob hibát: `null`-lal tér vissza, ha nincs canvas/Image (pl. jsdom
// alatt futó teszt) vagy a rajzolás bármi miatt meghiúsul (pl. canvas-
// tainting) -- ilyenkor a nyomtatványon a fogtérkép kimarad, az összegzés
// teljes szélességet kap, ugyanúgy, ahogy ma is, ha nincs egyetlen fogszám
// sem a tervben (docs/04-nyomtatvany-spec.md).

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** @param scale Szuperszampling-szorzó a canvas felbontásához -- élesebb nyomat, nagyobb PNG. */
export async function renderToothChartPng(svgMarkup: string, scale = 3): Promise<string | null> {
  try {
    if (typeof document === 'undefined' || typeof Image === 'undefined') return null;

    // jsdom (a teszt-környezet) nem implementál valódi canvas-rendert -- a
    // `canvas` npm csomag nincs telepítve (szándékosan, lásd package.json),
    // ezért itt null-t ad. Ezt a HÍVÁS ELEJÉN ellenőrizzük, mielőtt egy
    // <img> betöltésére várnánk -- jsdom sosem tüzeli el az onload/onerror
    // eseményt egy data URL-re, egy ez utáni várakozás örökre függne.
    const probe = document.createElement('canvas');
    if (!probe.getContext || !probe.getContext('2d')) return null;

    const svgDataUrl = `data:image/svg+xml;charset=utf-8;base64,${utf8ToBase64(svgMarkup)}`;

    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = svgDataUrl;
    });
    if (!img || !img.width || !img.height) return null;

    const canvas = document.createElement('canvas');
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
