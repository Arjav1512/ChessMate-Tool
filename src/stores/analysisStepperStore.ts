/**
 * Analysis stepper store (Implementation Architecture §7 — UI state in Zustand).
 *
 * Owns the *navigation* state of the Analysis Workspace: current ply, board
 * orientation, and the active peer tab. The *data* it indexes into (moves,
 * analysis) lives in TanStack Query. Tab default is 'analysis' and is never
 * auto-changed to 'coach' (§8/§14.7).
 */
import { create } from 'zustand';

export type AnalysisTab = 'analysis' | 'coach' | 'lines';
export type Orientation = 'w' | 'b';

interface AnalysisStepperState {
  currentPly: number;       // 0 = start position; N = after Nth half-move
  orientation: Orientation;
  activeTab: AnalysisTab;
  setPly: (ply: number) => void;
  flip: () => void;
  setOrientation: (o: Orientation) => void;
  setTab: (t: AnalysisTab) => void;
  /** Reset to a fresh game (start position, default orientation/tab). */
  reset: (orientation?: Orientation) => void;
}

export const useAnalysisStepper = create<AnalysisStepperState>((set) => ({
  currentPly: 0,
  orientation: 'w',
  activeTab: 'analysis',
  setPly: (ply) => set({ currentPly: Math.max(0, ply) }),
  flip: () => set((s) => ({ orientation: s.orientation === 'w' ? 'b' : 'w' })),
  setOrientation: (o) => set({ orientation: o }),
  setTab: (t) => set({ activeTab: t }),
  reset: (orientation = 'w') => set({ currentPly: 0, orientation, activeTab: 'analysis' }),
}));
