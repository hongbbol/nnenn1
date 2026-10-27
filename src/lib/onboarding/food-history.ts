import type { FoodOption } from '@/lib/recommendation/food-options';

/** 온보딩 식단 단계 칩의 재료 — 이 고양이의 저장 프로필 + 최근 추천 기록(최신순). */
export type FoodHistoryInput = {
  /** 저장된 프로필의 현재 사료(DB 연결 id 또는 자유 입력 텍스트). */
  savedCurrent: { foodId: string | null; text: string | null } | null;
  /** 최근 추천 행(최신순). `currentFood*`는 2026-10-27 이후 저장분에만 있다. */
  recommendations: {
    topFoodIds: string[];
    currentFoodId?: string | null;
    currentFoodText?: string | null;
  }[];
  /** id → 옵션(active 사료만). 비활성·삭제된 id는 여기 없어서 칩에서 빠진다. */
  optionsById: Map<string, FoodOption>;
};

export type CurrentFoodChip = { label: string; foodId: string | null };

export type FoodHistoryChips = {
  /** "지난번 먹인다고 입력한 사료" — 최신순, 중복 제거. */
  currentFoods: CurrentFoodChip[];
  /** 제외 후보 — 추천됐던 사료 + 입력했던 현재 사료(DB 연결분만). 최신순, 중복 제거. */
  excludeCandidates: FoodOption[];
};

export const FOOD_HISTORY_CHIP_LIMIT = 8;

function label(o: FoodOption): string {
  return `${o.brand} ${o.productName}`;
}

/**
 * 칩 목록을 만든다(순수 함수 — 서버 액션이 DB에서 모은 재료를 넣는다).
 * - 현재 사료 칩: 추천 시점 스냅샷(최신순) → 저장 프로필 순. DB 연결 id는 옵션 라벨로,
 *   자유 입력은 텍스트 그대로. 같은 id 또는 같은 텍스트는 한 번만.
 * - 제외 후보: 추천 TOP 사료(최신 추천부터) → 입력했던 현재 사료(id 있는 것만). 텍스트만 있는
 *   현재 사료는 제외 대상이 될 수 없어 빠진다(제외는 id 기준).
 */
export function buildFoodHistoryChips(input: FoodHistoryInput, limit = FOOD_HISTORY_CHIP_LIMIT): FoodHistoryChips {
  const { savedCurrent, recommendations, optionsById } = input;

  const currentSeen = new Set<string>();
  const currentFoods: CurrentFoodChip[] = [];
  const pushCurrent = (foodId: string | null | undefined, text: string | null | undefined) => {
    if (foodId) {
      const o = optionsById.get(foodId);
      if (!o || currentSeen.has(`id:${foodId}`)) return;
      currentSeen.add(`id:${foodId}`);
      currentFoods.push({ label: label(o), foodId });
      return;
    }
    const t = (text ?? '').trim();
    if (!t || currentSeen.has(`text:${t}`)) return;
    currentSeen.add(`text:${t}`);
    currentFoods.push({ label: t, foodId: null });
  };
  for (const r of recommendations) pushCurrent(r.currentFoodId, r.currentFoodText);
  if (savedCurrent) pushCurrent(savedCurrent.foodId, savedCurrent.text);

  const excludeSeen = new Set<string>();
  const excludeCandidates: FoodOption[] = [];
  const pushExclude = (id: string | null | undefined) => {
    if (!id || excludeSeen.has(id)) return;
    const o = optionsById.get(id);
    if (!o) return;
    excludeSeen.add(id);
    excludeCandidates.push(o);
  };
  for (const r of recommendations) for (const id of r.topFoodIds) pushExclude(id);
  for (const r of recommendations) pushExclude(r.currentFoodId);
  if (savedCurrent) pushExclude(savedCurrent.foodId);

  return {
    currentFoods: currentFoods.slice(0, limit),
    excludeCandidates: excludeCandidates.slice(0, limit),
  };
}
