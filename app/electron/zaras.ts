// A kilépési emlékeztető őre (migrációs terv §6.4): ha a munkamenetben írás történt, a főablak
// bezárása előtt a renderer egy rövid záró képernyőt mutat a gépváltási szabállyal. Nem
// detektál semmit a Drive-ról, csak ott ismétli a szabályt, ahol a doki épp gépet vált.

/** Ha a renderer nem válaszol (lefagyott, épp újratölt), a bezárás ennyi idő után magától megy. */
export const ZARAS_HATARIDO_MS = 8000;

export interface ZarasOr {
  /** Sikeres írás a gyökérmappába -- ettől kezdve a bezárás előtt emlékeztet. */
  irasTortent(): void;
  /** A főablak `close` eseményén: igaz, ha a bezárás most mehet; hamisnál a hívó megakasztja. */
  bezarhato(): boolean;
  /** A záró képernyő vége (vagy a határidő): innen a bezárás akadálytalan. */
  kilep(): void;
}

export function zarasOr(o: {
  kepernyotKer: () => void;
  bezar: () => void;
  hatarido?: number;
  idozit?: (fn: () => void, ms: number) => void;
}): ZarasOr {
  const idozit = o.idozit ?? ((fn, ms) => void setTimeout(fn, ms));
  let iras = false;
  let engedett = false;
  let kerve = false;
  const kilep = () => {
    if (engedett) return;
    engedett = true;
    o.bezar();
  };
  return {
    irasTortent: () => {
      iras = true;
    },
    bezarhato: () => {
      if (engedett || !iras) return true;
      if (!kerve) {
        kerve = true;
        o.kepernyotKer();
        idozit(kilep, o.hatarido ?? ZARAS_HATARIDO_MS);
      }
      return false;
    },
    kilep,
  };
}
