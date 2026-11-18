import { describe, expect, it, vi } from 'vitest';
import { FelulirasUtkozesError } from '../storage/taroloHibak';
import { felulirasSor, NemMentveUtkozesMiattError, type UtkozesKimenet } from './felulirasSor';

/** Egy memóriás „tároló”: az első, felülírás-jelző nélküli mentés ütközik, a lemezen ekkor a `masik` áll. */
function kornyezet(masik: number) {
  let aktiv = 1;
  let lemez = 1;
  let utkozik = true;
  const mentesek: Array<{ ertek: number; felulir: boolean }> = [];
  let valaszolj: (k: UtkozesKimenet) => void = () => {};
  const kerdez = vi.fn(() => new Promise<UtkozesKimenet>((r) => (valaszolj = r)));
  const sor = felulirasSor<number>({
    aktualis: () => aktiv,
    alkalmaz: (v) => {
      aktiv = v;
    },
    ment: async (ertek, felulir) => {
      mentesek.push({ ertek, felulir });
      if (utkozik && !felulir) {
        utkozik = false;
        lemez = masik;
        throw new FelulirasUtkozesError('arlista.json', masik);
      }
      lemez = ertek;
    },
    betolt: async () => lemez,
    kerdez,
  });
  sor.mentettnekJelol(1);
  return {
    sor,
    kerdez,
    mentesek,
    aktiv: () => aktiv,
    lemez: () => lemez,
    valasz: async (k: UtkozesKimenet) => {
      await vi.waitFor(() => expect(kerdez).toHaveBeenCalled());
      valaszolj(k);
    },
  };
}

describe('felulirasSor', () => {
  it('ütközés nélkül az updater szinkron érvényesül, és a mentés lefut', async () => {
    const k = kornyezet(50);
    const sor = felulirasSor<number>({
      aktualis: k.aktiv,
      alkalmaz: () => {},
      ment: async () => {},
      betolt: async () => 0,
      kerdez: k.kerdez,
    });
    let latott = 0;
    const p = sor.frissit((prev) => (latott = prev + 1));
    expect(latott).toBe(2);
    await p;
    expect(k.kerdez).not.toHaveBeenCalled();
  });

  it('„betöltés”: a memória a lemezváltozatra áll, a módosítás nem mentődik, és ezt hibával jelzi a betöltött értékkel', async () => {
    const k = kornyezet(50);

    const p = k.sor.frissit((prev) => prev + 10);
    await k.valasz('betoltes');

    const hiba = await p.catch((e: unknown) => e);
    expect(hiba).toBeInstanceOf(NemMentveUtkozesMiattError);
    expect(hiba).toMatchObject({ kimenet: 'betoltes', betoltott: 50 });
    expect(k.aktiv()).toBe(50);
    expect(k.mentesek).toEqual([{ ertek: 11, felulir: false }]);
  });

  it('„saját”: felülírás-jelzővel újramenti, a memória a saját változat marad', async () => {
    const k = kornyezet(50);

    const p = k.sor.frissit((prev) => prev + 10);
    await k.valasz('sajat');
    await p;

    expect(k.aktiv()).toBe(11);
    expect(k.lemez()).toBe(11);
    expect(k.mentesek).toEqual([
      { ertek: 11, felulir: false },
      { ertek: 11, felulir: true },
    ]);
  });

  it('„mégsem”: a memória a legutóbb mentett értékre áll vissza, és semmi nem íródik', async () => {
    const k = kornyezet(50);

    const p = k.sor.frissit((prev) => prev + 10);
    await k.valasz('megsem');

    await expect(p).rejects.toMatchObject({ kimenet: 'megsem' });
    expect(k.aktiv()).toBe(1);
    expect(k.lemez()).toBe(50);
    expect(k.mentesek).toHaveLength(1);
  });

  it('a döntés alatt indított updater a betöltött lemezváltozatra fut, egyszer', async () => {
    const k = kornyezet(50);
    const elso = k.sor.frissit((prev) => prev + 10);
    await vi.waitFor(() => expect(k.kerdez).toHaveBeenCalled());
    const updater = vi.fn((prev: number) => prev + 5);

    const masodik = k.sor.frissit(updater);
    expect(updater).not.toHaveBeenCalled();
    await k.valasz('betoltes');

    await expect(elso).rejects.toBeInstanceOf(NemMentveUtkozesMiattError);
    await masodik;
    expect(updater).toHaveBeenCalledOnce();
    expect(updater).toHaveBeenCalledWith(50);
    expect(k.lemez()).toBe(55);
  });

  it('a döntés alatt indított updater „saját” után a mentett saját változatra fut', async () => {
    const k = kornyezet(50);
    const elso = k.sor.frissit((prev) => prev + 10);
    await vi.waitFor(() => expect(k.kerdez).toHaveBeenCalled());

    const masodik = k.sor.frissit((prev) => prev + 5);
    await k.valasz('sajat');

    await elso;
    await masodik;
    expect(k.lemez()).toBe(16);
  });

  it('„mégsem” után a döntés alatt indított updater nem fut le, és a módosítása sem mentődik', async () => {
    const k = kornyezet(50);
    const elso = k.sor.frissit((prev) => prev + 10);
    await vi.waitFor(() => expect(k.kerdez).toHaveBeenCalled());
    const updater = vi.fn((prev: number) => prev + 5);

    const masodik = k.sor.frissit(updater);
    await k.valasz('megsem');

    await expect(elso).rejects.toMatchObject({ kimenet: 'megsem' });
    await expect(masodik).rejects.toMatchObject({ kimenet: 'megsem' });
    expect(updater).not.toHaveBeenCalled();
    expect(k.aktiv()).toBe(1);
    expect(k.mentesek).toHaveLength(1);
  });

  it('két, egy tickben indított mentés ugyanarra az ütközésre egyetlen kérdést tesz fel, és „saját”-nál mindkét hatás megmarad', async () => {
    let aktiv = 1;
    let utkozes = 2;
    const mentesek: Array<{ ertek: number; felulir: boolean }> = [];
    let valaszolj: (k: UtkozesKimenet) => void = () => {};
    const kerdez = vi.fn(() => new Promise<UtkozesKimenet>((r) => (valaszolj = r)));
    const sor = felulirasSor<number>({
      aktualis: () => aktiv,
      alkalmaz: (v) => {
        aktiv = v;
      },
      // A tároló sorosít: mindkét felülírás-jelző nélküli hívás még a régi hash-sel ütközik.
      ment: async (ertek, felulir) => {
        mentesek.push({ ertek, felulir });
        if (!felulir && utkozes-- > 0) throw new FelulirasUtkozesError('arlista.json', 50);
      },
      betolt: async () => 50,
      kerdez,
    });
    sor.mentettnekJelol(1);

    const a = sor.frissit((prev) => prev * 10);
    const b = sor.frissit((prev) => prev + 3);
    await vi.waitFor(() => expect(kerdez).toHaveBeenCalled());
    valaszolj('sajat');
    await a;
    await b;

    expect(kerdez).toHaveBeenCalledOnce();
    expect(aktiv).toBe(13);
    expect(mentesek.at(-1)).toEqual({ ertek: 13, felulir: false });
  });
});
