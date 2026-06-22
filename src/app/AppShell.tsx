import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/nav/Sidebar';
import { BottomTabBar } from '../components/nav/BottomTabBar';
import { CommandMenu } from '../components/nav/CommandMenu';
import { UserMenu } from '../components/nav/UserMenu';
import { useBreakpoint } from '../hooks/useResponsive';
import { useUiStore } from '../stores/uiStore';
import { useCommandMenuStore } from '../stores/commandMenuStore';
import { useAuth } from '../contexts/AuthContext';

/**
 * Responsive breakpoints (System Design §10):
 *   mobile  ≤767  → top bar + bottom tab bar
 *   tablet  768–1023 → icon-rail sidebar (auto-collapsed, no toggle)
 *   laptop  1024–1279 → full sidebar (toggle available)
 *   desktop ≥1280 → full sidebar (toggle available)
 */
const BP = { tablet: 768, laptop: 1024 } as const;

/**
 * App shell (System Design §3/§10, Architecture §5). Composes the persistent
 * sidebar (tablet icon-rail / laptop+desktop full) or top bar + bottom tab bar
 * (mobile) around a routed <Outlet>, plus the global ⌘K command menu. Pure
 * chrome — no screen logic.
 */
export function AppShell() {
  const { width } = useBreakpoint();
  const isMobile = width < BP.tablet;
  const isTablet = width >= BP.tablet && width < BP.laptop;

  const manualCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleCmdk = useCommandMenuStore((s) => s.toggle);
  const openCmdk = useCommandMenuStore((s) => s.setOpen);
  const { user, signOut } = useAuth();

  const userEmail = user?.email ?? '';
  const userName = (user?.user_metadata?.display_name as string | undefined) || userEmail.split('@')[0] || 'You';

  // Tablet forces the icon-rail; laptop/desktop honor the manual toggle (§10).
  const sidebarCollapsed = isTablet || manualCollapsed;

  // Global ⌘K / Ctrl+K opens the command menu (System Design §11).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCmdk();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggleCmdk]);

  return (
    <div className="ivs-shell">
      {/* Skip link for keyboard users (WCAG 2.4.1). */}
      <a href="#ivs-main" className="ivs-skiplink">Skip to content</a>

      <div className="ivs-shell__body">
        {!isMobile && (
          <Sidebar
            userName={userName}
            userEmail={userEmail}
            collapsed={sidebarCollapsed}
            showCollapseToggle={!isTablet}
            onSignOut={signOut}
          />
        )}

        <div className={`ivs-shell__content ${isMobile ? 'ivs-shell__content--mobile' : ''}`}>
          {isMobile && (
            <header className="ivs-topbar">
              <div className="ivs-topbar__brand">
                <span className="ivs-brand__mark" aria-hidden>♟</span>
                <span className="ivs-brand__name">ChessMate</span>
              </div>
              <button className="ivs-iconbtn" aria-label="Open command menu" onClick={() => openCmdk(true)}>⌕</button>
              <UserMenu userName={userName} userEmail={userEmail} onSignOut={signOut} variant="icon" />
            </header>
          )}
          <main id="ivs-main" tabIndex={-1}>
            <Outlet />
          </main>
        </div>
      </div>

      {isMobile && <BottomTabBar />}
      <CommandMenu />
    </div>
  );
}
