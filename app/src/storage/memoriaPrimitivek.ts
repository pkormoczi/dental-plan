// Memóriás fájlprimitívek: a közös mag szerződéstesztjei ezen is futnak, hogy a mag
// viselkedése a localStorage-tól függetlenül is igazolt legyen.

import { MarLetezikError, type FajlPrimitivek } from './fajlPrimitivek';

type Bejegyzes = { szoveg: string } | { bajt: Uint8Array };

export class MemoriaPrimitivek implements FajlPrimitivek {
  readonly fajlok = new Map<string, Bejegyzes>();
  private readonly mappak = new Set<string>();

  async olvasSzoveg(ut: string): Promise<string | null> {
    const b = this.fajlok.get(ut);
    if (!b) return null;
    return 'szoveg' in b ? b.szoveg : new TextDecoder().decode(b.bajt);
  }

  async olvasBajt(ut: string): Promise<Uint8Array | null> {
    const b = this.fajlok.get(ut);
    if (!b) return null;
    return 'bajt' in b ? new Uint8Array(b.bajt) : new TextEncoder().encode(b.szoveg);
  }

  async irSzoveg(ut: string, tartalom: string): Promise<void> {
    this.fajlok.set(ut, { szoveg: tartalom });
  }

  async irBajt(ut: string, tartalom: Uint8Array): Promise<void> {
    this.fajlok.set(ut, { bajt: new Uint8Array(tartalom) });
  }

  async torol(ut: string): Promise<void> {
    this.fajlok.delete(ut);
  }

  async listaz(ut: string): Promise<string[]> {
    const elotag = ut ? `${ut}/` : '';
    const nevek = new Set<string>();
    for (const p of [...this.fajlok.keys(), ...this.mappak]) {
      if (p.startsWith(elotag) && p.length > elotag.length) nevek.add(p.slice(elotag.length).split('/')[0]);
    }
    return [...nevek];
  }

  async letezik(ut: string): Promise<boolean> {
    if (this.fajlok.has(ut) || this.mappak.has(ut)) return true;
    return (await this.listaz(ut)).length > 0;
  }

  async mappaLetrehoz(ut: string, opciok?: { kizarolagos?: boolean }): Promise<void> {
    if (opciok?.kizarolagos && (await this.letezik(ut))) throw new MarLetezikError(ut);
    this.mappak.add(ut);
  }

  async torolMappa(ut: string): Promise<void> {
    const elotag = `${ut}/`;
    for (const p of [...this.fajlok.keys()]) if (p.startsWith(elotag)) this.fajlok.delete(p);
    for (const p of [...this.mappak]) if (p === ut || p.startsWith(elotag)) this.mappak.delete(p);
  }

  async atnevez(regi: string, uj: string): Promise<void> {
    if (await this.letezik(uj)) throw new MarLetezikError(uj);
    const elotag = `${regi}/`;
    for (const [p, b] of [...this.fajlok]) {
      if (!p.startsWith(elotag)) continue;
      this.fajlok.delete(p);
      this.fajlok.set(`${uj}/${p.slice(elotag.length)}`, b);
    }
    for (const p of [...this.mappak]) {
      if (p !== regi && !p.startsWith(elotag)) continue;
      this.mappak.delete(p);
      this.mappak.add(uj + p.slice(regi.length));
    }
  }
}
