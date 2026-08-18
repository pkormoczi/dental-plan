// Terv-workflow héj -- backlog-31 (Terv workflow shell), redesign DP-003,
// D36. A `/paciens`/`/terv`/`/elonezet` közös layout-route-ja (az app első
// nested route-mintája, react-router `Outlet`): állandó, kattintható
// breadcrumb (`Páciensek > [páciens neve]`) + szabadon kattintható,
// route-vezérelt 3-lépéses stepper (`Terv adatai -> Kezelések -> Előnézet
// és véglegesítés`, D38 feliratai). A meglévő, laponkénti "Tovább" gombok
// (PatientPage.tsx, PlanEditorPage.tsx) ettől függetlenül, változatlanul
// megmaradnak -- a stepper a szabad ugrálást adja hozzá, nem irányított
// útvonalat vált ki.

import { Link, Outlet, useLocation } from 'react-router-dom';
import { Badge, Box, Separator, Text } from '@radix-ui/themes';
import { t } from '../design/tokens';
import { useAppState } from '../state/AppState';

const LEPESEK: ReadonlyArray<{ to: string; label: string }> = [
  { to: '/paciens', label: 'Terv adatai' },
  { to: '/terv', label: 'Kezelések' },
  { to: '/elonezet', label: 'Előnézet és véglegesítés' },
];

export default function TervWorkflowShell() {
  const { plan } = useAppState();
  const { pathname } = useLocation();
  // A draftra kötött stabil patientDir/paciensId (DP-004) hiányában a
  // páciens-szegmens ma NEM link -- lásd backlog-31 döntés #3: a
  // `buildPatientDirName(plan.paciens.nev, ...)`-ból találgatott link nem
  // garantáltan a valódi forrásmappára mutatna (pl. kézzel átírt név).
  const paciensNev = plan.paciens.nev.trim() || 'Új páciens';

  return (
    <Box style={{ maxWidth: 900, margin: '0 auto' }}>
      <nav
        aria-label="Hol vagyok"
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}
      >
        <Link
          to="/paciensek"
          style={{ fontSize: 13, color: t.uiTextMuted, textDecoration: 'none' }}
        >
          Páciensek
        </Link>
        <Text size="1" color="gray" aria-hidden="true">
          ›
        </Text>
        <Text size="2" weight="medium">
          {paciensNev}
        </Text>
      </nav>

      <nav
        aria-label="Terv munkafolyamat"
        style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}
      >
        {LEPESEK.map((lepes, i) => {
          const aktiv = pathname === lepes.to;
          return (
            <span key={lepes.to} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && (
                <span
                  aria-hidden="true"
                  style={{ width: 20, height: 1, background: t.uiLineStrong, margin: '0 8px' }}
                />
              )}
              <Link
                to={lepes.to}
                aria-current={aktiv ? 'step' : undefined}
                // A sorszám-Badge tisztán vizuális -- `aria-label` nélkül a
                // Badge szöveges tartalma ("1") belefolyna a link accessible
                // name-jébe ("1Terv adatai"), és ütközne a NavBar "Kezelések
                // és árak" linkjével is (mindkettő tartalmazná a
                // "Kezelések" szót).
                aria-label={lepes.label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: t.radius,
                  textDecoration: 'none',
                  background: aktiv ? t.accentWash : 'transparent',
                }}
              >
                <Badge radius="full" size="1" variant="soft" color={aktiv ? 'brown' : 'gray'} aria-hidden="true">
                  {i + 1}
                </Badge>
                <Text size="2" weight={aktiv ? 'bold' : 'regular'} style={{ color: aktiv ? t.brand : t.uiTextMuted }}>
                  {lepes.label}
                </Text>
              </Link>
            </span>
          );
        })}
      </nav>

      <Separator size="4" mb="4" />

      <Outlet />
    </Box>
  );
}
