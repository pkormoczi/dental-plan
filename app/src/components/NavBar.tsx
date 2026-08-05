import { NavLink } from 'react-router-dom';
import { t } from '../design/tokens';

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
        gap: 4,
        flexWrap: 'wrap',
        padding: '10px 24px',
        background: t.surface,
        borderBottom: `1px solid ${t.line}`,
        fontFamily: t.font,
      }}
    >
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
            color: isActive ? t.navy : t.textMuted,
            background: isActive ? t.skyWash : 'transparent',
            fontWeight: isActive ? 600 : 400,
          })}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
