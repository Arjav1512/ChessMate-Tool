import { NavLink } from 'react-router-dom';
import { PRIMARY_NAV } from '../../app/navigation';
import { useUiStore } from '../../stores/uiStore';
import { useCommandMenuStore } from '../../stores/commandMenuStore';
import { SearchInput } from '../ui/iv';
import { UserMenu } from './UserMenu';

/**
 * Persistent left sidebar (System Design §6 Navigation Components, IA §3):
 * brand, ⌘K search, primary nav (IA order), and a user/profile menu pinned
 * bottom. Active item = accent-tinted fill + aria-current="page".
 * Settings/Profile are intentionally NOT primary nav (§3) — they live in the
 * UserMenu. `collapsed` renders the icon-rail (tablet + manual toggle).
 */
export function Sidebar({
  userName,
  userEmail,
  collapsed,
  showCollapseToggle = true,
  onSignOut,
}: {
  userName: string;
  userEmail: string;
  collapsed: boolean;
  showCollapseToggle?: boolean;
  onSignOut: () => void;
}) {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const openCmdk = useCommandMenuStore((s) => s.setOpen);

  return (
    <aside className={`ivs-sidebar ${collapsed ? 'ivs-sidebar--collapsed' : ''}`}>
      <div className="ivs-brand">
        <span className="ivs-brand__mark" aria-hidden>♟</span>
        <span className="ivs-brand__name">ChessMate</span>
      </div>

      {!collapsed && (
        <div className="ivs-sidebar__search">
          <SearchInput
            placeholder="Search games"
            kbdHint="⌘K"
            readOnly
            aria-label="Open command menu"
            onFocus={() => openCmdk(true)}
            onClick={() => openCmdk(true)}
          />
        </div>
      )}

      <nav className="ivs-nav" aria-label="Primary">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.key} to={item.path} className="ivs-navitem" title={item.label}>
            <span className="ivs-navitem__glyph" aria-hidden>{item.glyph}</span>
            <span className="ivs-navitem__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="ivs-sidebar__spacer" />

      {showCollapseToggle && (
        <button
          className="ivs-iconbtn ivs-sidebar__collapse"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '»' : '«'}
        </button>
      )}

      <UserMenu userName={userName} userEmail={userEmail} onSignOut={onSignOut} variant="block" showLabel={!collapsed} />
    </aside>
  );
}
