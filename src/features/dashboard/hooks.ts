/**
 * Dashboard data hooks (System Design §7).
 *
 * B4 (real-data): for an authenticated user the *rendered* regions — the
 * empty-state gate, the Weekly Focus hero, and the "Your plan" top weaknesses —
 * derive from the user's real read-only WeaknessProfile (`useWeaknessProfile`)
 * via the pure `profileToDashboard`. The improvement score (streak/delta/verdict)
 * and the roadmap have NO real source yet, so they return no data for real users
 * — the cards hide rather than show a fabricated rating, streak, or percentage.
 *
 * Sample data is used ONLY in the unauthenticated DEV preview (parity with
 * Games/Analysis) so `?shell` screenshots and the a11y suite stay populated;
 * production never shows it. Unrendered cards (rating chart / recent / coach)
 * keep their sample resolvers — they are not part of the live dashboard surface.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useWeaknessProfile } from '../../hooks/useWeaknessProfile';
import { readImproveQueue } from '../improve/queue';
import { profileToDashboard } from './realDashboard';
import {
  sampleCoachSummary, sampleHasGames, sampleImprovementScore, sampleRatingHistory,
  sampleRecentGames, sampleRoadmap, sampleWeaknesses, sampleWeeklyFocus,
} from './sampleDashboard';
import type {
  CoachSummaryVM, GameRowVM, ImprovementScoreVM, MilestoneNodeVM,
  RatingHistoryVM, RatingRange, WeaknessCompactVM, WeeklyFocusVM,
} from './types';

// Sample resolver: async so loading/skeleton states are exercised exactly as
// they will be against the network. staleTime Infinity (immutable sample).
const sample = <T,>(value: T) => () => Promise.resolve(value);
const opts = { staleTime: Infinity } as const;
const reload = () => { if (typeof window !== 'undefined') window.location.reload(); };

/** Real dashboard regions (or null) for an authed user; null for DEV preview. */
function useDashboardReal() {
  const { user } = useAuth();
  const useReal = !!user;
  const { profile, loading, error } = useWeaknessProfile(useReal);
  const real = useReal && profile ? profileToDashboard(profile, readImproveQueue()) : null;
  return { useReal, loading: useReal ? loading : false, error: useReal ? error : null, real };
}

/** True when the user has a real improvement plan; false → onboarding (§7). */
export function useDashboardEmptyState() {
  const { useReal, loading, error, real } = useDashboardReal();
  const sampleQ = useQuery({ queryKey: ['dashboard', 'hasGames'], queryFn: sample(sampleHasGames), ...opts });
  if (useReal) return { data: real ? real.hasData : false, isLoading: loading, isError: !!error, refetch: reload };
  return sampleQ;
}

export function useWeeklyFocus() {
  const { useReal, loading, error, real } = useDashboardReal();
  const sampleQ = useQuery<WeeklyFocusVM>({ queryKey: ['weeklyFocus'], queryFn: sample(sampleWeeklyFocus), ...opts });
  if (useReal) return { data: real?.focus ?? undefined, isLoading: loading, isError: !!error, refetch: reload };
  return sampleQ;
}

export function useTopWeaknesses() {
  const { useReal, loading, error, real } = useDashboardReal();
  const sampleQ = useQuery<WeaknessCompactVM[]>({ queryKey: ['topWeaknesses'], queryFn: sample(sampleWeaknesses), ...opts });
  if (useReal) return { data: real?.weaknesses ?? [], isLoading: loading, isError: !!error, refetch: reload };
  return sampleQ;
}

/** Improvement score (streak/delta/verdict) has no real source yet — show
 *  nothing for real users rather than a fabricated score. Sample in DEV only. */
export function useImprovementScore() {
  const { user } = useAuth();
  const sampleQ = useQuery<ImprovementScoreVM>({ queryKey: ['improvementScore'], queryFn: sample(sampleImprovementScore), ...opts });
  if (user) return { data: undefined, isLoading: false, isError: false, refetch: reload };
  return sampleQ;
}

/** Roadmap/milestones have no real source yet — empty for real users. */
export function useRoadmap() {
  const { user } = useAuth();
  const sampleQ = useQuery<MilestoneNodeVM[]>({ queryKey: ['roadmap'], queryFn: sample(sampleRoadmap), ...opts });
  if (user) return { data: [] as MilestoneNodeVM[], isLoading: false, isError: false, refetch: reload };
  return sampleQ;
}

// ── Unrendered cards (not part of the live dashboard surface) — sample only. ──
export function useRatingHistory(range: RatingRange) {
  return useQuery<RatingHistoryVM>({ queryKey: ['ratingHistory', range], queryFn: sample(sampleRatingHistory(range)), ...opts });
}

export function useRecentGames() {
  return useQuery<GameRowVM[]>({ queryKey: ['recentGames', 5], queryFn: sample(sampleRecentGames), ...opts });
}

export function useCoachSummary() {
  return useQuery<CoachSummaryVM>({ queryKey: ['coachSummary'], queryFn: sample(sampleCoachSummary), ...opts });
}
