// Páciensek -- backlog-28. tétel: a `terv.json` `paciens` blokkja
// tervenkénti pillanatkép (D7), itt viszont a doki a páciens JELENLEG
// érvényes, terv-mentéstől független adatait tartja (paciens-adatok.json,
// D33). Funkcionálisan külön a Korábbi tervektől: az a kezelési előzmény/
// verziók képernyője, ez a törzsadaté -- a kettő kölcsönösen linkel
// egymásra ugyanahhoz a pácienshez.
//
// A 38. tétel (D43) óta ez tiszta NAVIGÁCIÓS lista: a sorok a páciens-
// részletoldalra (`PatientDetailPage.tsx`) navigálnak, a törzsadat-
// szerkesztő (`PatientEditorPanel`) itt nem jelenik meg -- az egyetlen
// helye a részletoldal `Páciens adatai` tabja.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Callout, Flex, Heading, Separator, Skeleton, Text, TextField } from '@radix-ui/themes';
import { CrossCircledIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import PatientListRow from '../components/PatientListRow';
import { useListStateMemory } from '../components/useListStateMemory';
import { t } from '../design/tokens';
import { keresoKulcs, torzsadatEgyezik } from '../domain/paciensKereses';
import { loadTorzsadatok, type BetoltottTorzsadat } from '../domain/torzsadatBetoltes';
import UjPaciensDialog from './paciensek/UjPaciensDialog';
import { useStorage } from '../storage/StorageContext';

export default function PaciensekPage() {
  const { storage } = useStorage();
  const navigate = useNavigate();

  const [items, setItems] = useState<BetoltottTorzsadat[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const { q, setQ } = useListStateMemory('paciensek', !loading);

  const [newOpen, setNewOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setListError(null);
      try {
        const list = await storage.listPatients();
        if (cancelled) return;
        // loadTorzsadatok (P1-2 mintája) sosem dob -- egy sérült
        // paciens-adatok.json a sor `hiba` mezőjében jelenik meg, nem
        // bénítja meg a teljes listát.
        const byDir = await loadTorzsadatok(storage, list);
        if (cancelled) return;
        setItems(list.map((p) => byDir[p.dirName]));
      } catch (err) {
        if (!cancelled) {
          setListError(
            err instanceof Error ? err.message : 'A páciensek listázása váratlanul meghiúsult.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storage]);

  const kulcs = keresoKulcs(q);
  const filtered = items
    .filter((item) => !kulcs || torzsadatEgyezik(item.torzsadat, kulcs))
    .sort((a, b) => a.torzsadat.nev.localeCompare(b.torzsadat.nev, 'hu'));

  async function handleCreatePatient(
    nev: string,
    kezdoAdatok: { szuletesiIdo: string; telefon: string },
  ) {
    setCreateError(null);
    try {
      const folder = await storage.createPatient(nev, kezdoAdatok);
      setNewOpen(false);
      // Frissen létrehozott páciens -- szerkesztés módban nyílik, mert a
      // doki valószínűleg tovább akarja tölteni a többi mezőt (D45). A
      // meglévő páciens kiválasztásának ága (`onUseExisting` lent)
      // szándékosan nézet módban marad.
      navigate(`/paciensek/${encodeURIComponent(folder.dirName)}`, {
        state: { tab: 'adatai', mod: 'szerkesztes' },
      });
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Az új páciens felvitele váratlanul meghiúsult.',
      );
    }
  }

  return (
    <Box style={{ maxWidth: 760, margin: '0 auto' }}>
      <Flex justify="between" align="baseline" mb="4">
        <Heading size="5" style={{ color: t.brand }}>
          Páciensek
        </Heading>
        <Button
          onClick={() => {
            setCreateError(null);
            setNewOpen(true);
          }}
        >
          + Új páciens
        </Button>
      </Flex>

      <Text as="p" size="1" color="gray" mt="0" mb="4">
        A terv-mentéstől független, élő adatok — a kezelési előzményekért lásd a Korábbi terveket.
      </Text>

      <TextField.Root
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Keresés névre, születési dátumra vagy telefonra…"
        aria-label="Keresés névre, születési dátumra vagy telefonra"
        mb="4"
      />

      {listError && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>A lista betöltése nem sikerült: {listError}</Callout.Text>
        </Callout.Root>
      )}

      {loading && <PatientsSkeleton />}

      {!loading && !listError && filtered.length === 0 && (
        <Callout.Root color="gray" mb="4">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            {items.length === 0
              ? 'Még nincs felvitt páciens. Indíts egy tervet a Kezdőlapon, vagy vidd fel az elsőt a „+ Új páciens” gombbal.'
              : `Nincs találat erre: „${q}”. Próbálj más névre, születési dátumra vagy telefonra keresni.`}
          </Callout.Text>
        </Callout.Root>
      )}

      {filtered.map((item, i) => (
        <Box key={item.patient.dirName} mb="3" data-patient={item.patient.dirName}>
          <PatientListRow item={item} />
          {i < filtered.length - 1 && <Separator size="4" mt="3" color="gray" />}
        </Box>
      ))}

      <UjPaciensDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        patients={items.map((item) => item.patient)}
        onSave={(nev, kezdoAdatok) => void handleCreatePatient(nev, kezdoAdatok)}
        onUseExisting={(p) => {
          setNewOpen(false);
          navigate(`/paciensek/${encodeURIComponent(p.dirName)}`, { state: { tab: 'adatai' } });
        }}
        submitError={createError}
      />
    </Box>
  );
}

/** docs/07-felulet-rendszer.md: skeleton a végleges elrendezés alakjában, ne pörgő spinner. */
function PatientsSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Box key={i} py="2">
          <Skeleton>
            <Box height="18px" width="220px" />
          </Skeleton>
          <Box mt="1">
            <Skeleton>
              <Box height="14px" width="150px" />
            </Skeleton>
          </Box>
        </Box>
      ))}
    </>
  );
}
