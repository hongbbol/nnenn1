'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GuestCat } from '@/lib/domain/types';

type GuestState = {
  cat: GuestCat;
  demoMode: boolean;
  setCat: (patch: Partial<GuestCat>) => void;
  resetCat: () => void;
  setDemoMode: (v: boolean) => void;
};

const INITIAL_CAT: GuestCat = {
  health_conditions: [],
  avoid_ingredients: [],
};

export const useGuestStore = create<GuestState>()(
  persist(
    (set) => ({
      cat: INITIAL_CAT,
      demoMode: false,
      setCat: (patch) =>
        set((s) => ({
          cat: { ...s.cat, ...patch },
        })),
      resetCat: () => set({ cat: INITIAL_CAT, demoMode: false }),
      setDemoMode: (v) => set({ demoMode: v }),
    }),
    {
      name: 'wg.guest',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ cat: s.cat, demoMode: s.demoMode }),
    },
  ),
);
