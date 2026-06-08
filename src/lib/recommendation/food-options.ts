/**
 * 사료 선택용 경량 옵션 소스 (검색·표시 전용).
 *
 * 추천용 전체 `Food`가 아니라 UI에서 검색·렌더링에 필요한 필드만 노출한다.
 * 현재는 인메모리 `SEED_FOODS`에서 파생하지만, 나중에 DB `foods` 조회로 교체해도
 * `FoodOption`/`getFoodOptions` 시그니처를 유지해 컴포넌트는 그대로 쓴다.
 */
import { SEED_FOODS } from './foods-data';

export type FoodOption = {
  id: string;
  brand: string;
  productName: string;
  category: '건식' | '습식';
};

/** 활성 사료 옵션 목록. (향후 DB foods 조회로 교체 가능 — 시그니처 유지) */
export function getFoodOptions(): FoodOption[] {
  return SEED_FOODS.filter((f) => f.active).map((f) => ({
    id: f.id,
    brand: f.brand,
    productName: f.product_name,
    category: f.category,
  }));
}

/** 검색 결과 최대 노출 개수. */
export const FOOD_OPTION_RESULT_LIMIT = 8;

/**
 * 옵션을 검색어로 필터링. 소문자 부분일치(`brand + productName`).
 * 빈 쿼리는 빈 배열을 반환(드롭다운 미노출). 결과는 상위 N개로 cap.
 */
export function filterFoodOptions(
  options: FoodOption[],
  query: string,
  limit: number = FOOD_OPTION_RESULT_LIMIT,
): FoodOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: FoodOption[] = [];
  for (const o of options) {
    const hay = `${o.brand} ${o.productName}`.toLowerCase();
    if (hay.includes(q)) {
      out.push(o);
      if (out.length >= limit) break;
    }
  }
  return out;
}
