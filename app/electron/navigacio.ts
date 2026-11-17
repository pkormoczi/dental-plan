// A renderer hibás vagy kompromittált linkkel se vihesse az ablakot idegen oldalra, és ne
// nyithasson ellenőrizetlen új ablakot. Egyetlen engedett új ablak a mentett PDF megnyitása: a
// renderer `about:blank`-et nyit a felhasználói gesztus alatt, majd a saját `blob:` PDF-jére
// irányítja. A rendszer PDF-olvasós „Megnyitás” érkezésével ez az ág megszűnik.

function originje(url: URL): string {
  return `${url.protocol}//${url.host}`;
}

function ertelmez(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function sajatOrigin(betoltottUrl: string): string {
  const u = ertelmez(betoltottUrl);
  if (!u) throw new Error(`Érvénytelen betöltési URL: ${betoltottUrl}`);
  return originje(u);
}

export function foablakNavigacioEngedett(url: string, origin: string): boolean {
  const u = ertelmez(url);
  if (!u || u.username || u.password) return false;
  return originje(u) === origin;
}

export function ujAblakEngedett(url: string): boolean {
  return url === 'about:blank' || url === '';
}

// A `blob:app://…` URL originje a WHATWG szerint opak (`null`), ezért előtag-egyezés: a záró
// perjel kizárja a `blob:app://mandoki-dental.idegen/…` alakot.
export function pdfAblakNavigacioEngedett(url: string, origin: string): boolean {
  return url.startsWith(`blob:${origin}/`);
}
