import { useNavigate, type NavigateFunction, NavLink } from 'react-router-dom';
import DiscardChangesDialog, { useDiscardGuard } from './DiscardChangesDialog';
import { useNavGuardState } from './NavGuardContext';
import { t } from '../design/tokens';
import logoUrl from '../assets/logo.png';

// Végleges öt tételes fő navigáció, D34 (docs/01-attekintes-es-dontesek.md)
// -- ez a forrásigazság az IA-ra, a docs/03-funkcionalis-spec.md
// "Fő navigáció" szakasza ugyanezt írja le prózában. A korábban itt élt
// négy átmeneti workflow-link (Páciens/Terv szerkesztő/Előnézet/Korábbi
// tervek) a terv-workflow héj (backlog-31, D36) elkészültével megszűnt --
// a szerepüket a `TervWorkflowShell` breadcrumb+stepperje vette át.
const FO_LINKS: Array<{ to: string; label: string }> = [
  { to: '/', label: 'Kezdőlap' },
  { to: '/paciensek', label: 'Páciensek' },
  { to: '/arlista', label: 'Kezelések és árak' },
  { to: '/beallitasok', label: 'Beállítások' },
  { to: '/demo', label: 'DEMO' },
];

function navLinkStyle(isActive: boolean) {
  return {
    fontSize: 13,
    padding: '6px 10px',
    borderRadius: t.radius,
    textDecoration: 'none',
    color: isActive ? t.brand : t.uiTextMuted,
    background: isActive ? t.accentWash : 'transparent',
    fontWeight: isActive ? 600 : 400,
  };
}

// D46 (docs/01-attekintes-es-dontesek.md): a linkek kattintását el kell
// fogni, ha van nem mentett módosítás egy D38-védett felületen
// (`NavGuardContext`) -- a MEGLÉVŐ `useDiscardGuard`/`DiscardChangesDialog`
// primitívet hívja újra, a context "van piszkozat" jelzőjével táplálva, nem
// egy második megerősítő-mechanizmust bevezetve. Nem-dirty állapotban a
// `NavLink` a szokásos módon navigál, `onClick` beavatkozás nélkül.
function handleLinkClick(
  e: React.MouseEvent<HTMLAnchorElement>,
  to: string,
  dirty: boolean,
  navigate: NavigateFunction,
  requestNavigation: (apply: () => void) => void,
) {
  if (!dirty) return;
  e.preventDefault();
  requestNavigation(() => navigate(to));
}

export default function NavBar() {
  const { dirty } = useNavGuardState();
  const navigate = useNavigate();
  const guard = useDiscardGuard(dirty);

  return (
    <nav
      aria-label="Fő navigáció"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexWrap: 'wrap',
        padding: '8px 24px',
        background: t.surface,
        borderBottom: `1px solid ${t.uiLine}`,
        fontFamily: t.font,
      }}
    >
      <img
        src={logoUrl}
        alt="Mándoki Dental"
        style={{
          height: 26,
          width: 'auto',
          display: 'block',
          marginRight: 12,
          paddingRight: 12,
          borderRight: `2px solid ${t.accent}`,
          flexShrink: 0,
        }}
      />
      {FO_LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          style={({ isActive }) => navLinkStyle(isActive)}
          onClick={(e) => handleLinkClick(e, link.to, dirty, navigate, guard.request)}
        >
          {link.label}
        </NavLink>
      ))}

      <DiscardChangesDialog
        open={guard.pending}
        onOpenChange={(open) => !open && guard.cancel()}
        onConfirm={guard.confirm}
        title="Nem mentett módosítás"
        description="Van nem mentett módosításod. Ha elnavigálsz, ez elvész — csak a Mentés gomb rögzíti. Biztosan folytatod?"
        confirmLabel="Váltás, módosítás elvetésével"
      />
    </nav>
  );
}
