/**
 * Typed sample/derived Improve data (Phase 6, decision #3). Raw weaknesses are
 * shaped like `weaknessProfile` output; everything else (skills radar incl. the
 * sample "Time" axis, milestones as chess study goals) is sample until the real
 * data layer lands (Phase 11). The plan itself is computed by the real pure
 * `composePlan` from these inputs + the live Send-to-Improve queue.
 */
import type { MilestoneVM, RawWeakness, SkillAxisVM } from '../../lib/improve/types';

export const SAMPLE_ANALYZED_GAMES = 42;

export const sampleRawWeaknesses: RawWeakness[] = [
  { key: 'rook_conversion', name: 'Rook endgame conversion', legacyCategory: 'phase', phase: 'endgame', score: 78, frequencyPct: 41, trend: 'worsening', phaseAccuracy: 71 },
  { key: 'hanging_pieces', name: 'Hanging pieces', legacyCategory: 'motif', score: 54, frequencyPct: 33, trend: 'improving', phaseAccuracy: 80 },
  { key: 'back_rank', name: 'Back-rank weakness', legacyCategory: 'motif', score: 30, frequencyPct: 18, trend: 'steady', phaseAccuracy: 82 },
  { key: 'opening_prep', name: 'Opening preparation (Black)', legacyCategory: 'opening', score: 48, frequencyPct: 22, trend: 'worsening', phaseAccuracy: 78 },
  { key: 'weak_squares', name: 'Weak square control', legacyCategory: 'positional', phase: 'middlegame', score: 28, frequencyPct: 15, trend: 'steady', phaseAccuracy: 75 },
];

// Skill radar — "you" vs dashed "peers". Time is sample (no clock-analysis yet).
export const sampleSkills: SkillAxisVM[] = [
  { axis: 'Tactics', you: 80, peers: 74 },
  { axis: 'Openings', you: 78, peers: 72 },
  { axis: 'Middlegame', you: 75, peers: 73 },
  { axis: 'Endgame', you: 71, peers: 76 },
  { axis: 'Positional', you: 75, peers: 71 },
  { axis: 'Time', you: 68, peers: 70 }, // sample (decision #3)
];

// Milestones as CHESS STUDY GOALS, not generic productivity tasks (refinement).
export const sampleMilestones: MilestoneVM[] = [
  { id: 'm-back-rank', label: 'Eliminate back-rank blunders', current: 18, target: 18, unit: 'games clean', status: 'achieved', progressPct: 100 },
  { id: 'm-rook-convert', label: 'Convert 10 rook endgames', current: 6, target: 10, unit: 'conversions', status: 'in_progress', progressPct: 60 },
  { id: 'm-tactical-misses', label: 'Review 20 tactical misses', current: 13, target: 20, unit: 'reviewed', status: 'in_progress', progressPct: 65 },
  { id: 'm-opening-inacc', label: 'Reduce opening inaccuracies 15%', current: 9, target: 15, unit: '% reduced', status: 'in_progress', progressPct: 60 },
  { id: 'm-rating', label: 'Reach 1550 rating', current: 1487, target: 1550, status: 'future', progressPct: 0 },
];

export const sampleFocusMeta = { week: 7, sessionsDone: 2, phaseDeltaPct: 4 };
