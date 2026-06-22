import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../services/queryClient';
import { IvToastProvider } from '../components/ui/iv';
import { AppShell } from './AppShell';
import { PlaceholderPage } from './PlaceholderPage';
import { ALL_DESTINATIONS, PARAM_ROUTES } from './navigation';
import { applyThemeAttributes, useThemeStore } from '../stores/themeStore';
import { useFlag } from '../lib/flags';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import './shell.css';

/** Show the real screen when its per-screen flag is on; placeholder otherwise. */
function DashboardRoute() {
  return useFlag('ui.screen.dashboard') ? <DashboardPage /> : placeholderFor('dashboard');
}

/** Placeholder element for a destination defined in navigation config. */
function placeholderFor(key: string) {
  const all = [...ALL_DESTINATIONS, ...PARAM_ROUTES.map((p) => ({ ...p, glyph: '' }))];
  const d = all.find((x) => x.key === key);
  if (!d) {
    // Fail fast + diagnosable if a route key drifts from navigation config.
    throw new Error(`placeholderFor: unknown route key "${key}"`);
  }
  return <PlaceholderPage title={d.label} purpose={d.purpose} phase={d.phase} path={d.path} />;
}

/**
 * New shell application root (Phase 3): providers + routing around the AppShell.
 *
 * Mounted only when `ui.newShell` is on (see App.tsx) and only for an
 * authenticated user, so production stays on the legacy app by default. Every
 * route renders a placeholder; feature phases swap placeholders for real screens
 * behind their per-screen flags.
 */
export function AppRouter() {
  const theme = useThemeStore((s) => s.theme);
  const accent = useThemeStore((s) => s.accent);
  const board = useThemeStore((s) => s.board);
  const density = useThemeStore((s) => s.density);

  // Reflect the Ivory theme tweaks onto <html> for the token cascade.
  useEffect(() => {
    applyThemeAttributes({ theme, accent, board, density });
  }, [theme, accent, board, density]);

  return (
    <QueryClientProvider client={queryClient}>
      <IvToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardRoute />} />
              <Route path="/games" element={placeholderFor('games')} />
              <Route path="/games/import" element={placeholderFor('import')} />
              <Route path="/games/:id" element={placeholderFor('game-detail')} />
              <Route path="/analysis" element={placeholderFor('analysis')} />
              <Route path="/analysis/:id" element={placeholderFor('analysis-detail')} />
              <Route path="/improve" element={placeholderFor('improve')} />
              <Route path="/weaknesses" element={placeholderFor('weaknesses')} />
              <Route path="/progress" element={placeholderFor('progress')} />
              <Route path="/coach" element={placeholderFor('coach')} />
              <Route path="/settings" element={placeholderFor('settings')} />
              <Route path="/profile" element={placeholderFor('profile')} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </IvToastProvider>
    </QueryClientProvider>
  );
}
