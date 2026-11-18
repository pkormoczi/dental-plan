// Egy AppState-ben tartott, felülírt fájl (árlista, beállítások) mentési sora az ütközésőr
// mellett (migrációs terv §4.6). React-mentes, hogy a sorrend-szabályok külön tesztelhetők
// legyenek; a dialógust a hívó adja a `kerdez`-zel.

import { FelulirasUtkozesError } from '../storage/taroloHibak';

/** A doki döntése az ütközés-dialógusban; az Escape a `megsem`. */
export type UtkozesKimenet = 'betoltes' | 'sajat' | 'megsem';

/**
 * A módosítás ütközés miatt nem mentődött: a doki a másik gép változatát töltötte be, vagy
 * megszakította a döntést. A hívó a saját hibahelyén mutatja; `betoltes`-nél a `betoltott` a
 * lemezről betöltött, most aktív érték, amire egy helyi űrlap visszaállhat.
 */
export class NemMentveUtkozesMiattError extends Error {
  readonly kimenet: 'betoltes' | 'megsem';
  readonly betoltott: unknown;

  constructor(kimenet: 'betoltes' | 'megsem', betoltott: unknown = null) {
    super(
      kimenet === 'betoltes'
        ? 'A másik gép változata betöltődött; ez a módosítás nem mentődött.'
        : 'Nem mentve: a fájl időközben a másik gépen módosult. Újramentéskor ismét választhatsz.',
    );
    this.name = 'NemMentveUtkozesMiattError';
    this.kimenet = kimenet;
    this.betoltott = betoltott;
  }
}

export interface FelulirasSorOpciok<T> {
  /** A memóriában most aktív érték -- az updater erre épül. */
  aktualis: () => T;
  alkalmaz: (ertek: T) => void;
  ment: (ertek: T, felulir: boolean) => Promise<void>;
  /** A lemezváltozat betöltése; a tároló ezzel az ismert hash-t is frissíti. */
  betolt: () => Promise<T>;
  kerdez: () => Promise<UtkozesKimenet>;
}

export interface FelulirasSor<T> {
  /** A legutóbb tartósan mentett (vagy betöltött) érték -- `megsem`-nél erre áll vissza a memória. */
  mentettnekJelol: (ertek: T) => void;
  /**
   * Optimista mentés: az updater szinkron fut és azonnal érvényesül, hogy egy egy tickben induló
   * második hívás már erre épüljön. Függő ütközés-döntés alatt viszont az updater csak a döntés
   * után fut (a lemezváltozatra, ha azt töltötték be), `megsem` után pedig egyáltalán nem.
   */
  frissit: (updater: (prev: T) => T) => Promise<void>;
}

export function felulirasSor<T>(o: FelulirasSorOpciok<T>): FelulirasSor<T> {
  let mentett: T | null = null;
  let fuggo: Promise<UtkozesKimenet> | null = null;

  async function mentUtkozessel(kovetkezo: T): Promise<void> {
    for (;;) {
      try {
        await o.ment(kovetkezo, false);
        mentett = kovetkezo;
        return;
      } catch (err) {
        if (!(err instanceof FelulirasUtkozesError)) throw err;
      }
      if (fuggo) {
        // Egy vele egy tickben indult mentés már a doki elé vitte ugyanezt az ütközést: annak
        // döntése erre is vonatkozik, második dialógus nem nyílik.
        const kimenet = await fuggo;
        if (kimenet === 'sajat') continue;
        throw new NemMentveUtkozesMiattError(kimenet, kimenet === 'betoltes' ? o.aktualis() : null);
      }
      let felold: (k: UtkozesKimenet) => void = () => {};
      fuggo = new Promise((r) => (felold = r));
      let kimenet: UtkozesKimenet = 'megsem';
      try {
        kimenet = await o.kerdez();
        if (kimenet === 'sajat') {
          await o.ment(kovetkezo, true);
          mentett = kovetkezo;
          return;
        }
        if (kimenet === 'betoltes') {
          const lemez = await o.betolt();
          o.alkalmaz(lemez);
          mentett = lemez;
          throw new NemMentveUtkozesMiattError('betoltes', lemez);
        }
        if (mentett !== null) o.alkalmaz(mentett);
        throw new NemMentveUtkozesMiattError('megsem');
      } catch (err) {
        // Sikertelen betöltésnél vagy saját mentésnél sem maradhat aktív a nem mentett érték.
        if (!(err instanceof NemMentveUtkozesMiattError) && mentett !== null) o.alkalmaz(mentett);
        throw err;
      } finally {
        fuggo = null;
        felold(kimenet);
      }
    }
  }

  return {
    mentettnekJelol: (ertek) => {
      mentett = ertek;
    },
    frissit: async (updater) => {
      while (fuggo) {
        if ((await fuggo) === 'megsem') throw new NemMentveUtkozesMiattError('megsem');
      }
      const kovetkezo = updater(o.aktualis());
      o.alkalmaz(kovetkezo);
      await mentUtkozessel(kovetkezo);
    },
  };
}
