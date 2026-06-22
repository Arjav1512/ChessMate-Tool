/**
 * Global UI store (Implementation Architecture §7) — synchronous, ephemeral UI
 * state that should not live in the URL or trigger network. Phase 3 owns the
 * shell chrome; feature phases extend with their own slices (e.g. the analysis
 * stepper lands in Phase 5 as its own store).
 */
import { create } from 'zustand';

interface UiState {
  /** Desktop sidebar collapsed to an icon rail. */
  sidebarCollapsed: boolean;
  /** Mobile nav sheet open. */
  mobileNavOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setMobileNavOpen: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  mobileNavOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
}));
