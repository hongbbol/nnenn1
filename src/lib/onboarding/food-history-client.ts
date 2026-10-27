import { fetchCatFoodHistory } from '@/app/onboarding/_actions';
import type { FoodHistoryChips } from './food-history';

const EMPTY: FoodHistoryChips = { currentFoods: [], excludeCandidates: [] };

/** 같은 플로우 안에서는 한 번만 부른다 — 기본 정보 단계에서 미리 불러 두면 식단 단계에선 즉시 뜬다. */
const TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; promise: Promise<FoodHistoryChips> }>();

/**
 * 이 고양이의 기록 칩(지난 입력 사료·제외 후보)을 가져온다. 클라이언트 모듈 캐시(5분) —
 * 기본 정보 단계가 prefetch하고 식단 단계가 같은 promise를 받는다. 실패하면 빈 칩(화면은 예시 칩으로).
 */
export function loadCatFoodHistory(catId: string | null | undefined): Promise<FoodHistoryChips> {
  if (!catId) return Promise.resolve(EMPTY);
  const hit = cache.get(catId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  const promise = fetchCatFoodHistory(catId).catch((e) => {
    console.error('[loadCatFoodHistory]', e);
    cache.delete(catId);
    return EMPTY;
  });
  cache.set(catId, { at: Date.now(), promise });
  return promise;
}

/** 추천 저장 뒤 호출 — 방금 받은 추천·입력한 사료가 다음 플로우의 칩에 바로 반영되게. */
export function invalidateCatFoodHistory(catId?: string | null): void {
  if (catId) cache.delete(catId);
  else cache.clear();
}
