import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../services/queryClient';
import { IvToastProvider } from '../components/ui/iv';
import { AppShell } from './AppShell';
import { PlaceholderPage } from './PlaceholderPage';
import { ALL_DESTINATIONS, PARAM_ROUTES } from './navigation';
import { applyThemeAttributes, useThemeStore } from '../stores/themeStore';
import { useFlag } from '../lib/flags';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { AnalysisPage } from '../features/analysis/AnalysisPage';
import { ImprovePage } from '../features/improve/ImprovePage';
import { ImprovePlanView } from '../features/improve/ImprovePlanView';
import { ReviewMistakesView } from '../features/improve/mistakes/ReviewMistakesView';
import { LibraryPage } from '../features/games/LibraryPage';
import { ImportPage } from '../features/games/ImportPage';
import './shell.css';

/** Show the real screen when its per-screen flag is on; placeholder otherwise. */
function DashboardRoute() {
  return useFlag('ui.screen.dashboard') ? <DashboardPage /> : placeholderFor('dashboard');
}

/** Analysis workspace at /analysis/:id behind ui.screen.analysis. */
function AnalysisRoute() {
  return useFlag('ui.screen.analysis') ? <AnalysisPage /> : placeholderFor('analysis-detail');
}

/** /analysis index → open the sample workspace when flagged, else placeholder. */
function AnalysisIndexRoute() {
  return useFlag('ui.screen.analysis') ? <Navigate to="/analysis/sample" replace /> : placeholderFor('analysis');
}

/** Game Library + Import behind ui.screen.games. */
function GamesRoute() {
  return useFlag('ui.screen.games') ? <LibraryPage /> : placeholderFor('games');
}
function GameImportRoute() {
  return useFlag('ui.screen.games') ? <ImportPage /> : placeholderFor('import');
}
/** Game detail = Analysis (§3) — open the game in the workspace. */
function GameDetailRoute() {
  const { id } = useParams();
  if (!useFlag('ui.screen.games')) return placeholderFor('game-detail');
  return <Navigate to={`/analysis/${id ?? 'sample'}`} replace />;
}

/** Improve Hub at /improve behind ui.screen.improve. */
function ImproveRoute() {
  return useFlag('ui.screen.improve') ? <ImprovePage /> : placeholderFor('improve');
}

/** Placeholder element for a destination defined in navigation config. */
function placeholderFor(key: string) {
  const all = [...ALL_DESTINATIONS, ...PARAM_ROUTES.map((p) => ({ ...p, glyph: '' }))];
  const d = all.find((x) => x.key === key);
  if (!d) {
    // Fail fast + diagnosable if a route key drifts from navigation config.
    throw new Error(`placeholderFor: unknown route key "${key}"`);
  }
  return <PlaceholderPage title={d.label} purpose={d.purpose} />;
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
              <Route path="/games" element={<GamesRoute />} />
              <Route path="/games/import" element={<GameImportRoute />} />
              <Route path="/games/:id" element={<GameDetailRoute />} />
              <Route path="/analysis" element={<AnalysisIndexRoute />} />
              <Route path="/analysis/:id" element={<AnalysisRoute />} />
              <Route path="/improve" element={<ImproveRoute />}>
                <Route index element={<ImprovePlanView />} />
                <Route path="mistakes" element={<ReviewMistakesView />} />
              </Route>
              {/* Phase 0 (W1 — navigation stabilization): unfinished screens are
                  intentionally NOT registered as routes. Coach, Settings, Profile,
                  Weaknesses, and Progress are already hidden from every nav surface
                  (navigation.ts `built:false`); a direct/stale URL now falls through
                  to the catch-all below and redirects to the dashboard, so there is
                  no user-facing dead-end ("Coming soon" page) anywhere. Re-listing a
                  screen when it ships is a one-line route here plus flipping `built`
                  in navigation.ts. */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </IvToastProvider>
    </QueryClientProvider>
  );
}
