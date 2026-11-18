// A demó fájlprimitívjei: minden fájl egy `dp:<útvonal>` kulcs, a mappa a benne lévő
// kulcsokkal létezik, üres mappa nincs. A kulcsok és a PDF base64-tárolása a böngészőben élő
// demóadat miatt változatlan alakú.

import { PREFIX } from './localKeys';
import { MarLetezikError, type FajlPrimitivek } from './fajlPrimitivek';

const kulcs = (ut: string) => `${PREFIX}${ut}`;

function demoKulcsok(): string[] {
  const kulcsok: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) kulcsok.push(k);
  }
  return kulcsok;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export const localStoragePrimitivek: FajlPrimitivek = {
  async olvasSzoveg(ut) {
    return localStorage.getItem(kulcs(ut));
  },
  async olvasBajt(ut) {
    const raw = localStorage.getItem(kulcs(ut));
    return raw == null ? null : base64ToUint8(raw);
  },
  async meret(ut) {
    // A demóban a méret csak a szerződés teljessége miatt kell; a kis kulcsoknál a dekódolás olcsó.
    const raw = localStorage.getItem(kulcs(ut));
    return raw == null ? null : new TextEncoder().encode(raw).length;
  },
  async irSzoveg(ut, tartalom) {
    localStorage.setItem(kulcs(ut), tartalom);
  },
  async irBajt(ut, tartalom) {
    localStorage.setItem(kulcs(ut), uint8ToBase64(tartalom));
  },
  async torol(ut) {
    localStorage.removeItem(kulcs(ut));
  },
  async listaz(ut) {
    const elotag = kulcs(ut ? `${ut}/` : '');
    const nevek = new Set<string>();
    for (const k of demoKulcsok()) {
      if (!k.startsWith(elotag)) continue;
      const nev = k.slice(elotag.length).split('/')[0];
      if (nev) nevek.add(nev);
    }
    return [...nevek];
  },
  async letezik(ut) {
    if (localStorage.getItem(kulcs(ut)) != null) return true;
    const elotag = kulcs(`${ut}/`);
    return demoKulcsok().some((k) => k.startsWith(elotag));
  },
  async mappaLetrehoz(ut, opciok) {
    // A kulcs-térben a mappa az első benne írt fájllal jön létre; csak a foglaltság számít.
    if (opciok?.kizarolagos && (await this.letezik(ut))) throw new MarLetezikError(ut);
  },
  async torolMappa(ut) {
    // A záró `/` nélkül egy olyan testvérmappa is törlődne, aminek ez a név az előtagja.
    const elotag = kulcs(`${ut}/`);
    for (const k of demoKulcsok()) if (k.startsWith(elotag)) localStorage.removeItem(k);
  },
  async atnevez(regi, uj) {
    if (await this.letezik(uj)) throw new MarLetezikError(uj);
    const elotag = kulcs(`${regi}/`);
    for (const k of demoKulcsok()) {
      if (!k.startsWith(elotag)) continue;
      localStorage.setItem(kulcs(`${uj}/${k.slice(elotag.length)}`), localStorage.getItem(k)!);
      localStorage.removeItem(k);
    }
  },
};
