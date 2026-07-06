import { create } from "zustand";

interface CountersDemoStore {
  open: boolean;
  openDemo: () => void;
  closeDemo: () => void;
}

export const useCountersDemoStore = create<CountersDemoStore>((set) => ({
  open: false,
  openDemo: () => set({ open: true }),
  closeDemo: () => set({ open: false }),
}));
