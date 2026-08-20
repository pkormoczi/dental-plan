// A generált PDF fix feliratai, nyelvenként. D21: a `plan.nyelv` a
// nyomtatvány szövegét vezérli (a kezelőfelületét nem -- a doki magyar, a
// NavBar/Home/Beállítások/Árlista admin/szerkesztő végig magyar marad).
//
// EZ A FÁJL KIZÁRÓLAG A `pdf/` ALATT ÉLHET -- a `pages/` alól nem
// importálható. Ha valaha felmerül "ha már úgyis van egy labels.ts,
// fordítsuk le a NavBart is" -- az egy külön, i18n-döntés, nem ennek a
// fájlnak a bővítése.
//
// A ragozásos mondatok (érvényesség, aláírás dátuma) FÜGGVÉNYEK, nem
// sablon-behelyettesítés -- a magyar és a német ragozás nem ugyanott
// illeszkedik a mondatba.

import type { Nyelv } from '../domain/types';

/** A rendelő Budapesten van -- ez nem a páciens nyelvétől függ. */
export const ALAIRAS_VAROS = 'Budapest';

export interface PdfLabels {
  docTitle: string;
  miniHeaderPrefix: string;
  thBeavatkozas: string;
  thFog: string;
  thDb: string;
  thEgysegar: string;
  thOsszeg: string;
  fazisOsszesen: string;
  megjegyzesPrefix: string;
  kvNev: string;
  kvTelefon: string;
  kvSzuletett: string;
  kvEmail: string;
  kvTaj: string;
  kvLakcim: string;
  adoszam: string;
  cegjegyzekszam: string;
  arlistaPrefix: string;
  erintettFogak: string;
  /** A fogtérkép alatti tejfog-felsorolás előtagja -- a rajz csak a 32 maradó fogat ábrázolja. */
  tejfogakPrefix: string;
  kezelesekOsszesen: string;
  fizetendo: string;
  /** Az előleg összegző sor felirata -- D64 óta sima "Előleg"/"Anzahlung", az összeg az érték-oszlopban áll, zárójeles ismétlés nélkül. */
  elolegSor: string;
  fennmaradoResz: string;
  /**
   * A fizetési feltételek sablonszövegének `{{eloleg}}` helyőrzőjét feloldó
   * kifejezés (D64) -- `osszeg` a formázott, bekapcsolt előleg (pl.
   * "390 000 Ft"), `null` kikapcsolt előlegnél, ilyenkor a mondat a
   * konkrét összeg helyett a "megállapított"/"vereinbarte" előlegre utal,
   * hogy a szöveg ne mondjon nyers helyőrzőt vagy hamis nullát.
   */
  elolegKifejezes: (osszeg: string | null) => string;
  /** JOGI SZÖVEG — lektorálandó, mielőtt éles németnyelvű PDF-re kerül. */
  anyagkoltseg: string;
  /** JOGI SZÖVEG — a D15 (sávos ár) jogi védelme, lektorálandó. */
  savosFootnote: string;
  fizetesiFeltetelekCim: string;
  nyilatkozatCim: string;
  garanciaCim: string;
  megbizott: string;
  megrendelo: string;
  /** JOGI SZÖVEG — lektorálandó. */
  kiskoruNote: string;
  /** JOGI SZÖVEG — lektorálandó. Ragozás miatt függvény, nem sablon-behelyettesítés. */
  ervenyessegMondat: (hosszuDatum: string) => string;
  alairasSor: (varos: string, hosszuDatum: string) => string;
}

