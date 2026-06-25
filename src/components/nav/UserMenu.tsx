import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { USER_MENU } from '../../app/navigation';
import { Avatar } from '../ui/iv';

/**
 * User/profile menu (System Design §3 "user/profile menu pinned bottom of
 * sidebar"). Holds Profile, Settings, and Sign out. Shared by the desktop
 * sidebar (bottom) and the mobile top bar so IA placement is identical on both.
 *
 * `variant="block"` renders the full avatar + name/email trigger (sidebar);
 * `variant="icon"` renders a compact avatar button (mobile top bar).
 */
export function UserMenu({
  userName,
  userEmail,
  onSignOut,
  variant = 'block',
  showLabel = true,
}: {
  userName: string;
  userEmail: string;
  onSignOut: () => void;
  variant?: 'block' | 'icon';
  showLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`ivs-usermenu ivs-usermenu--${variant}`} ref={ref}>
      {open && (
        <div className="ivs-usermenu__pop" role="menu" aria-label="Account">
          {USER_MENU.filter((item) => item.built).map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              role="menuitem"
              className="ivs-usermenu__item"
              onClick={() => setOpen(false)}
            >
              <span aria-hidden>{item.glyph}</span>
              {item.label}
            </NavLink>
          ))}
          <button role="menuitem" className="ivs-usermenu__item" onClick={() => { setOpen(false); onSignOut(); }}>
            <span aria-hidden>⏻</span>
            Sign out
          </button>
        </div>
      )}
      {variant === 'block' ? (
        <button
          className="ivs-userblock"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
          onClick={() => setOpen((o) => !o)}
        >
          <Avatar name={userName} size={32} />
          {showLabel && (
            <span className="ivs-userblock__meta">
              <span className="ivs-userblock__name">{userName}</span>
              <span className="ivs-userblock__sub">{userEmail}</span>
            </span>
          )}
        </button>
      ) : (
        <button
          className="ivs-iconbtn"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
          onClick={() => setOpen((o) => !o)}
        >
          <Avatar name={userName} size={28} />
        </button>
      )}
    </div>
  );
}
