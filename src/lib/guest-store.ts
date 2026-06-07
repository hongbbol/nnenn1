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
      // hero_image_preview(base64 dataURL, ~1.5MB)는 persist 제외 — localStorage
      // QuotaExceeded 방지. 이미지는 입력 세션 메모리에만 두고 저장 시 Storage 업로드.
      partialize: (s) => {
        const { hero_image_preview, ...cat } = s.cat;
        void hero_image_preview;
        return { cat, demoMode: s.demoMode };
      },
    },
  ),
);
