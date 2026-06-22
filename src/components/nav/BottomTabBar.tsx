import { NavLink } from 'react-router-dom';
import { BOTTOM_TABS, PRIMARY_NAV } from '../../app/navigation';

const TAB_LABEL: Record<string, string> = { dashboard: 'Home' };

/**
 * Mobile bottom tab bar (System Design §6 / §4.11): 4 items
 * (Home/Games/Analysis/Improve), 64px tall, active = accent glyph + hi label.
 * Coach is reached from contextual entry points, not the bar (§10).
 */
export function BottomTabBar() {
  const items = BOTTOM_TABS.map((key) => PRIMARY_NAV.find((n) => n.key === key)!);
  return (
    <nav className="ivs-bottombar" aria-label="Primary">
      {items.map((item) => (
        <NavLink key={item.key} to={item.path} className="ivs-bottombar__item">
          <span className="ivs-bottombar__glyph" aria-hidden>{item.glyph}</span>
          <span>{TAB_LABEL[item.key] ?? item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
