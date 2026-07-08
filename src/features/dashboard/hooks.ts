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

// Sample data is a DEV-only preview affordance (the `?shell` screenshots and the
// a11y suite need a populated dashboard without a real session). In production it
// must NEVER render — the file's contract. Authenticated users already bypass the
// sample path; this guard closes the latent trap where an *unauthenticated* caller
// that somehow reaches these hooks (e.g. a future routing change) would otherwise
// get fabricated numbers instead of an honest empty state (audit L1).
const SAMPLE_ALLOWED = import.meta.env.DEV;
const emptyResult = <T,>(data: T) => ({ data, isLoading: false, isError: false, refetch: reload });

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
  return SAMPLE_ALLOWED ? sampleQ : emptyResult(false);
}

export function useWeeklyFocus() {
  const { useReal, loading, error, real } = useDashboardReal();
  const sampleQ = useQuery<WeeklyFocusVM>({ queryKey: ['weeklyFocus'], queryFn: sample(sampleWeeklyFocus), ...opts });
  if (useReal) return { data: real?.focus ?? undefined, isLoading: loading, isError: !!error, refetch: reload };
  return SAMPLE_ALLOWED ? sampleQ : emptyResult<WeeklyFocusVM | undefined>(undefined);
}

export function useTopWeaknesses() {
  const { useReal, loading, error, real } = useDashboardReal();
  const sampleQ = useQuery<WeaknessCompactVM[]>({ queryKey: ['topWeaknesses'], queryFn: sample(sampleWeaknesses), ...opts });
  if (useReal) return { data: real?.weaknesses ?? [], isLoading: loading, isError: !!error, refetch: reload };
  return SAMPLE_ALLOWED ? sampleQ : emptyResult<WeaknessCompactVM[]>([]);
}

/** Improvement score (streak/delta/verdict) has no real source yet — show
 *  nothing for real users rather than a fabricated score. Sample in DEV only. */
export function useImprovementScore() {
  const { user } = useAuth();
  const sampleQ = useQuery<ImprovementScoreVM>({ queryKey: ['improvementScore'], queryFn: sample(sampleImprovementScore), ...opts });
  if (user) return { data: undefined, isLoading: false, isError: false, refetch: reload };
  return SAMPLE_ALLOWED ? sampleQ : emptyResult<ImprovementScoreVM | undefined>(undefined);
}

/** Roadmap/milestones have no real source yet — empty for real users. */
export function useRoadmap() {
  const { user } = useAuth();
  const sampleQ = useQuery<MilestoneNodeVM[]>({ queryKey: ['roadmap'], queryFn: sample(sampleRoadmap), ...opts });
  if (user) return { data: [] as MilestoneNodeVM[], isLoading: false, isError: false, refetch: reload };
  return SAMPLE_ALLOWED ? sampleQ : emptyResult<MilestoneNodeVM[]>([]);
}

// ── Unrendered cards (not part of the live dashboard surface) — DEV sample only,
//    empty in production so no fabricated data can ever surface (audit L1). ──
export function useRatingHistory(range: RatingRange) {
  const sampleQ = useQuery<RatingHistoryVM>({ queryKey: ['ratingHistory', range], queryFn: sample(sampleRatingHistory(range)), ...opts });
  return SAMPLE_ALLOWED ? sampleQ : emptyResult<RatingHistoryVM | undefined>(undefined);
}

export function useRecentGames() {
  const sampleQ = useQuery<GameRowVM[]>({ queryKey: ['recentGames', 5], queryFn: sample(sampleRecentGames), ...opts });
  return SAMPLE_ALLOWED ? sampleQ : emptyResult<GameRowVM[]>([]);
}

export function useCoachSummary() {
  const sampleQ = useQuery<CoachSummaryVM>({ queryKey: ['coachSummary'], queryFn: sample(sampleCoachSummary), ...opts });
  return SAMPLE_ALLOWED ? sampleQ : emptyResult<CoachSummaryVM | undefined>(undefined);
}
