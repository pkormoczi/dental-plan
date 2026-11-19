// Adattárolás fül, csak a telepített appban (migrációs terv §6.3): az aktuális adatmappa, a
// mappaváltás, a gépváltási szabály, a hiányzó alapsablonok explicit pótlása és a napló. Nincs
// mentendő draftja, ezért a lap dirty-guardját nem érinti.

import { useMemo, useState } from 'react';
import { Box, Button, Callout, Code, Flex, Text } from '@radix-ui/themes';
import { GEPVALTAS_BEVEZETO, GEPVALTASI_SZABALY } from '../../components/adatmappaSzovegek';
import DemoImportDialog, { DEMO_IMPORT_GOMB } from '../../components/DemoImportDialog';
import { LetoltesJelzo } from '../../components/LetoltesJelzo';
import Section from '../../components/Section';
import { useBiztonsagiMentes } from '../../components/useBiztonsagiMentes';
import { useDemoImport } from '../../components/useDemoImport';
import { useMappaValtas } from '../../components/useMappaValtas';
import { formatLongDate, localIsoDate } from '../../domain/date';
import { useAppState } from '../../state/AppState';
import { useStorage, type Adattarolas, type BiztonsagiMentes } from '../../storage/StorageContext';

const hibaSzoveg = (err: unknown) => (err instanceof Error ? err.message : String(err));

export default function AdattarolasTab({ adattarolas }: { adattarolas: Adattarolas }) {
  const { naploMegmutat, drafts, biztonsagiMentes } = useStorage();
  const { vanMentetlenPiszkozat, resetPlanDraft } = useAppState();
  const [hiba, setHiba] = useState<string | null>(null);
  const [sablonEredmeny, setSablonEredmeny] = useState<string | null>(null);
  const [sablonFolyamatban, setSablonFolyamatban] = useState(false);
  const felkesz = useMemo(
    () => ({
      van: async () => vanMentetlenPiszkozat,
      elvet: async () => {
        resetPlanDraft();
        await drafts.clear();
      },
    }),
    [vanMentetlenPiszkozat, resetPlanDraft, drafts],
  );
  const { valasztas, dialogusok } = useMappaValtas(adattarolas, felkesz);
  const aktualis = adattarolas.allapot.allapot === 'nincs' ? null : adattarolas.allapot;

  const muvelet = async (fn: () => Promise<void>) => {
    setHiba(null);
    try {
      await fn();
    } catch (err) {
      setHiba(hibaSzoveg(err));
    }
  };

  async function sablonokatPotol() {
    setSablonFolyamatban(true);
    setSablonEredmeny(null);
    setHiba(null);
    try {
      const irt = await adattarolas.alapsablonokatPotol();
      setSablonEredmeny(irt.length ? `Pótolva: ${irt.join(', ')}.` : 'Minden alapsablon megvan, nem kellett pótolni.');
    } catch (err) {
      setHiba(hibaSzoveg(err));
    } finally {
      setSablonFolyamatban(false);
    }
  }

  return (
    <Box style={{ maxWidth: 760 }}>
      {hiba && (
        <Callout.Root color="red" mb="4" role="alert">
          <Callout.Text>{hiba}</Callout.Text>
        </Callout.Root>
      )}

      <Section title="Adatmappa">
        <Text as="p" size="2" mb="3" style={{ wordBreak: 'break-all' }}>
          <Code variant="ghost">{aktualis?.ut}</Code>
        </Text>
        {aktualis?.hosszuUtvonal && (
          <Callout.Root color="amber" mb="3">
            <Callout.Text>
              A mappa útvonala hosszú: Windowson a mélyebb almappák a 260 karakteres korlát fölé
              kerülhetnek.
            </Callout.Text>
          </Callout.Root>
        )}
        <Flex gap="3" wrap="wrap">
          <Button variant="soft" onClick={() => void muvelet(adattarolas.megnyit)}>
            Mappa megnyitása
          </Button>
          <Button variant="soft" disabled={valasztas.folyamatban} onClick={() => void valasztas.valassz()}>
            Mappa váltása…
          </Button>
        </Flex>
        {valasztas.hiba && !valasztas.mutatott && (
          <Callout.Root color="red" mt="3" role="alert">
            <Callout.Text>{valasztas.hiba}</Callout.Text>
          </Callout.Root>
        )}
      </Section>

      {biztonsagiMentes && <MentesSzekcio mentes={biztonsagiMentes} />}

      <ImportSzekcio adattarolas={adattarolas} />

      <Section title="Gépváltás">
        <Text as="p" size="2" mb="2">
          {GEPVALTAS_BEVEZETO} Gépváltáskor:
        </Text>
        <Box asChild>
          <ol style={{ paddingLeft: 20, margin: 0 }}>
            {GEPVALTASI_SZABALY.map((lepes) => (
              <li key={lepes}>
                <Text size="2">{lepes}</Text>
              </li>
            ))}
          </ol>
        </Box>
      </Section>

      <Section title="Hiányzó alapsablonok">
        <Text as="p" size="2" mb="3">
          Ha egy nyomtatvány-szöveg (nyilatkozat, fizetési feltételek, garancia) egyik változata sincs
          meg az adatmappában, ez a beépített alapszöveget írja a helyére. A meglévő szövegekhez nem
          nyúl.
        </Text>
        <Flex gap="3" align="center" wrap="wrap">
          <Button variant="soft" disabled={sablonFolyamatban} onClick={() => void sablonokatPotol()}>
            Hiányzó alapsablonok pótlása
          </Button>
          {sablonEredmeny && (
            <Text size="2" role="status">
              {sablonEredmeny}
            </Text>
          )}
        </Flex>
      </Section>

      {naploMegmutat && (
        <Section title="Napló">
          <Text as="p" size="2" mb="3">
            A napló a fájlrendszeri hibákat és a két gép közti ütközéseket jegyzi, páciens- és tervnév
            nélkül. Csak ezen a gépen van, sehová nem továbbítódik.
          </Text>
          <Button variant="soft" onClick={() => void muvelet(naploMegmutat)}>
            Napló megnyitása
          </Button>
        </Section>
      )}

      {dialogusok}
    </Box>
  );
}

