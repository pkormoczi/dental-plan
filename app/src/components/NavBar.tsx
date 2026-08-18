import { NavLink } from 'react-router-dom';
import { Separator } from '@radix-ui/themes';
import { t } from '../design/tokens';
import logoUrl from '../assets/logo.png';

// Végleges öt tételes fő navigáció (backlog-29, redesign DP-001, C1
// feloldás) -- ez a forrásigazság az IA-ra, a docs/03-funkcionalis-spec.md
// "Fő navigáció" szakasza ugyanezt írja le prózában.
const FO_LINKS: Array<{ to: string; label: string }> = [
  { to: '/', label: 'Kezdőlap' },
  { to: '/paciensek', label: 'Páciensek' },
  { to: '/arlista', label: 'Kezelések és árak' },
  { to: '/beallitasok', label: 'Beállítások' },
  { to: '/demo', label: 'DEMO' },
];

// Ideiglenes: a terv-workflow oldalai (backlog-30/31, DP-002/DP-003) még
// nincsenek a páciens-kontextus alá húzva, addig ezek az EGYETLEN
// belépési pontjaik -- a 31. tétel törli, amint a stepper átveszi a
// szerepüket.
const ATMENETI_LINKS: Array<{ to: string; label: string }> = [
  { to: '/paciens', label: 'Páciens' },
  { to: '/terv', label: 'Terv szerkesztő' },
  { to: '/elonezet', label: 'Előnézet' },
  { to: '/tervek', label: 'Korábbi tervek' },
];

function navLinkStyle(isActive: boolean, halvany: boolean) {
  return {
    fontSize: 13,
    padding: '6px 10px',
    borderRadius: t.radius,
    textDecoration: 'none',
    color: isActive ? t.brand : halvany ? t.uiTextFaint : t.uiTextMuted,
    background: isActive ? t.accentWash : 'transparent',
    fontWeight: isActive ? 600 : 400,
  };
}

export default function NavBar() {
  return (
    <nav
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
          style={({ isActive }) => navLinkStyle(isActive, false)}
        >
          {link.label}
        </NavLink>
      ))}
      <Separator orientation="vertical" style={{ margin: '0 6px', flexShrink: 0 }} />
      {ATMENETI_LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          style={({ isActive }) => navLinkStyle(isActive, true)}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
