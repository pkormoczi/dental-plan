import { NavLink } from 'react-router-dom';
import { t } from '../design/tokens';
import logoUrl from '../assets/logo.png';

const LINKS: Array<{ to: string; label: string }> = [
  { to: '/', label: 'Kezdőlap' },
  { to: '/paciens', label: 'Páciens' },
  { to: '/terv', label: 'Terv szerkesztő' },
  { to: '/elonezet', label: 'Előnézet' },
  { to: '/tervek', label: 'Korábbi tervek' },
  { to: '/arlista', label: 'Árlista' },
  { to: '/beallitasok', label: 'Beállítások' },
];

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
        borderBottom: `1px solid ${t.line}`,
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
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          style={({ isActive }) => ({
            fontSize: 13,
            padding: '6px 10px',
            borderRadius: t.radius,
            textDecoration: 'none',
            color: isActive ? t.brand : t.textMuted,
            background: isActive ? t.accentWash : 'transparent',
            fontWeight: isActive ? 600 : 400,
          })}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
