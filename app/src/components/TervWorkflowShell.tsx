// Terv-workflow héj -- backlog-31 (Terv workflow shell).
// A `/paciens`/`/terv`/`/elonezet` közös layout-route-ja (az app első
// nested route-mintája, react-router `Outlet`): állandó, kattintható
// breadcrumb (`Páciensek > [páciens neve]`) + szabadon kattintható,
// route-vezérelt 3-lépéses stepper (`Terv adatai -> Kezelések -> Előnézet
// és véglegesítés` -- a stepper végleges feliratai). A meglévő, laponkénti "Tovább" gombok
// (PatientPage.tsx, PlanEditorPage.tsx) ettől függetlenül, változatlanul
// megmaradnak -- a stepper a szabad ugrálást adja hozzá, nem irányított
// útvonalat vált ki.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Badge, Box, Separator, Text } from '@radix-ui/themes';
import { LepesGuardProvider, type LepesHandler } from './LepesGuardContext';
import NyelviReviewBar from './NyelviReviewBar';
import { NyelviReviewProvider } from './NyelviReviewContext';
import PaciensBreadcrumb from './PaciensBreadcrumb';
import PiszkozatKonfliktusDialog from './PiszkozatKonfliktusDialog';
import { PaciensKotesProvider } from './PaciensKotesContext';
import { t } from '../design/tokens';
import { piszkozatTartalmas } from '../domain/piszkozat';
import { WORKFLOW_LEPESEK } from '../domain/workflowLepesek';
import { useAppState } from '../state/AppState';
import type { WorkflowRoute } from '../storage/DraftStorage';

export default function TervWorkflowShell() {
  const {
    plan,
    jelezWorkflowLepes,
    piszkozatKonfliktus,
    megtartomSajatPiszkozatot,
    betoltomMasikPiszkozatot,
  } = useAppState();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Az Előnézet üres piszkozattal értelmezhetetlen: a `doFinalize` a
  // piszkozatot a MENTÉS UTÁN törli, tehát az üres piszkozat itt mindig azt
  // jelenti, hogy a verzió már a lemezen van -- egy ilyenkor renderelt
  // előnézet a véglegesítés-őr piros hard tételeit mutatná ("A páciens neve
  // kötelező"), mintha a mentés nem sikerült volna. A `/paciens` és a `/terv`
  // érintetlen: azok a vadonatúj terv szabályos kiindulópontjai.
  const uresElonezet = pathname === '/elonezet' && !piszkozatTartalmas(plan);

  // A piszkozat "utolsó workflow-lépése" -- a héj tudja MA IS, melyik
  // route-on áll a doki (route-alapú stepper), ezért ez az egyetlen hely,
  // ahol ez a metaadat íródik, nem mindhárom oldalon külön.
  useEffect(() => {
    if (uresElonezet) return;
    if (WORKFLOW_LEPESEK.some((lepes) => lepes.to === pathname)) {
      jelezWorkflowLepes(pathname as WorkflowRoute);
    }
  }, [pathname, jelezWorkflowLepes, uresElonezet]);

  // backlog-40 (3. döntés): a "Terv adatai" lépés ELŐRE (Kezelések/
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
  const [letrehozasPromptEldontve, setLetrehozasPromptEldontve] = useState(false);
  // Escape-pel elzárt konfliktus -- OBJEKTUM-azonosság szerint: a következő
  // tartalmi változás új konfliktus-objektumot ad, tehát a dialógus újra
  // felugrik, egy elzárás nem némítja el véglegesen.
  const [elzartKonfliktus, setElzartKonfliktus] = useState<object | null>(null);

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
      letrehozasPromptEldontve,
      setLetrehozasPromptEldontve,
    }),
    [kerLepesValtas, elutasitottDiffId, letrehozasPromptEldontve],
  );

  function handleLepesClick(e: React.MouseEvent, to: WorkflowRoute) {
    if (to === pathname) return; // ugyanarra a lépésre kattintás -- nincs mit elfogni
    e.preventDefault();
    kerLepesValtas(() => navigate(to));
  }

  // `replace`: egy új history-bejegyzést a Vissza gomb ugyanerre az üres
  // előnézetre dobna vissza, hurokba. A Kezdőlapon a páciens "Terv
  // véglegesítve · az imént" sora mondja meg, hogy a mentés sikerült.
  if (uresElonezet) return <Navigate to="/" replace />;

  return (
    <PaciensKotesProvider>
      <Box style={{ maxWidth: 900, margin: '0 auto' }}>
        <PaciensBreadcrumb />

        <nav
          aria-label="Terv munkafolyamat"
          style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}
        >
          {WORKFLOW_LEPESEK.map((lepes, i) => {
            const aktiv = pathname === lepes.to;
            // Üres piszkozaton az Előnézet lépés nem link, hanem fókuszálhatatlan
            // felirat: az őr (fent) egy szabályos kattintást is magyarázat nélkül
            // dobna ki a workflow-ból, egy `aria-disabled` link pedig Tabbal
            // elérhető, mégis hatástalan megállót adna.
            const tiltott = lepes.to === '/elonezet' && !piszkozatTartalmas(plan);
            const belso = (
              <>
                <Badge radius="full" size="1" variant="soft" color={aktiv ? 'brown' : 'gray'} aria-hidden="true">
                  {i + 1}
                </Badge>
                <Text size="2" weight={aktiv ? 'bold' : 'regular'} style={{ color: aktiv ? t.brand : t.uiTextMuted }}>
                  {lepes.label}
                </Text>
              </>
            );
            const kozosStilus = {
              display: 'inline-flex' as const,
              alignItems: 'center' as const,
              gap: 6,
              padding: '4px 10px',
              borderRadius: t.radius,
              textDecoration: 'none' as const,
              background: aktiv ? t.accentWash : 'transparent',
            };
            return (
              <span key={lepes.to} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    style={{ width: 20, height: 1, background: t.uiLineStrong, margin: '0 8px' }}
                  />
                )}
                {tiltott ? (
                  <span aria-label={lepes.label} aria-disabled="true" style={{ ...kozosStilus, opacity: 0.5 }}>
                    {belso}
                  </span>
                ) : (
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
                  style={kozosStilus}
                >
                  {belso}
                </Link>
                )}
              </span>
            );
          })}
        </nav>

        <Separator size="4" mb="4" />

        {/* A héjban él, hogy mindhárom workflow-lépésen felugorjon. Escape-pel
            zárható (app/src/CLAUDE.md): a piszkozat ilyenkor mentetlen marad, a
            szerkesztő fejléce ezt kiírja, és a következő tartalmi változás újra
            felhozza -- se néma elnyelés, se bezárhatatlan csapda. */}
        {piszkozatKonfliktus && (
          <PiszkozatKonfliktusDialog
            open={piszkozatKonfliktus !== elzartKonfliktus}
            sajat={piszkozatKonfliktus.sajat}
            masik={piszkozatKonfliktus.tarolt.plan}
            onMegtartomSajat={megtartomSajatPiszkozatot}
            onBetoltomMasikat={betoltomMasikPiszkozatot}
            onOpenChange={(nyitva) => {
              if (!nyitva) setElzartKonfliktus(piszkozatKonfliktus);
            }}
          />
        )}

        <LepesGuardProvider value={lepesGuardValue}>
          <NyelviReviewProvider>
            <NyelviReviewBar />
            <Outlet />
          </NyelviReviewProvider>
        </LepesGuardProvider>
      </Box>
    </PaciensKotesProvider>
  );
}
