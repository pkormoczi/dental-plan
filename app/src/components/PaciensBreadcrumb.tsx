// A `TervWorkflowShell.tsx` breadcrumb-navigációja, kiemelve, hogy a
// `PaciensKotesProvider`-en BELÜL renderelődjön (94. tétel). A link célja
// (`href`) változatlanul a piszkozathoz kötött `patientDir` -- a FELIRAT
// viszont, ha van feloldott kötés, a kötött páciensmappa TÁROLT neve
// (`PatientFolder.nev`), nem a szabadon szerkeszthető Név mező: enélkül a
// link célja és felirata a Név mező átírásakor szétcsúszna (a doki más
// névre menti a tervet, mint amit a breadcrumb mutat). Kötés nélkül a mai
// viselkedés marad: a Név mező szövege, link nélkül.

import { Link } from 'react-router-dom';
import { Text } from '@radix-ui/themes';
import { usePaciensKotes } from './PaciensKotesContext';
import { t } from '../design/tokens';
import { useAppState } from '../state/AppState';

export default function PaciensBreadcrumb() {
  const { plan, piszkozatPatientDir } = useAppState();
  const { kotott } = usePaciensKotes();
  const cimke = (kotott?.nev ?? plan.paciens.nev).trim() || 'Új páciens';

  return (
    <nav
      aria-label="Hol vagyok"
      style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}
    >
      <Link to="/paciensek" style={{ fontSize: 13, color: t.uiTextMuted, textDecoration: 'none' }}>
        Páciensek
      </Link>
      <Text size="1" color="gray" aria-hidden="true">
        ›
      </Text>
      {/* A piszkozat patientDir-je best-effort ismert (lásd
          state/AppState.tsx) -- ha van, a páciens-szegmens a
          részletoldalára linkel; ha nem (pl. "+ Új páciens" ág,
          vagy egy funkció előtti perzisztált draft), sima szöveg marad. */}
      {piszkozatPatientDir ? (
        <Link
          to={`/paciensek/${encodeURIComponent(piszkozatPatientDir)}`}
          style={{ fontSize: 14, fontWeight: 500, color: t.text, textDecoration: 'none' }}
        >
          {cimke}
        </Link>
      ) : (
        <Text size="2" weight="medium">
          {cimke}
        </Text>
      )}
    </nav>
  );
}
