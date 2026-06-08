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
  exclude_food_ids: [],
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
      // v2: '피하고 싶은 성분' UI 제거 — 기존 localStorage에 남은 avoid_ingredients stale 값을
      //     비워 다음 온보딩 저장 때 추천/프로필에 반영되지 않게 한다. (컬럼·로직은 보존)
      version: 2,
      migrate: (persisted, fromVersion) => {
        const state = (persisted ?? {}) as { cat?: GuestCat; demoMode?: boolean };
        if (fromVersion < 2 && state.cat) {
          state.cat = { ...state.cat, avoid_ingredients: [] };
        }
        return state;
      },
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