function MentesSzekcio({ mentes }: { mentes: BiztonsagiMentes }) {
  const { allapot, folyamatban, hiba, mentettNev, ment } = useBiztonsagiMentes(mentes);
  return (
    <Section title="Biztonsági mentés">
      <Text as="p" size="2" mb="3">
        A teljes adatmappáról egyetlen ZIP-fájl készül. A Google Drive nem biztonsági mentés: havonta
        készíts egyet. Visszaállításkor a ZIP-et egy üres mappába kell kibontani, majd azt a mappát
        kiválasztani.
      </Text>
      <Callout.Root color="amber" mb="3">
        <Callout.Text>
          A mentésben páciensadat van: csak titkosított külső lemezre tedd (Windowson BitLocker To Go,
          Macen titkosított lemez).
        </Callout.Text>
      </Callout.Root>
      {allapot && (
        <Text as="p" size="2" mb="3">
          {allapot.utolso
            ? `Utolsó mentés: ${formatLongDate(localIsoDate(new Date(allapot.utolso)), 'hu')} (${allapot.ezenAGepen ? 'ezen a gépen' : 'a másik gépen'})`
            : 'Még nem készült biztonsági mentés.'}
        </Text>
      )}
      <Button variant="soft" disabled={folyamatban} onClick={() => void ment()}>
        {folyamatban ? 'Mentés folyamatban…' : 'Biztonsági mentés ZIP-be'}
      </Button>
      <LetoltesJelzo fajlnev={mentettNev} felirat="Elmentve" />
      {hiba && (
        <Callout.Root color="red" mt="3" role="alert">
          <Callout.Text>{hiba}</Callout.Text>
        </Callout.Root>
      )}
    </Section>
  );
}

/** Felülírja a használt mappát, de félkész-terv kérdés nélkül: a mappa nem változik, a piszkozat sorai pillanatképek. */
function ImportSzekcio({ adattarolas }: { adattarolas: Adattarolas }) {
  const imp = useDemoImport(adattarolas, 'csere');
  return (
    <Section title="Átvitel a demóból">
      <Text as="p" size="2" mb="3">
        A demó Beállítások oldalán, az Adatkezelés fülön exportált fájlból az árlista, a rendelő adatai és a
        nyomtatvány-szövegek átvehetők. A mostani árlista és beállítások helyükre kerülnek; a páciensek
        és a tervek nem változnak.
      </Text>
      <Button variant="soft" disabled={imp.folyamatban} onClick={() => void imp.indit()}>
        {DEMO_IMPORT_GOMB}
      </Button>
      {imp.hiba && !imp.osszegzes && (
        <Callout.Root color="red" mt="3" role="alert">
          <Callout.Text>{imp.hiba}</Callout.Text>
        </Callout.Root>
      )}
      <DemoImportDialog imp={imp} />
    </Section>
  );
}
