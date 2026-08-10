// Címke-fölött-mező elrendezés (docs/07-felulet-rendszer.md: "Címke az input
// FÖLÖTT. Soha placeholder címke helyett."). Eredetileg a PriceListAdminPage.tsx
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
