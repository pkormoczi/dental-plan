// Minden oldalon látszik -- a publikus URL miatt ez nem opcionális
// (lásd a terv "Demó banner minden oldalon" pontját).

import { t } from '../design/tokens';

export default function DemoBanner() {
  return (
    <div
      style={{
        background: t.dangerBg,
        color: t.danger,
        fontSize: 12.5,
        padding: '7px 14px',
        textAlign: 'center',
        borderBottom: `1px solid ${t.dangerBorder}`,
      }}
    >
      <strong>DEMÓ</strong> — az adatok csak ebben a böngészőben, titkosítatlanul
      tárolódnak. Ne írj be valódi páciensadatot; ha véletlenül mégis, a DEMO
      oldal Adatkezelés fülén a „Minden adat törlése” gombbal tudod kiüríteni
      a tárolót.
    </div>
  );
}
