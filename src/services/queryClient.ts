/**
 * TanStack Query client (Implementation Architecture §7).
 *
 * Server state (games, analysis, weaknesses, plan, progress, coach) is owned by
 * Query; UI state lives in Zustand; URL owns navigational/shareable state.
 *
 * staleTime conventions (§7): lists 60s · analysis/immutable 5min · progress 60s.
 * Query-key conventions (§7): ['games', filters], ['analysis', gameId],
 * ['weaknessProfile'], ['ratingHistory', range], etc. No queries are wired in
 * Phase 3 (no screens yet) — this is the foundation the feature phases consume.
 */
import { QueryClient } from '@tanstack/react-query';

export const STALE_TIME = {
  list: 60_000,
  immutable: 5 * 60_000,
  progress: 60_000,
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME.list,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
