// Kezdőlap: rövid, képernyőnkénti áttekintés egy új felhasználónak, mielőtt
// belevágna. A NavBar linkjeivel megegyező elnevezéseket használ, ugyanabban
// a sorrendben, hogy a felsorolás és a fenti navigáció fedje egymást.

import { Box, Card, Heading, Text } from '@radix-ui/themes';
import { t } from '../design/tokens';

type Szakasz = {
  cim: string;
  pontok: string[];
};

const SZAKASZOK: Szakasz[] = [
  {
    cim: 'Páciens',
    pontok: [
      'Páciens adatainak rögzítése (név, elérhetőség, szükség esetén törvényes képviselő).',
      'Itt dől el a terv nyelve (magyar/német) és pénzneme (forint/euró) — ez a választás az első mentés után rögzül.',
    ],
  },
  {
    cim: 'Terv szerkesztő',
    pontok: [
      'A kezelési terv összeállítása fázisokra bontva, tételenkénti gyors kereséssel az árlistából.',
      'Kattintható fogtérkép: egy fogra kattintva közvetlenül onnan is felvehető egy kezelés.',
      'Áreltérés, mennyiség és — fogtechnikai munkánál — előleg feltüntetése kezelésenként/összesítve.',
    ],
  },
  {
    cim: 'Előnézet',
    pontok: [
      'A végleges nyomtatvány megtekintése véglegesítés előtt, „csak ajánlat" (nyilatkozat és aláírás nélküli) változatban is.',
      'Innen indul a véglegesítés: ekkor készül el a letölthető PDF, és ekkor mentődik a terv új verzióként.',
    ],
  },
  {
    cim: 'Korábbi tervek',
    pontok: [
      'Egy visszatérő páciens korábbi ajánlatainak/terveinek keresése és megnyitása, végösszeggel.',
      'Régi verzió sosem íródik felül — módosításkor mindig új verzió készül, a korábbi aláírt állapot változatlan marad.',
    ],
  },
  {
    cim: 'Árlista',
    pontok: [
      'A kínált kezelések, áraik és kategóriáik karbantartása.',
      'Tétel törlés helyett inaktiválható, hogy a rá hivatkozó régi tervek később is értelmezhetők maradjanak.',
    ],
  },
  {
    cim: 'Beállítások',
    pontok: [
      'Rendelő adatai, orvosok listája és logó a nyomtatvány fejlécéhez/lábléchez.',
      'Nyilatkozat és fizetési feltételek sablonszövegének szerkesztése.',
      'Német nyelvű ajánlat engedélyezése, és annak áttekintése, mennyi tartalom áll már készen németül.',
    ],
  },
];

export default function FeatureOverviewCard() {
  return (
    <Card size="2" mb="4">
      <Heading size="3" mb="3" style={{ color: t.brand }}>
        Miben segít az alkalmazás?
      </Heading>
      {SZAKASZOK.map((szakasz) => (
        <Box key={szakasz.cim} mb="4">
          <Text as="p" size="2" weight="bold" mb="2">
            {szakasz.cim}
          </Text>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {szakasz.pontok.map((pont, i) => (
              <li key={i}>
                <Text as="p" size="2" color="gray" mt="0" mb="1">
                  {pont}
                </Text>
              </li>
            ))}
          </ul>
        </Box>
      ))}
    </Card>
  );
}