export const PDF_LABELS: Record<Nyelv, PdfLabels> = {
  hu: {
    docTitle: 'Kezelési terv és árajánlat',
    miniHeaderPrefix: 'Kezelési terv · ',
    thBeavatkozas: 'Beavatkozás',
    thFog: 'Fog',
    thDb: 'Db',
    thEgysegar: 'Egységár',
    thOsszeg: 'Összeg',
    fazisOsszesen: 'Fázis összesen',
    megjegyzesPrefix: 'Megjegyzés: ',
    kvNev: 'Név',
    kvTelefon: 'Telefon',
    kvSzuletett: 'Született',
    kvEmail: 'E-mail',
    kvTaj: 'TAJ',
    kvLakcim: 'Lakcím',
    adoszam: 'Adószám:',
    cegjegyzekszam: 'Cégjegyzékszám:',
    arlistaPrefix: 'árlista ',
    erintettFogak: 'Érintett fogak',
    tejfogakPrefix: 'Tejfogak: ',
    kezelesekOsszesen: 'Kezelések összesen',
    fizetendo: 'Fizetendő',
    elolegSor: 'Előleg',
    fennmaradoResz: 'Fennmaradó rész',
    elolegKifejezes: (osszeg) => (osszeg == null ? 'a megállapított előleg' : `${osszeg} előleg`),
    anyagkoltseg: 'Az árak tartalmazzák az anyagköltséget.',
    savosFootnote:
      '* A csillaggal jelölt tételek ára — és a belőlük számított összegek (fizetendő, előleg, fennmaradó rész) — a kezelés során derül ki véglegesen, a megadott ár becslés.',
    fizetesiFeltetelekCim: 'Fizetési feltételek',
    nyilatkozatCim: 'Nyilatkozat',
    garanciaCim: 'Garancia',
    megbizott: 'Megbízott:',
    megrendelo: 'Megrendelő:',
    kiskoruNote:
      'Cselekvőképesség hiányában, vagy korlátozott cselekvőképesség esetén a beteg helyett CSAK a törvényes képviselő írhatja alá.',
    ervenyessegMondat: (d) => `Az ajánlat ${d} napjáig érvényes.`,
    alairasSor: (varos, d) => `${varos}, ${d}`,
  },
  // FIGYELEM: gépi/vázlat fordítás. A ~4 jogi mondat (lásd a fenti
  // "JOGI SZÖVEG" kommentek) éles németnyelvű PDF előtt lektorálandó --
  // lásd a terv "Nyitott kérdések a dokinak" szakaszát.
  de: {
    docTitle: 'Behandlungsplan und Kostenvoranschlag',
    miniHeaderPrefix: 'Behandlungsplan · ',
    thBeavatkozas: 'Leistung',
    thFog: 'Zahn',
    thDb: 'Menge',
    thEgysegar: 'Einzelpreis',
    thOsszeg: 'Betrag',
    fazisOsszesen: 'Phase gesamt',
    megjegyzesPrefix: 'Anmerkung: ',
    kvNev: 'Name',
    kvTelefon: 'Telefon',
    kvSzuletett: 'Geburtsdatum',
    kvEmail: 'E-Mail',
    kvTaj: 'TAJ-Nr.',
    kvLakcim: 'Adresse',
    adoszam: 'Steuernummer:',
    cegjegyzekszam: 'Handelsregisternummer:',
    arlistaPrefix: 'Preisliste ',
    erintettFogak: 'Betroffene Zähne',
    tejfogakPrefix: 'Milchzähne: ',
    kezelesekOsszesen: 'Behandlungen gesamt',
    fizetendo: 'Zu zahlen',
    elolegSor: 'Anzahlung',
    fennmaradoResz: 'Restbetrag',
    elolegKifejezes: (osszeg) =>
      osszeg == null ? 'die vereinbarte Anzahlung' : `eine Anzahlung von ${osszeg}`,
    anyagkoltseg: 'Die Preise beinhalten die Materialkosten.',
    savosFootnote:
      '* Der Preis der mit einem Sternchen markierten Leistungen — und die daraus berechneten Beträge (zu zahlen, Anzahlung, Restbetrag) — wird während der Behandlung endgültig festgelegt; der angegebene Preis ist eine Schätzung.',
    fizetesiFeltetelekCim: 'Zahlungsbedingungen',
    nyilatkozatCim: 'Erklärung',
    garanciaCim: 'Garantie',
    megbizott: 'Auftragnehmer:',
    megrendelo: 'Auftraggeber:',
    kiskoruNote:
      'Bei fehlender oder eingeschränkter Geschäftsfähigkeit darf anstelle des Patienten NUR der gesetzliche Vertreter unterschreiben.',
    ervenyessegMondat: (d) => `Das Angebot ist gültig bis zum ${d}.`,
    alairasSor: (varos, d) => `${varos}, den ${d}`,
  },
};

export function pdfLabels(nyelv: Nyelv): PdfLabels {
  return PDF_LABELS[nyelv] ?? PDF_LABELS.hu;
}
