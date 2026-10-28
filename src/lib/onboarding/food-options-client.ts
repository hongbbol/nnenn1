import { fetchFoodOptions } from '@/app/onboarding/_actions';
import type { FoodOption } from '@/lib/recommendation/food-options';

/**
 * 사료 검색 옵션(DB foods, KR 유통 ~1,000행) 클라이언트 캐시 — 기본 정보 단계가 prefetch하고
 * 식단 단계가 같은 promise를 받는다. 사용자별 데이터가 아니라 무효화는 TTL(10분)만.
 * 실패·빈 결과는 캐시하지 않는다(다음 호출이 다시 시도; 화면은 그동안 시드 예시 옵션).
 */
const TTL_MS = 10 * 60_000;
let cached: { at: number; promise: Promise<FoodOption[]> } | null = null;

export function loadFoodOptions(): Promise<FoodOption[]> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.promise;
  const promise = fetchFoodOptions()
    .then((opts) => {
      if (opts.length === 0) cached = null;
      return opts;
    })
    .catch((e) => {
      console.error('[loadFoodOptions]', e);
      cached = null;
      return [] as FoodOption[];
    });
  cached = { at: Date.now(), promise };
  return promise;
}
