// Pácienslista oszlopos sora (D47, docs/03-funkcionalis-spec.md § 9.
// Páciensek) -- a Kezdőlap "Legutóbbi páciensek" kompakt sorától (D43,
// `components/PatientListRow.tsx`) SZÁNDÉKOSAN külön komponens: eltérő az
// elrendezésük (Radix `Table` vs. futó szöveges `Flex`), az egyesítés
// megkötné a Kezdőlap `children` (aktivitás-szöveg) rétegét.

import { Table, Text } from '@radix-ui/themes';
import { Link, useNavigate } from 'react-router-dom';
import { t } from '../../design/tokens';
import { formatShortDate } from '../../domain/date';
import type { BetoltottTorzsadat } from '../../domain/torzsadatBetoltes';

export default function PatientTableRow({ item }: { item: BetoltottTorzsadat }) {
  const navigate = useNavigate();
  const { patient, torzsadat, hiba } = item;
  const dob = torzsadat.szuletesiIdo ? formatShortDate(torzsadat.szuletesiIdo, 'hu') : null;
  const href = `/paciensek/${encodeURIComponent(patient.dirName)}`;

  return (
    <Table.Row
      data-patient={patient.dirName}
      style={{ cursor: 'pointer' }}
      // A névcella saját <a>-ja natívan navigál (középső gomb/"megnyitás
      // új lapon" is működik rajta) -- ha a sor onClick-je is lefutna
      // ugyanarra a kattintásra, két history-bejegyzés jönne létre, és
      // böngésző-"vissza" két lépésben térne csak vissza a listára. A
      // closest('a') ezért kizárja az anchor-eredetű kattintást; egérrel
      // a sor bármely más pontjára kattintva a `navigate()` viszi tovább.
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a')) return;
        navigate(href);
      }}
    >
      <Table.RowHeaderCell
        style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {/* Szándékosan location.state nélkül: a PatientDetailPage
            alapértelmezett tabja 'tervek' (D35). */}
        <Link to={href} style={{ color: 'inherit', textDecoration: 'none' }}>
          <Text size="2" weight="medium">
            {torzsadat.nev}
          </Text>
        </Link>
      </Table.RowHeaderCell>

      {hiba ? (
        <Table.Cell colSpan={2}>
          <Text size="2" style={{ color: t.warn }}>
            ⚠ adat nem olvasható
          </Text>
        </Table.Cell>
      ) : (
        <>
          <Table.Cell>
            <Text size="2" color="gray">
              {dob ?? '—'}
            </Text>
          </Table.Cell>
          <Table.Cell>
            <Text size="2" color="gray">
              {torzsadat.telefon || '—'}
            </Text>
          </Table.Cell>
        </>
      )}
    </Table.Row>
  );
}
