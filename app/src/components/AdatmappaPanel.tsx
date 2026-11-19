// Az adatmappa-választás egy képernyője állapotonként: első indításkor a varázsló, induláskor a
// blokkoló képernyő, a Beállításokban a mappaváltás eredménye. Automatikus újrapróba nincs: a
// Drive állapotát az app nem látja, a doki dönti el, mikor próbálja újra (migrációs terv §6.4).

import { useState, type ReactNode } from 'react';
import { AlertDialog, Box, Button, Callout, Code, Flex, Heading, Text } from '@radix-ui/themes';
import { t } from '../design/tokens';
import { IoError } from '../storage/taroloHibak';
import { hianyzoElemNeve } from './adatmappaSzovegek';
import DemoImportDialog, { DEMO_IMPORT_GOMB } from './DemoImportDialog';
import type { AdatmappaValasztas } from './useAdatmappaValasztas';

const HOSSZU_UTVONAL_SZOVEG =
  'A mappa útvonala hosszú: Windowson a mélyebb almappák a 260 karakteres korlát fölé kerülhetnek. Ha teheted, válassz rövidebb útvonalú mappát.';

function Lista({ children }: { children: ReactNode }) {
  return (
    <Box asChild mb="3">
      <ul style={{ paddingLeft: 20, margin: 0 }}>{children}</ul>
    </Box>
  );
}

