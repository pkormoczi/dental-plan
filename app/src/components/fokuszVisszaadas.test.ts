import { afterEach, describe, expect, it } from 'vitest';
import { fokuszVisszaadasOnClose } from './fokuszVisszaadas';

function kepkocka(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

function gomb(szulo: HTMLElement = document.body): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = 'cél';
  szulo.appendChild(b);
  return b;
}

function ablak(role: 'dialog' | 'alertdialog', state: 'open' | 'closed'): HTMLDivElement {
  const d = document.createElement('div');
  d.setAttribute('role', role);
  d.setAttribute('data-state', state);
  const mezo = document.createElement('input');
  d.appendChild(mezo);
  document.body.appendChild(d);
  return d;
}

function zaras(cel: HTMLElement): Event {
  const event = new Event('focusScope.autoFocusOnUnmount', { cancelable: true });
  fokuszVisszaadasOnClose(() => cel)(event);
  return event;
}

describe('fokuszVisszaadasOnClose', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('nyitott modális ablak nélkül egy képkocka után a célra fókuszál, és a Radix alapértelmezését letiltja', async () => {
    const cel = gomb();
    const event = zaras(cel);

    expect(event.defaultPrevented).toBe(true);
    await kepkocka();
    expect(document.activeElement).toBe(cel);
  });

  it('ha közben egy másik, a célt nem tartalmazó modális ablak nyílt, a fókusz ott marad', async () => {
    const cel = gomb();
    const uj = ablak('dialog', 'open');
    const mezo = uj.querySelector('input')!;
    mezo.focus();

    zaras(cel);
    await kepkocka();

    expect(document.activeElement).toBe(mezo);
  });

  it('egymásba ágyazott ablaknál a nyitva maradó külső ablakban lévő célra visszaadja a fókuszt', async () => {
    const kulso = ablak('dialog', 'open');
    const cel = gomb(kulso);
    kulso.querySelector('input')!.focus();

    zaras(cel);
    await kepkocka();

    expect(document.activeElement).toBe(cel);
  });

  it('egy már bezárt állapotú ablak nem akadályozza a visszaadást', async () => {
    ablak('alertdialog', 'closed');
    const cel = gomb();

    zaras(cel);
    await kepkocka();

    expect(document.activeElement).toBe(cel);
  });
});
