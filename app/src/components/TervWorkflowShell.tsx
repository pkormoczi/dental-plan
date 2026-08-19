// Terv-workflow héj -- backlog-31 (Terv workflow shell), redesign DP-003,
// D36. A `/paciens`/`/terv`/`/elonezet` közös layout-route-ja (az app első
// nested route-mintája, react-router `Outlet`): állandó, kattintható
// breadcrumb (`Páciensek > [páciens neve]`) + szabadon kattintható,
// route-vezérelt 3-lépéses stepper (`Terv adatai -> Kezelések -> Előnézet
// és véglegesítés`, D38 feliratai). A meglévő, laponkénti "Tovább" gombok
// (PatientPage.tsx, PlanEditorPage.tsx) ettől függetlenül, változatlanul
// megmaradnak -- a stepper a szabad ugrálást adja hozzá, nem irányított
// útvonalat vált ki.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Badge, Box, Separator, Text } from '@radix-ui/themes';
import { LepesGuardProvider, type LepesHandler } from './LepesGuardContext';
import { t } from '../design/tokens';
import { WORKFLOW_LEPESEK } from '../domain/workflowLepesek';
import { useAppState } from '../state/AppState';
import type { WorkflowRoute } from '../storage/DraftStorage';

export default function TervWorkflowShell() {
  const { plan, piszkozatPatientDir, jelezWorkflowLepes } = useAppState();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const paciensNev = plan.paciens.nev.trim() || 'Új páciens';

  // D37: a piszkozat "utolsó workflow-lépése" -- a héj tudja MA IS, melyik
  // route-on áll a doki (route-alapú stepper), ezért ez az egyetlen hely,
  // ahol ez a metaadat íródik, nem mindhárom oldalon külön.
  useEffect(() => {
    if (WORKFLOW_LEPESEK.some((lepes) => lepes.to === pathname)) {
      jelezWorkflowLepes(pathname as WorkflowRoute);
    }
  }, [pathname, jelezWorkflowLepes]);

  // backlog-40 (3. döntés, D161): a "Terv adatai" lépés ELŐRE (Kezelések/
  // Előnézet felé) elhagyásának ajánlat-jellegű elfogása
  // (components/LepesGuardContext.tsx). A hatókör szűkítése (kizárólag a
  // /paciens lépésről indított előrelépés) NEM itt dől el explicit módon --
  // a `TorzsadatSyncCard` (a `PatientPage` gyereke) kizárólag akkor
  // regisztrál handlert, amikor mountolva van, tehát máshonnan indított
  // navigációnál `lepesHandlerRef.current` eleve `null`.
  const [lepesHandler, setLepesHandler] = useState<LepesHandler | null>(null);
  const lepesHandlerRef = useRef<LepesHandler | null>(null);
  lepesHandlerRef.current = lepesHandler;
  const [elutasitottDiffId, setElutasitottDiffId] = useState<string | null>(null);

  const kerLepesValtas = useCallback((proceed: () => void) => {
    if (lepesHandlerRef.current?.(proceed)) return;
    proceed();
  }, []);

  const lepesGuardValue = useMemo(
    () => ({
      kerLepesValtas,
      // `setLepesHandler(handler)` KÖZVETLENÜL egy React setState-gotcha
      // lenne: egy setState-nek átadott FÜGGVÉNYt React updater-funkcióként
      // hívná meg (`handler(prevState)`), nem állapotként tárolná -- innen
      // a `() => handler` becsomagolás.
      regisztralLepesHandler: (handler: LepesHandler | null) => setLepesHandler(() => handler),
      elutasitottDiffId,
      setElutasitottDiffId,
    }),
    [kerLepesValtas, elutasitottDiffId],
  );

  function handleLepesClick(e: React.MouseEvent, to: WorkflowRoute) {
    if (to === pathname) return; // ugyanarra a lépésre kattintás -- nincs mit elfogni
    e.preventDefault();
    kerLepesValtas(() => navigate(to));
  }

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
        {/* D37: a piszkozat patientDir-je best-effort ismert (lásd
            state/AppState.tsx) -- ha van, a páciens-szegmens a
            részletoldalára linkel; ha nem (pl. "Vadonatúj páciens" ág,
            vagy egy funkció előtti perzisztált draft), sima szöveg marad. */}
        {piszkozatPatientDir ? (
          <Link
            to={`/paciensek/${encodeURIComponent(piszkozatPatientDir)}`}
            style={{ fontSize: 14, fontWeight: 500, color: t.text, textDecoration: 'none' }}
          >
            {paciensNev}
          </Link>
        ) : (
          <Text size="2" weight="medium">
            {paciensNev}
          </Text>
        )}
      </nav>

      <nav
        aria-label="Terv munkafolyamat"
        style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}
      >
        {WORKFLOW_LEPESEK.map((lepes, i) => {
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
                onClick={(e) => handleLepesClick(e, lepes.to)}
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

      <LepesGuardProvider value={lepesGuardValue}>
        <Outlet />
      </LepesGuardProvider>
    </Box>
  );
}