export default function AdatmappaPanel({
  valasztas,
  onMegse,
}: {
  valasztas: AdatmappaValasztas;
  /** A Beállításokból indított váltásnál: vissza a jelenlegi mappához. */
  onMegse?: () => void;
}) {
  const { mutatott, folyamatban, hiba, demoImport: imp } = valasztas;
  const [potlasKerdes, setPotlasKerdes] = useState(false);
  const v = mutatott?.v ?? null;
  const beallitott = mutatott?.forras === 'beallitott';
  const vizsgalt = v && v.allapot !== 'nincs' ? v : null;

  const masikMappa = (
    <Button
      variant={vizsgalt?.allapot === 'ures' && !beallitott ? 'soft' : 'solid'}
      disabled={folyamatban}
      onClick={() => void valasztas.valassz()}
    >
      {vizsgalt ? 'Másik mappa kiválasztása' : 'Adatmappa kiválasztása…'}
    </Button>
  );
  const ujraproba = (
    <Button variant="soft" disabled={folyamatban} onClick={() => void valasztas.ujra()}>
      Újrapróba
    </Button>
  );
  const megse = onMegse && (
    <Button variant="soft" color="gray" disabled={folyamatban} onClick={onMegse}>
      Mégsem
    </Button>
  );

  let cim: string;
  let tartalom: ReactNode;
  let gombok: ReactNode;
  if (!vizsgalt) {
    cim = 'Válaszd ki az adatmappát';
    tartalom = (
      <>
        <Text as="p" size="2" mb="3">
          Az alkalmazás minden adatot — az árlistát, a beállításokat, a nyomtatvány-szövegeket és a
          páciensek terveit — egy általad kiválasztott mappába ír. Ezt a mappát a Google Drive viszi
          át a másik gépedre.
        </Text>
        <Lista>
          <li>
            <Text size="2">
              A mappa a Google Drive <strong>„Saját meghajtó”</strong> (My Drive) részén legyen,{' '}
              <strong>„Fájlok tükrözése”</strong> módban szinkronizálva — ne megosztott meghajtón
              (Shared Drive).
            </Text>
          </li>
          <li>
            <Text size="2">Ne a Letöltések mappát válaszd: az a OneDrive-ra is szinkronizálhat.</Text>
          </li>
          <li>
            <Text size="2">
              Az első gépen egy új, üres mappát válassz; a második gépen ugyanazt a mappát, miután a
              Drive letöltötte.
            </Text>
          </li>
        </Lista>
      </>
    );
    gombok = (
      <>
        {megse}
        {masikMappa}
      </>
    );
  } else if (vizsgalt.allapot === 'ures' && !beallitott) {
    cim = 'Új adatmappa létrehozása';
    tartalom = (
      <>
        <Text as="p" size="2" mb="3">
          Ez a mappa üres: új adatmappát hozok létre benne, alapértelmezett árlistával,
          beállításokkal és nyomtatvány-szövegekkel.
        </Text>
        <Text as="p" size="2" mb="3">
          Ha a demóban már beállítottad az árlistát, a rendelő adatait és a nyomtatvány-szövegeket,
          a demóból exportált fájlból is felépítheted. Páciensadat nincs az exportban.
        </Text>
        <Callout.Root color="amber" mb="3">
          <Callout.Text>
            Ha a másik gépeden már van adatmappa, ne ezt válaszd: várd meg, míg a Drive letölti, és
            azt a mappát válaszd.
          </Callout.Text>
        </Callout.Root>
      </>
    );
    gombok = (
      <>
        {megse}
        {masikMappa}
        <Button variant="soft" disabled={folyamatban || imp.folyamatban} onClick={() => void imp.indit()}>
          {DEMO_IMPORT_GOMB}
        </Button>
        <Button disabled={folyamatban || imp.folyamatban} onClick={() => void valasztas.letrehoz()}>
          Új adatmappa létrehozása
        </Button>
      </>
    );
  } else if (vizsgalt.allapot === 'ures') {
    cim = 'Az adatmappa üres';
    tartalom = (
      <Text as="p" size="2" mb="3">
        A beállított adatmappa üres. Lehet, hogy a Google Drive még nem töltötte le: várd meg, majd
        próbáld újra.
      </Text>
    );
    gombok = (
      <>
        {masikMappa}
        {ujraproba}
      </>
    );
  } else if (vizsgalt.allapot === 'hianyos') {
    cim = 'Az adatmappa hiányos';
    tartalom = (
      <>
        <Text as="p" size="2" mb="2">
          A mappából hiányzik:
        </Text>
        <Lista>
          {vizsgalt.hianyzik.map((nev) => (
            <li key={nev}>
              <Text size="2">{hianyzoElemNeve(nev)}</Text>
            </li>
          ))}
        </Lista>
        <Text as="p" size="2" mb="3">
          Lehet, hogy a Google Drive még szinkronizál: várd meg, majd próbáld újra.
        </Text>
      </>
    );
    gombok = (
      <>
        {megse}
        <Button variant="soft" color="gray" disabled={folyamatban} onClick={() => setPotlasKerdes(true)}>
          Hiányzó alapfájlok létrehozása
        </Button>
        {masikMappa}
        {ujraproba}
      </>
    );
  } else if (vizsgalt.allapot === 'idegen') {
    cim = beallitott ? 'A beállított mappa nem az adatmappa' : 'Ez a mappa nem használható';
    tartalom = (
      <Text as="p" size="2" mb="3">
        A mappa nem üres, és nem a Mándoki Dental adatmappája. Válassz egy üres mappát, vagy a
        meglévő adatmappát.
      </Text>
    );
    gombok = (
      <>
        {megse}
        {masikMappa}
        {beallitott && ujraproba}
      </>
    );
  } else if (vizsgalt.allapot === 'elerhetetlen') {
    cim = 'Az adatmappa nem érhető el';
    tartalom = (
      <Text as="p" size="2" mb="3">
        {new IoError(vizsgalt.errno ?? 'EGYEB', vizsgalt.ut).message}
      </Text>
    );
    gombok = (
      <>
        {megse}
        {masikMappa}
        {ujraproba}
      </>
    );
  } else {
    // A miénk: a választás azonnal átvált, ide csak egy visszautasított váltás után jut.
    cim = 'Adatmappa';
    tartalom = null;
    gombok = (
      <>
        {megse}
        {masikMappa}
      </>
    );
  }

  return (
    <Box>
      <Heading as="h1" size="5" mb="3" style={{ color: t.brand }}>
        {cim}
      </Heading>
      {vizsgalt && (
        <Text as="p" size="2" mb="3" style={{ wordBreak: 'break-all' }}>
          <Code variant="ghost">{vizsgalt.ut}</Code>
        </Text>
      )}
      {tartalom}
      {vizsgalt?.hosszuUtvonal && (
        <Callout.Root color="amber" mb="3">
          <Callout.Text>{HOSSZU_UTVONAL_SZOVEG}</Callout.Text>
        </Callout.Root>
      )}
      {hiba && (
        <Callout.Root color="red" mb="3" role="alert">
          <Callout.Text>{hiba}</Callout.Text>
        </Callout.Root>
      )}
      {imp.hiba && !imp.osszegzes && (
        <Callout.Root color="red" mb="3" role="alert">
          <Callout.Text>{imp.hiba}</Callout.Text>
        </Callout.Root>
      )}
      <Flex gap="3" justify="end" wrap="wrap">
        {gombok}
      </Flex>

      <DemoImportDialog imp={imp} />

      <AlertDialog.Root open={potlasKerdes} onOpenChange={setPotlasKerdes}>
        <AlertDialog.Content maxWidth="480px">
          <AlertDialog.Title>Hiányzó alapfájlok létrehozása</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Csak akkor folytasd, ha a Google Drive már végzett, és biztos vagy benne, hogy ezek a
            fájlok tényleg hiányoznak. A hiányzók helyére az alapértelmezett árlista, beállítások és
            nyomtatvány-szövegek kerülnek; a meglévő fájlokhoz az alkalmazás nem nyúl.
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Mégse
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button onClick={() => void valasztas.potol()}>Létrehozás</Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}
