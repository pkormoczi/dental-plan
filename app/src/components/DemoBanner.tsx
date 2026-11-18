// Minden oldalon látszik -- a publikus URL miatt ez nem opcionális
// (lásd a terv "Demó banner minden oldalon" pontját). A telepített app már a valódi
// adatmappába ír, ott az éles indulás kapujáig a próbaüzem-figyelmeztetés áll a helyén.

import { t } from '../design/tokens';
import { useStorage } from '../storage/StorageContext';

const SAV_STILUS = {
  background: t.dangerBg,
  color: t.danger,
  fontSize: 12.5,
  padding: '7px 14px',
  textAlign: 'center',
  borderBottom: `1px solid ${t.dangerBorder}`,
} as const;

export default function DemoBanner() {
  const { adattarolas } = useStorage();
  if (adattarolas) {
    return (
      <div style={SAV_STILUS}>
        <strong>PRÓBAÜZEM</strong> — csak kitalált páciensadattal dolgozz, az éles indulásig.
      </div>
    );
  }
  return (
    <div style={SAV_STILUS}>
      <strong>DEMÓ</strong> — az adatok csak ebben a böngészőben, titkosítatlanul
      tárolódnak. Ne írj be valódi páciensadatot; ha véletlenül mégis, a DEMO
      oldal Adatkezelés fülén a „Minden adat törlése” gombbal tudod kiüríteni
      a tárolót.
    </div>
  );
}
