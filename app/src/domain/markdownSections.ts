// Közös szakasz-parser a Kezdőlap két fájl-alapú kártyájához: a gyökér
// CHANGELOG.md-hez (ChangelogCard) és FEATURES.md-hez (FeatureOverviewCard).
// A formátum mindkettőnél kötött: "## <cím>" szakaszcímek, alattuk "- "
// listaelemek, amik folytatódhatnak a következő, kötőjel nélküli sorokon --
// ezeket egy elemmé kell összefűzni. Szándékosan nem egy általános
// markdown-parser, csak ennyit kell tudnia.
//
// Az opcionális `alcimek` mód ("### <cím>") KIZÁRÓLAG a FeatureOverviewCard
// hívásán él (a Páciensek szekció hosszú listájának olvashatóságához) -- a
// ChangelogCard a CHANGELOG.md-t továbbra is opció nélkül hívja, ott a "### "
// sor kezeletlen marad, ahogy eddig is. `alcimek` nélkül a visszaadott
// `MarkdownSzakasz.csoportok` mindig `undefined`, tehát a hívó viselkedése
// bit-pontosan a korábbi.

export interface MarkdownAlcsoport {
  /** `null` a szakasz elején, egy "### " alcím ELŐTT álló pontoknak. */
  cim: string | null;
  tetelek: string[];
}

export interface MarkdownSzakasz {
  cim: string;
  tetelek: string[];
  /** Csak `alcimek: true` mellett, és csak ha a szakasz tartalmaz "### " sort. */
  csoportok?: MarkdownAlcsoport[];
}

export function parseSections(markdown: string, opts?: { alcimek?: boolean }): MarkdownSzakasz[] {
  const alcimek = opts?.alcimek === true;
  const szakaszok: MarkdownSzakasz[] = [];
  let aktualis: MarkdownSzakasz | null = null;
  let aktualisCsoport: MarkdownAlcsoport | null = null;
  let nyitottTetel: string | null = null;

  const lezarTetel = () => {
    if (aktualis && nyitottTetel !== null) {
      const szoveg = nyitottTetel.trim();
      aktualis.tetelek.push(szoveg);
      aktualisCsoport?.tetelek.push(szoveg);
    }
    nyitottTetel = null;
  };

  for (const sor of markdown.split(/\r?\n/)) {
    if (sor.startsWith('## ')) {
      lezarTetel();
      aktualis = { cim: sor.slice(3).trim(), tetelek: [] };
      szakaszok.push(aktualis);
      aktualisCsoport = alcimek ? { cim: null, tetelek: [] } : null;
      if (aktualisCsoport) aktualis.csoportok = [aktualisCsoport];
    } else if (alcimek && sor.startsWith('### ') && aktualis) {
      lezarTetel();
      aktualisCsoport = { cim: sor.slice(4).trim(), tetelek: [] };
      aktualis.csoportok!.push(aktualisCsoport);
    } else if (sor.startsWith('- ')) {
      lezarTetel();
      nyitottTetel = sor.slice(2);
    } else if (sor.trim() === '') {
      lezarTetel();
    } else if (nyitottTetel !== null) {
      nyitottTetel += ` ${sor.trim()}`;
    }
  }
  lezarTetel();

  // Üres/cím nélküli csoportok kiszűrése -- egy szakasznak, ami sosem
  // használt "### "-t, nincs értelme a "csoportok" mezőt kitenni.
  if (alcimek) {
    for (const sz of szakaszok) {
      sz.csoportok = sz.csoportok?.filter((cs) => cs.tetelek.length > 0);
      if (sz.csoportok?.every((cs) => cs.cim === null)) {
        delete sz.csoportok;
      }
    }
  }

  return szakaszok;
}
