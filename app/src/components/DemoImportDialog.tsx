// Az import megerősítő ablaka: írás előtt a doki látja, mi kerül át. Használt mappánál kimondja,
// hogy a mostani árlista és beállítások elvesznek -- a vissza út a biztonsági mentés.

import { AlertDialog, Box, Button, Callout, Flex, Text } from '@radix-ui/themes';
import { formatLongDate, localIsoDate } from '../domain/date';
import type { ImportOsszegzes } from '../storage/taroloIpc';
import type { DemoImport } from './useDemoImport';

export const DEMO_IMPORT_GOMB = 'Van egy exportált fájlom a demóból';

function OsszegzesLista({ o }: { o: ImportOsszegzes }) {
  const sorok = [
    o.keszult && `Az export készült: ${formatLongDate(localIsoDate(new Date(o.keszult)), 'hu')}`,
    `Árlista: ${o.tetelSzam} tétel, árlista-verzió: ${o.arlistaVerzio || 'nincs megadva'}` +
      (o.mod === 'csere' ? ` (a mostani: ${o.jelenlegiArlistaVerzio ?? 'nem olvasható'})` : ''),
    `Rendelő: ${o.rendeloNev || 'nincs megadva'}`,
    `Nyomtatvány-szövegek: ${o.sablonSzam} az exportból, ${o.potoltSablonSzam} a beépítettből`,
  ].filter((s): s is string => Boolean(s));
  return (
    <Box asChild my="3">
      <ul style={{ paddingLeft: 20, margin: 0 }}>
        {sorok.map((s) => (
          <li key={s}>
            <Text size="2">{s}</Text>
          </li>
        ))}
      </ul>
    </Box>
  );
}

export default function DemoImportDialog({ imp }: { imp: DemoImport }) {
  const o = imp.osszegzes;
  return (
    <AlertDialog.Root open={o != null} onOpenChange={(open) => !open && !imp.folyamatban && !imp.kesz && imp.megse()}>
      <AlertDialog.Content maxWidth="540px">
        {imp.kesz ? (
          <>
            <AlertDialog.Title>Az import kész.</AlertDialog.Title>
            <AlertDialog.Description size="2">
              Az árlista, a beállítások és a nyomtatvány-szövegek mostantól az exportból valók. Az
              alkalmazás a Kezdőlapra tölt újra.
            </AlertDialog.Description>
            <Flex justify="end" mt="4">
              <Button onClick={imp.rendben}>Rendben</Button>
            </Flex>
          </>
        ) : (
          o && (
            <>
              <AlertDialog.Title>Átvitel a demóból</AlertDialog.Title>
              <AlertDialog.Description size="2">
                {o.mod === 'uj'
                  ? 'Ebből az exportból épül fel az új adatmappa. Páciensadat nincs az exportban.'
                  : 'Ezt az exportot veszi át az adatmappa. Páciensadat nincs az exportban.'}
              </AlertDialog.Description>
              <OsszegzesLista o={o} />
              {o.mod === 'csere' && (
                <Callout.Root color="amber" mb="3">
                  <Callout.Text>
                    A mostani árlista és beállítások helyére az exportban lévők kerülnek, a mostaniak
                    elvesznek; az exportban szereplő nyomtatvány-szövegek is felülíródnak. A páciensek és
                    a tervek nem változnak. Ha a mostani árlistára még szükséged lehet, előbb készíts
                    biztonsági mentést.
                  </Callout.Text>
                </Callout.Root>
              )}
              {imp.hiba && (
                <Callout.Root color="red" mb="3" role="alert">
                  <Callout.Text>{imp.hiba}</Callout.Text>
                </Callout.Root>
              )}
              <Flex gap="3" justify="end" wrap="wrap">
                <AlertDialog.Cancel>
                  <Button variant="soft" color="gray" disabled={imp.folyamatban}>
                    Mégse
                  </Button>
                </AlertDialog.Cancel>
                <Button
                  color={o.mod === 'csere' ? 'red' : undefined}
                  disabled={imp.folyamatban}
                  onClick={() => void imp.megerosit()}
                >
                  {o.mod === 'uj' ? 'Adatmappa létrehozása az exportból' : 'Felülírás az exportból'}
                </Button>
              </Flex>
            </>
          )
        )}
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
