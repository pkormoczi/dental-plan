// Címke-fölött-mező elrendezés (lásd app/src/CLAUDE.md: címke az input
// FÖLÖTT, soha placeholder címke helyett). Eredetileg a PriceListAdminPage.tsx
// helyi helpere volt; az Árlista admin sor-szerkesztője és az Új tétel dialógus
// (pages/priceListAdmin/UjTetelDialog.tsx) is használja -- innen a saját fájl,
// hogy egyik se importáljon a másikból (körkörös import, lásd HuChip.tsx ugyanezen
// mintája).

import { Box, Text } from '@radix-ui/themes';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <Text as="div" size="1" color="gray" mb="1">
        {label}
      </Text>
      {children}
    </label>
  );
}

/**
 * `Field` <label>-alternatívája gombokhoz -- egy <label> ami egy <button>-t
 * fog körbe implicit módon "asszociálná" a gombbal, és az accessible name
 * számításnál a LABEL szövege nyerne a gomb saját szövege felett (ezt egy
 * teszt buktatta le: `getByRole('button', {name: '...'})` a label szövegét
 * találta, nem a gomb feliratát). Vizuálisan azonos a `Field`-del, csak
 * `<div>`-et használ `<label>` helyett.
 */
export function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Text as="div" size="1" color="gray" mb="1">
        {label}
      </Text>
      {children}
    </Box>
  );
}

/**
 * Olvasó-módú (nem szerkeszthető) label + érték pár, `FieldGroup`-ra épülve
 * (nem `Field`-re -- statikus szöveg `<label>`-be téve elrontaná az
 * accessible name számítást, lásd fent). Üres érték `—`-t mutat, az app
 * meglévő hiányzó-érték konvenciója szerint (`PatientPlanChains.tsx`,
 * `pdf/TervDocument.tsx`).
 */
export function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <FieldGroup label={label}>
      <Text as="div" size="2" color={value ? undefined : 'gray'}>
        {value || '—'}
      </Text>
    </FieldGroup>
  );
}
