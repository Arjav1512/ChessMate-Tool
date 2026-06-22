/**
 * Dashboard data hooks (System Design §7). Each region has its own hook with a
 * query key per Architecture §7. Phase 4 resolves them from the typed sample
 * adapter; the queryFn signature matches the future API so the swap to live
 * Supabase reads is a one-file change.
 */
import { useQuery } from '@tanstack/react-query';
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

export function useDashboardEmptyState() {
  return useQuery({ queryKey: ['dashboard', 'hasGames'], queryFn: sample(sampleHasGames), ...opts });
}

export function useImprovementScore() {
  return useQuery<ImprovementScoreVM>({ queryKey: ['improvementScore'], queryFn: sample(sampleImprovementScore), ...opts });
}

export function useRatingHistory(range: RatingRange) {
  return useQuery<RatingHistoryVM>({ queryKey: ['ratingHistory', range], queryFn: sample(sampleRatingHistory(range)), ...opts });
}

export function useTopWeaknesses() {
  return useQuery<WeaknessCompactVM[]>({ queryKey: ['topWeaknesses'], queryFn: sample(sampleWeaknesses), ...opts });
}

export function useWeeklyFocus() {
  return useQuery<WeeklyFocusVM>({ queryKey: ['weeklyFocus'], queryFn: sample(sampleWeeklyFocus), ...opts });
}

export function useRecentGames() {
  return useQuery<GameRowVM[]>({ queryKey: ['recentGames', 5], queryFn: sample(sampleRecentGames), ...opts });
}

export function useCoachSummary() {
  return useQuery<CoachSummaryVM>({ queryKey: ['coachSummary'], queryFn: sample(sampleCoachSummary), ...opts });
}

export function useRoadmap() {
  return useQuery<MilestoneNodeVM[]>({ queryKey: ['roadmap'], queryFn: sample(sampleRoadmap), ...opts });
}
