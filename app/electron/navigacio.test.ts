import { describe, expect, it } from 'vitest';
import {
  foablakNavigacioEngedett,
  pdfAblakNavigacioEngedett,
  sajatOrigin,
  ujAblakEngedett,
} from './navigacio.js';

const APP = sajatOrigin('app://mandoki-dental/index.html');
const DEV = sajatOrigin('http://localhost:5173/');

describe('foablakNavigacioEngedett', () => {
  it('a saját originen belüli navigáció engedett productionben és a dev szerveren', () => {
    expect(foablakNavigacioEngedett('app://mandoki-dental/index.html#/paciensek', APP)).toBe(true);
    expect(foablakNavigacioEngedett('http://localhost:5173/#/elonezet', DEV)).toBe(true);
  });

  it('idegen https, file, data, javascript és idegen hoszt tiltott', () => {
    for (const url of [
      'https://example.org/',
      'file:///C:/Windows/win.ini',
      'data:text/html,<h1>x</h1>',
      'javascript:alert(1)',
      'app://mandoki-dental.idegen/index.html',
      'app://idegen/index.html',
      'http://localhost:5174/',
      'nem-url',
    ]) {
      expect(foablakNavigacioEngedett(url, APP), url).toBe(false);
    }
    expect(foablakNavigacioEngedett('app://mandoki-dental/index.html', DEV)).toBe(false);
  });

  it('felhasználónevet hordozó saját-hoszt URL tiltott', () => {
    expect(foablakNavigacioEngedett('app://x@mandoki-dental/index.html', APP)).toBe(false);
  });
});

describe('ujAblakEngedett', () => {
  it('új ablak csak az about:blank-ből induló PDF-megnyitáshoz nyílhat', () => {
    expect(ujAblakEngedett('about:blank')).toBe(true);
    expect(ujAblakEngedett('https://example.org/')).toBe(false);
    expect(ujAblakEngedett('app://mandoki-dental/index.html')).toBe(false);
    expect(ujAblakEngedett('blob:app://mandoki-dental/1e34')).toBe(false);
  });
});

describe('pdfAblakNavigacioEngedett', () => {
  it('a PDF-ablak csak a saját origin blob: URL-jére navigálhat', () => {
    expect(pdfAblakNavigacioEngedett('blob:app://mandoki-dental/1e347e5e', APP)).toBe(true);
    for (const url of [
      'blob:app://mandoki-dental.idegen/1e34',
      'blob:https://example.org/1e34',
      'https://example.org/',
      'app://mandoki-dental/index.html',
      'about:blank#x',
    ]) {
      expect(pdfAblakNavigacioEngedett(url, APP), url).toBe(false);
    }
  });
});
