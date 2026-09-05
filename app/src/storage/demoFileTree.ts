// A DemoStorage `dp:` localStorage-kulcsaiból épít egy fát -- a
// Filerendszer nézet demó-only vizualizációs rétege. Tiszta, `DemoStorage`-
// tól független modul: nem ismeri a `localStorage`-ot, csak a kulcsok
// tömbjét kapja -- ez teszi lehetővé, hogy a legfontosabb szabály (a
// piszkozat-cache-ek soha nem jelennek meg) egyetlen egyszerű unit
// teszttel garantálható legyen, DemoStorage-példány nélkül.
//
// ALLOWLIST, nem denylist: csak az alább felismert kulcsalakok kerülnek
// be -- minden más (a `dp:piszkozat` ÉS a `dp:sablon-piszkozat`
// draft-cache-ek, a páciens-entitás előtti legacy 2-szintű
// mappaszerkezet, bármilyen jövőbeli, még nem ismert
// kulcsalak) némán kimarad. A fa a `PlanStorage` vetülete legyen, nem a
// nyers `localStorage`-é -- a draft-cache-ek a végleges architektúrában
// IndexedDB, nem fájl.

import type { PlanRef } from '../domain/types';

/** A `.../pdf` kulcs (kiterjesztés nélkül) megjelenítési neve -- a mögöttes storageKey változatlan marad. */
export const PDF_DISPLAY_NAME = 'kezelesi-terv.pdf';

export interface DemoDirNode {
  type: 'dir';
  name: string;
  /** Szegmensek `/`-lel összefűzve, a gyökérhez képest -- nincs vezető `/`. */
  path: string;
  children: DemoNode[];
}

export interface DemoTextFileNode {
  type: 'file';
  name: string;
  path: string;
  /** A nyers, változatlan `dp:` kulcs -- a fa a megjelenítési nevet, ez a mögöttes kulcsot őrzi. */
  storageKey: string;
  format: 'json' | 'markdown';
}

export interface DemoPdfFileNode {
  type: 'file';
  name: string;
  path: string;
  storageKey: string;
  format: 'pdf';
  ref: PlanRef;
}

export type DemoFileNode = DemoTextFileNode | DemoPdfFileNode;
export type DemoNode = DemoDirNode | DemoFileNode;

interface Classified {
  /** Megjelenítési szegmensek -- a `pdf` esetén az utolsó már `PDF_DISPLAY_NAME`. */
  segments: string[];
  format: DemoFileNode['format'];
  ref?: PlanRef;
}

/** Egyetlen kulcs (a prefix levágása utáni szegmensei) osztályozása -- `null`, ha ismeretlen/kizárt alak. */
function classify(segments: string[]): Classified | null {
  if (segments.length === 1) {
    const [name] = segments;
    if (name === 'arlista.json' || name === 'beallitasok.json') {
      return { segments, format: 'json' };
    }
    return null;
  }

  const [first, ...rest] = segments;

  if (first === 'sablonok' && rest.length === 1 && rest[0].endsWith('.md')) {
    return { segments, format: 'markdown' };
  }

  if (first === 'paciensek') {
    if (rest.length === 2 && rest[1] === 'paciens.json') {
      return { segments, format: 'json' };
    }
    if (rest.length === 2 && rest[1] === 'paciens-adatok.json') {
      return { segments, format: 'json' };
    }
    if (rest.length === 3 && rest[2] === 'terv-cimke.json') {
      return { segments, format: 'json' };
    }
    if (rest.length === 4 && rest[3] === 'terv.json') {
      return { segments, format: 'json' };
    }
    if (rest.length === 4 && rest[3] === 'pdf') {
      const [patientDir, planDir, versionDir] = rest;
      return {
        segments: [...segments.slice(0, -1), PDF_DISPLAY_NAME],
        format: 'pdf',
        ref: { patientDir, planDir, versionDir },
      };
    }
  }

  return null;
}

interface MutableDirNode {
  type: 'dir';
  name: string;
  path: string;
  children: Map<string, MutableDirNode | DemoFileNode>;
}

function getOrCreateDir(parent: MutableDirNode, name: string): MutableDirNode {
  const existing = parent.children.get(name);
  if (existing && existing.type === 'dir') return existing;
  const dir: MutableDirNode = {
    type: 'dir',
    name,
    path: parent.path ? `${parent.path}/${name}` : name,
    children: new Map(),
  };
  parent.children.set(name, dir);
  return dir;
}

function insert(root: MutableDirNode, classified: Classified, storageKey: string): void {
  let cursor = root;
  for (let i = 0; i < classified.segments.length - 1; i++) {
    cursor = getOrCreateDir(cursor, classified.segments[i]);
  }
  const name = classified.segments[classified.segments.length - 1];
  const path = cursor.path ? `${cursor.path}/${name}` : name;
  const file: DemoFileNode =
    classified.format === 'pdf'
      ? { type: 'file', name, path, storageKey, format: 'pdf', ref: classified.ref! }
      : { type: 'file', name, path, storageKey, format: classified.format };
  cursor.children.set(name, file);
}

/** Fájlok a mappák előtt, utána ékezet- és számtudatos névsorrend. */
function compareNodes(a: DemoNode, b: DemoNode): number {
  if (a.type !== b.type) return a.type === 'file' ? -1 : 1;
  return a.name.localeCompare(b.name, 'hu', { numeric: true });
}

function finalize(node: MutableDirNode): DemoDirNode {
  const children = [...node.children.values()].map((child) =>
    child.type === 'dir' ? finalize(child) : child,
  );
  children.sort(compareNodes);
  return { type: 'dir', name: node.name, path: node.path, children };
}

/**
 * `dp:`-prefixű nyers kulcsokból épít egy rendezett fát. A `prefix`
 * paraméterezett (nem a `DemoStorage.PREFIX`-et importálja) -- ez tartja
 * ezt a modult a `DemoStorage`-tól függetlennek, `localStorage` nélkül
 * tesztelhetőnek.
 */
export function buildDemoFileTree(keys: string[], prefix: string): DemoNode[] {
  const root: MutableDirNode = { type: 'dir', name: '', path: '', children: new Map() };
  for (const key of keys) {
    if (!key.startsWith(prefix)) continue;
    const relative = key.slice(prefix.length);
    if (!relative) continue;
    const classified = classify(relative.split('/'));
    if (!classified) continue;
    insert(root, classified, key);
  }
  return finalize(root).children;
}
