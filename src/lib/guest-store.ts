'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GuestCat } from '@/lib/domain/types';

type GuestState = {
  cat: GuestCat;
  /** 편집 중인 기존 cat의 id. null이면 신규 고양이(INSERT), 값이 있으면 그 프로필 UPDATE. */
  editingCatId: string | null;
  /**
   * 마이페이지 "프로필 수정" 모드. true면 기초정보만 고치고 "완료"로 저장(다음 단계 없음).
   * false면 사료추천 풀 플로우(다음 → 추천 받기). editingCatId(저장 대상)와는 별개 —
   * 기존 이용자가 랜딩 "시작하기"로 다시 추천을 받을 땐 editingCatId가 있어도 editMode=false.
   */
  editMode: boolean;
  demoMode: boolean;
  setCat: (patch: Partial<GuestCat>) => void;
  /**
   * 폼 초기화. keepEditingId:true면 editingCatId·editMode를 유지(온보딩 "비우기" —
   * 같은 프로필을 같은 모드로 덮어쓰기). 기본은 신규 추천 플로우로 리셋(editMode=false).
   */
  resetCat: (opts?: { keepEditingId?: boolean }) => void;
  setEditingCatId: (id: string | null) => void;
  setEditMode: (v: boolean) => void;
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
      editMode: false,
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
          editMode: opts?.keepEditingId ? s.editMode : false,
        })),
      setEditingCatId: (id) => set({ editingCatId: id }),
      setEditMode: (v) => set({ editMode: v }),
      setDemoMode: (v) => set({ demoMode: v }),
    }),
    {
      name: 'wg.guest',
      // v2: '피하고 싶은 성분' UI 제거 — 기존 localStorage에 남은 avoid_ingredients stale 값을
      //     비워 다음 온보딩 저장 때 추천/프로필에 반영되지 않게 한다. (컬럼·로직은 보존)
      // v3: 멀티 프로필 — editingCatId 추가(누락 시 null = 신규 입력으로 간주).
      // v4: editMode 분리 — 기존 persist에 남은 editingCatId가 추천 플로우의 "다음"을
      //     숨기던 회귀 수정. 누락 시 false = 추천 풀 플로우로 간주.
      version: 4,
      migrate: (persisted, fromVersion) => {
        const state = (persisted ?? {}) as {
          cat?: GuestCat;
          editingCatId?: string | null;
          editMode?: boolean;
          demoMode?: boolean;
        };
        if (fromVersion < 2 && state.cat) {
          state.cat = { ...state.cat, avoid_ingredients: [] };
        }
        if (fromVersion < 3) {
          state.editingCatId = null;
        }
        if (fromVersion < 4) {
          state.editMode = false;
        }
        return state;
      },
      storage: createJSONStorage(() => localStorage),
      // hero_image_preview(base64 dataURL, ~1.5MB)는 persist 제외 — localStorage
      // QuotaExceeded 방지. 이미지는 입력 세션 메모리에만 두고 저장 시 Storage 업로드.
      partialize: (s) => {
        const { hero_image_preview, ...cat } = s.cat;
        void hero_image_preview;
        return { cat, editingCatId: s.editingCatId, editMode: s.editMode, demoMode: s.demoMode };
      },
    },
  ),
);
