// Minden oldalon látszik -- a publikus URL miatt ez nem opcionális
// (lásd a terv "Demó banner minden oldalon" pontját).

import { t } from '../design/tokens';

export default function DemoBanner() {
  return (
    <div
      style={{
        background: t.warnBg,
        color: t.warn,
        fontSize: 12.5,
        padding: '7px 14px',
        textAlign: 'center',
        borderBottom: `1px solid ${t.line}`,
      }}
    >
      <strong>DEMÓ</strong> — az adatok csak ebben a böngészőben tárolódnak. Ne
      írj be valódi páciensadatot.
    </div>
  );
}
