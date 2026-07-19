/**
 * 현재 먹이는 사료(baseline) vs 추천 사료들(candidates)의 영양소 비교.
 *
 * baseline은 세 가지: 'db'(foods에서 정확 매칭, 영양값 있음),
 * 'text'(자유입력 — 영양 데이터 없음), 'none'(현재 사료 미입력).
 * 'text'/'none'이면 baseline 열은 비어 추천 사료끼리 비교가 된다.
 */
import type {
  CatRow,
  ComparisonCandidate,
  ComparisonMetric,
  ComparisonResult,
  Food,
} from '@/lib/domain/types';

export type ComparisonBaseline =
  | { source: 'db'; food: Food }
  | { source: 'text'; text: string }
  | { source: 'none' };

const METRICS: ReadonlyArray<{
  key: keyof Food;
  label: string;
  unit: string;
  better: ComparisonMetric['better'];
}> = [
  { key: 'protein_pct', label: '단백질', unit: '%', better: 'higher' },
  { key: 'fat_pct', label: '지방', unit: '%', better: 'neutral' },
  { key: 'moisture_pct', label: '수분', unit: '%', better: 'higher' },
  { key: 'phosphorus_pct', label: '인(P)', unit: '%', better: 'lower' },
  { key: 'sodium_pct', label: '나트륨', unit: '%', better: 'lower' },
  { key: 'omega3_pct', label: '오메가-3', unit: '%', better: 'higher' },
  { key: 'fiber_pct', label: '식이섬유', unit: '%', better: 'neutral' },
  { key: 'kcal_per_100g', label: '열량', unit: 'kcal/100g', better: 'neutral' },
];

function num(food: Food, key: keyof Food): number | null {
  const v = food[key];
  return typeof v === 'number' ? v : null;
}

function toCandidate(food: Food): ComparisonCandidate {
  return {
    id: food.id,
    brand: food.brand,
    productName: food.product_name,
    category: food.category,
  };
}

/**
 * cat의 현재 사료 정보로 baseline을 결정.
 * current_food_id의 실제 사료는 호출부가 DB에서 조회해 `currentFood`로 넘긴다
 * (이 모듈은 순수 유지 — 서버 쿼리는 `@/lib/data/queries`의 `getFoodById`).
 */
export function resolveBaseline(cat: CatRow, currentFood: Food | null): ComparisonBaseline {
  if (cat.current_food_id && currentFood && currentFood.id === cat.current_food_id) {
    return { source: 'db', food: currentFood };
  }
  if (cat.current_food_text && cat.current_food_text.trim()) {
    return { source: 'text', text: cat.current_food_text.trim() };
  }
  return { source: 'none' };
}

export function buildComparison(
  baseline: ComparisonBaseline,
  candidates: Food[],
): ComparisonResult {
  const baselineFood = baseline.source === 'db' ? baseline.food : null;

  const metrics: ComparisonMetric[] = METRICS.map((m) => ({
    key: m.key as string,
    label: m.label,
    unit: m.unit,
    baseline: baselineFood ? num(baselineFood, m.key) : null,
    values: candidates.map((c) => num(c, m.key)),
    better: m.better,
  }));

  const label =
    baseline.source === 'db'
      ? `${baseline.food.brand} ${baseline.food.product_name}`
      : baseline.source === 'text'
        ? baseline.text
        : '현재 사료 정보 없음';

  return {
    baseline: {
      source: baseline.source,
      foodId: baselineFood?.id ?? null,
      label,
    },
    candidates: candidates.map(toCandidate),
    metrics,
  };
}
