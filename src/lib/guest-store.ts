'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GuestCat } from '@/lib/domain/types';

type GuestState = {
  cat: GuestCat;
  /** 편집 중인 기존 cat의 id. null이면 신규 고양이(INSERT), 값이 있으면 그 프로필 UPDATE. */
  editingCatId: string | null;
  demoMode: boolean;
  setCat: (patch: Partial<GuestCat>) => void;
  /** 폼 초기화. keepEditingId:true면 editingCatId는 유지(온보딩 "제거" — 같은 프로필 덮어쓰기). */
  resetCat: (opts?: { keepEditingId?: boolean }) => void;
  setEditingCatId: (id: string | null) => void;
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
      editingCatId: null,
      demoMode: false,
      setCat: (patch) =>
        set((s) => ({
          cat: { ...s.cat, ...patch },
        })),
      resetCat: (opts) =>
        set((s) => ({
          cat: INITIAL_CAT,
          demoMode: false,
          editingCatId: opts?.keepEditingId ? s.editingCatId : null,
        })),
      setEditingCatId: (id) => set({ editingCatId: id }),
      setDemoMode: (v) => set({ demoMode: v }),
    }),
    {
      name: 'wg.guest',
      // v2: '피하고 싶은 성분' UI 제거 — 기존 localStorage에 남은 avoid_ingredients stale 값을
      //     비워 다음 온보딩 저장 때 추천/프로필에 반영되지 않게 한다. (컬럼·로직은 보존)
      // v3: 멀티 프로필 — editingCatId 추가(누락 시 null = 신규 입력으로 간주).
      version: 3,
      migrate: (persisted, fromVersion) => {
        const state = (persisted ?? {}) as {
          cat?: GuestCat;
          editingCatId?: string | null;
          demoMode?: boolean;
        };
        if (fromVersion < 2 && state.cat) {
          state.cat = { ...state.cat, avoid_ingredients: [] };
        }
        if (fromVersion < 3) {
          state.editingCatId = null;
        }
        return state;
      },
      storage: createJSONStorage(() => localStorage),
      // hero_image_preview(base64 dataURL, ~1.5MB)는 persist 제외 — localStorage
      // QuotaExceeded 방지. 이미지는 입력 세션 메모리에만 두고 저장 시 Storage 업로드.
      partialize: (s) => {
        const { hero_image_preview, ...cat } = s.cat;
        void hero_image_preview;
        return { cat, editingCatId: s.editingCatId, demoMode: s.demoMode };
      },
    },
  ),
);
