// Tartalom-hash a manifesthez és az ütközésőrhöz. A Web Crypto a böngészőben és a main process
// Node-jában is elérhető, így a mag DOM-mentes marad (migrációs terv §9.1).

export async function sha256Hex(adat: Uint8Array | string): Promise<string> {
  // Saját másolat: a digest csak `ArrayBuffer`-alapú nézetet fogad, megosztott puffert nem.
  const bajt = typeof adat === 'string' ? new TextEncoder().encode(adat) : new Uint8Array(adat);
  const hash = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bajt));
  return Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('');
}
