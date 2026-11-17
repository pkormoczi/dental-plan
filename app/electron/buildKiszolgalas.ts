import path from 'node:path';
import { APP_HOSZT } from './protocol.js';

// Ami a build-mappán kívülre oldódna fel (`..`, kódolt `..` vagy perjel, abszolút út, idegen
// hoszt), az `null` és 404: a renderer a saját buildjén kívül semmit nem olvastathat a lemezről.
export function buildFajlUtvonal(buildGyoker: string, keresUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(keresUrl);
  } catch {
    return null;
  }
  if (url.host !== APP_HOSZT) return null;
  let relativ: string;
  try {
    relativ = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  } catch {
    return null;
  }
  if (relativ.includes('\0')) return null;
  if (relativ === '') relativ = 'index.html';
  const gyoker = path.resolve(buildGyoker);
  const cel = path.resolve(gyoker, relativ);
  const viszony = path.relative(gyoker, cel);
  if (viszony === '' || viszony.startsWith('..') || path.isAbsolute(viszony)) return null;
  return cel;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

export function mimeTipus(fajl: string): string {
  return MIME[path.extname(fajl).toLowerCase()] ?? 'application/octet-stream';
}
