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
import { carbGramsPer1000kcal, pctToGramsPer1000kcal, plausiblePhosphorusPct } from './nutrition';
import { WET_KCAL_MAX_PER_100G } from './delta';

/** 비교표 아래 단위 설명(페이지·히스토리 공통). */
export const COMPARISON_UNIT_NOTE =
  '단백질·지방·인 등은 열량 1,000 kcal당 g으로 환산해 건식·습식을 같은 기준으로 비교해요. 탄수화물은 라벨 값에서 계산한 추정치예요.';

export type ComparisonBaseline =
  | { source: 'db'; food: Food }
  | { source: 'text'; text: string }
  | { source: 'none' };

/**
 * 비교 지표 — 영양소는 **열량 1,000 kcal당 g(ME 기준)** 으로 환산한다(2026-10-28).
 * as-fed %로 나란히 놓으면 수분 때문에 건식·습식의 방향이 뒤집혀(습식 인 0.25% vs 건식 1.0%)
 * 추천 카드의 '지금 사료 대비'(delta.ts, ME 기준)와 모순이 생긴다. 수분·열량은 라벨 단위 그대로.
 * 히스토리에 저장된 과거 비교는 당시 unit 문자열을 그대로 들고 있으므로 영향 없다.
 */
const METRICS: ReadonlyArray<{
  key: string;
  label: string;
  unit: string;
  better: ComparisonMetric['better'];
  value: (food: Food) => number | null;
}> = [
  { key: 'protein_me', label: '단백질', unit: 'g/1000kcal', better: 'higher', value: (f) => me(f, f.protein_pct) },
  { key: 'fat_me', label: '지방', unit: 'g/1000kcal', better: 'neutral', value: (f) => me(f, f.fat_pct) },
  {
    key: 'carb_me',
    label: '탄수화물(추정)',
    unit: 'g/1000kcal',
    better: 'neutral',
    value: (f) =>
      carbGramsPer1000kcal({
        moisture: f.moisture_pct,
        protein: f.protein_pct,
        fat: f.fat_pct,
        ash: f.ash_pct,
        fiber: f.fiber_pct,
        kcalPer100g: usableKcal(f),
        category: f.category,
      }),
  },
  { key: 'moisture_pct', label: '수분', unit: '%', better: 'higher', value: (f) => f.moisture_pct },
  { key: 'phosphorus_me', label: '인(P)', unit: 'g/1000kcal', better: 'lower', value: (f) => me(f, plausiblePhosphorusPct(f)) },
  { key: 'sodium_me', label: '나트륨', unit: 'g/1000kcal', better: 'lower', value: (f) => me(f, f.sodium_pct) },
  {
    key: 'magnesium_me',
    label: '마그네슘',
    unit: 'mg/1000kcal',
    better: 'neutral',
    value: (f) => {
      const g = me(f, f.magnesium_pct);
      return g == null ? null : Math.round(g * 1000);
    },
  },
  { key: 'omega3_me', label: '오메가-3', unit: 'g/1000kcal', better: 'higher', value: (f) => me(f, f.omega3_pct) },
  { key: 'fiber_me', label: '식이섬유', unit: 'g/1000kcal', better: 'neutral', value: (f) => me(f, f.fiber_pct) },
  { key: 'kcal_per_100g', label: '열량', unit: 'kcal/100g', better: 'neutral', value: (f) => f.kcal_per_100g },
];

/** 습식 kcal/100g 상한 초과(단위 오류·오분류 의심)면 환산에 쓰지 않는다 — delta.ts와 같은 기준. */
function usableKcal(food: Food): number | null {
  const k = food.kcal_per_100g;
  if (k == null || k <= 0) return null;
  if (food.category === '습식' && k > WET_KCAL_MAX_PER_100G) return null;
  return k;
}

/** as-fed % → g/1000kcal, 소수 2자리. 결측·kcal 비정상이면 null. */
function me(food: Food, pct: number | null): number | null {
  const kcal = usableKcal(food);
  if (pct == null || kcal == null) return null;
  return Math.round(pctToGramsPer1000kcal(pct, kcal) * 100) / 100;
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
    key: m.key,
    label: m.label,
    unit: m.unit,
    baseline: baselineFood ? m.value(baselineFood) : null,
    values: candidates.map((c) => m.value(c)),
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
