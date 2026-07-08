import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../services/queryClient';
import { IvToastProvider, Spinner } from '../components/ui/iv';
import { AppShell } from './AppShell';
import { PlaceholderPage } from './PlaceholderPage';
import { ALL_DESTINATIONS, PARAM_ROUTES } from './navigation';
import { applyThemeAttributes, useThemeStore } from '../stores/themeStore';
import { useAuth } from '../contexts/AuthContext';
import { useFlag } from '../lib/flags';
import './shell.css';

// Route-level code splitting (audit M4): each screen is its own chunk, fetched
// on first navigation. The shell (sidebar/topbar) stays mounted while a screen
// loads — the Suspense boundary lives INSIDE each route, not around <Routes> —
// so navigation never blanks the chrome.
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const InsightsPage = lazy(() => import('../features/insights/InsightsPage').then((m) => ({ default: m.InsightsPage })));
const AnalysisPage = lazy(() => import('../features/analysis/AnalysisPage').then((m) => ({ default: m.AnalysisPage })));
const ImprovePage = lazy(() => import('../features/improve/ImprovePage').then((m) => ({ default: m.ImprovePage })));
const ImprovePlanView = lazy(() => import('../features/improve/ImprovePlanView').then((m) => ({ default: m.ImprovePlanView })));
const ReviewMistakesView = lazy(() => import('../features/improve/mistakes/ReviewMistakesView').then((m) => ({ default: m.ReviewMistakesView })));
const LibraryPage = lazy(() => import('../features/games/LibraryPage').then((m) => ({ default: m.LibraryPage })));
const ImportPage = lazy(() => import('../features/games/ImportPage').then((m) => ({ default: m.ImportPage })));

/** Centered spinner shown while a screen chunk downloads (usually one hop). */
function RouteFallback() {
  return (
    <div role="status" aria-label="Loading page" style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12) 0' }}>
      <Spinner />
    </div>
  );
}

/** Mount a lazy screen behind its own Suspense boundary. */
function screen(el: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{el}</Suspense>;
}

/** Show the real screen when its per-screen flag is on; placeholder otherwise. */
function DashboardRoute() {
  return useFlag('ui.screen.dashboard') ? screen(<DashboardPage />) : placeholderFor('dashboard');
}

/** Insights (personal performance dashboard) behind ui.screen.insights. */
function InsightsRoute() {
  return useFlag('ui.screen.insights') ? screen(<InsightsPage />) : placeholderFor('insights');
}

/** Analysis workspace at /analysis/:id behind ui.screen.analysis. */
function AnalysisRoute() {
  return useFlag('ui.screen.analysis') ? screen(<AnalysisPage />) : placeholderFor('analysis-detail');
}

/** /analysis index. An authenticated user picks a real game from the library —
 *  never a demo presented as their own data (audit M1). The sample workspace
 *  stays reachable at /analysis/sample (explicitly labeled as a demo there)
 *  and remains the default only for the unauthenticated dev preview. */
function AnalysisIndexRoute() {
  const { user } = useAuth();
  const enabled = useFlag('ui.screen.analysis');
  if (!enabled) return placeholderFor('analysis');
  return <Navigate to={user ? '/games' : '/analysis/sample'} replace />;
}

/** Game Library + Import behind ui.screen.games. */
function GamesRoute() {
  return useFlag('ui.screen.games') ? screen(<LibraryPage />) : placeholderFor('games');
}
function GameImportRoute() {
  return useFlag('ui.screen.games') ? screen(<ImportPage />) : placeholderFor('import');
}
/** Game detail = Analysis (§3) — open the game in the workspace. */
function GameDetailRoute() {
  const { id } = useParams();
  if (!useFlag('ui.screen.games')) return placeholderFor('game-detail');
  return <Navigate to={`/analysis/${id ?? 'sample'}`} replace />;
}

/** Improve Hub at /improve behind ui.screen.improve. */
function ImproveRoute() {
  return useFlag('ui.screen.improve') ? screen(<ImprovePage />) : placeholderFor('improve');
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
              <Route path="/insights" element={<InsightsRoute />} />
              <Route path="/games" element={<GamesRoute />} />
              <Route path="/games/import" element={<GameImportRoute />} />
              <Route path="/games/:id" element={<GameDetailRoute />} />
              <Route path="/analysis" element={<AnalysisIndexRoute />} />
              <Route path="/analysis/:id" element={<AnalysisRoute />} />
              <Route path="/improve" element={<ImproveRoute />}>
                <Route index element={screen(<ImprovePlanView />)} />
                <Route path="mistakes" element={screen(<ReviewMistakesView />)} />
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
