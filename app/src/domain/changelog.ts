// A gyökér CHANGELOG.md feldolgozása a Kezdőlap changelog-blokkjához. A
// formátum kötött (lásd CHANGELOG.md): "## <dátum>" szakaszcímek, alattuk
// "- " listaelemek, amik folytatódhatnak a következő, kötőjel nélküli
// sorokon -- ezeket egy elemmé kell összefűzni. Szándékosan nem egy
// általános markdown-parser, csak ennyit kell tudnia.

export interface ChangelogSzakasz {
  cim: string;
  tetelek: string[];
}

export function parseChangelog(markdown: string): ChangelogSzakasz[] {
  const szakaszok: ChangelogSzakasz[] = [];
  let aktualis: ChangelogSzakasz | null = null;
  let nyitottTetel: string | null = null;

  const lezarTetel = () => {
    if (aktualis && nyitottTetel !== null) {
      aktualis.tetelek.push(nyitottTetel.trim());
    }
    nyitottTetel = null;
  };

  for (const sor of markdown.split(/\r?\n/)) {
    if (sor.startsWith('## ')) {
      lezarTetel();
      aktualis = { cim: sor.slice(3).trim(), tetelek: [] };
      szakaszok.push(aktualis);
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
  return szakaszok;
}
