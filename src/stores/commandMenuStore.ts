/**
 * Command menu (⌘K) open/close state (Implementation Architecture §7).
 */
import { create } from 'zustand';

interface CommandMenuState {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

export const useCommandMenuStore = create<CommandMenuState>((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
