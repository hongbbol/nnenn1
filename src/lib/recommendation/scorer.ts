/**
 * Soft 점수 (레지스트리 §0-2·§3-0).
 *
 * hard 게이트를 통과한 후보 안에서 desirability 순위를 매긴다. 모드별 1차 레버에
 * 최대 가중치를 둔다(§3-0). 점수의 "왜"는 ScoreReason으로 함께 반환한다.
 */
import type { Food } from '@/lib/domain/types';
import type { DiseaseMode, RecInput, ScoreReason, ScoredFood } from './types';
import {
  carbGramsPer1000kcal,
  phosphorusGramsPer1000kcal,
  proteinGramsPer1000kcal,
} from './nutrition';
import { CKD_PHOSPHORUS, DIABETES_CARB, KEYWORDS, matchesAny, URINARY_MOISTURE } from './rules';

/** 0~1 clamp. */
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** 값이 [lo,hi]에서 낮을수록 1, hi 위로는 0으로 떨어지는 점수. */
function lowerIsBetter(value: number, lo: number, hi: number): number {
  if (value <= lo) return 1;
  if (value >= hi) return 0;
  return clamp01(1 - (value - lo) / (hi - lo));
}

/** 값이 target 이상이면 1, floor 이하면 0. */
function higherIsBetter(value: number, floor: number, target: number): number {
  if (value >= target) return 1;
  if (value <= floor) return 0;
  return clamp01((value - floor) / (target - floor));
}

// 통제 어휘만 검출에 사용(자유 서술 ingredient_summary 제외 — filter.ts 주석 참조).
function hay(food: Food): string[] {
  return [...food.tags, ...food.ingredient_keywords].map((s) => s.toLowerCase());
}

type Lever = { score: number; weight: number; reason: ScoreReason | null };

/** CKD — 인 제한이 1차 레버. 범위 내에서 낮을수록 가점(§3-A). */
function ckdLever(food: Food, strict: boolean): Lever {
  const p = phosphorusGramsPer1000kcal(food.phosphorus_pct, food.kcal_per_100g);
  if (p == null) {
    return { score: 0.3, weight: 0.55, reason: { weight: 0.9, tone: 'warn', label: '인 데이터 없음 — 신뢰도 낮음' } };
  }
  const [lo, hi] = strict ? CKD_PHOSPHORUS.strict : CKD_PHOSPHORUS.idealRange;
  const s = lowerIsBetter(p, lo, CKD_PHOSPHORUS.maintenanceCeiling);
  const good = p <= hi;
  return {
    score: s,
    weight: 0.55,
    reason: {
      weight: 0.95,
      tone: good ? 'good' : 'warn',
      label: `인 ${p.toFixed(2)} g/1000kcal${good ? ' · 신장 부담 낮음' : ' · 다소 높음'}`,
    },
  };
}

/** 요로 — 수분/희석이 공통 1차 레버(§3-B). */
function moistureLever(food: Food, weight: number): Lever {
  const m = food.moisture_pct;
  if (m == null) return { score: 0.4, weight, reason: null };
  const s = higherIsBetter(m, 10, URINARY_MOISTURE.wetTarget);
  const wet = m >= URINARY_MOISTURE.wetTarget;
  return {
    score: s,
    weight,
    reason: {
      weight: 0.9,
      tone: 'good',
      label: wet ? `고수분 ${m}% · 소변 희석` : `수분 ${m}%`,
    },
  };
}

/** 당뇨 — 탄수(저) + 단백(고) (§3-E). */
function diabetesLevers(food: Food): Lever[] {
  const carb = carbGramsPer1000kcal({
    moisture: food.moisture_pct,
    protein: food.protein_pct,
    fat: food.fat_pct,
    ash: food.ash_pct,
    fiber: food.fiber_pct,
    kcalPer100g: food.kcal_per_100g,
  });
  const carbLever: Lever =
    carb == null
      ? { score: 0.3, weight: 0.45, reason: { weight: 0.85, tone: 'warn', label: '탄수 데이터 부족 — 신뢰도 낮음' } }
      : {
          score: lowerIsBetter(carb, 20, DIABETES_CARB.cap + 30),
          weight: 0.45,
          reason: {
            weight: 0.95,
            tone: carb <= DIABETES_CARB.target ? 'good' : 'warn',
            label: `탄수 ${carb.toFixed(0)} g/1000kcal${carb <= DIABETES_CARB.target ? ' · 저탄수' : ' · 높음'}`,
          },
        };
  return [carbLever, proteinLever(food, 0.3)];
}

/** 단백 가점(고단백 = 제지방 보존; 비만·당뇨·노령). */
function proteinLever(food: Food, weight: number): Lever {
  const p = proteinGramsPer1000kcal(food.protein_pct, food.kcal_per_100g);
  if (p == null) return { score: 0.4, weight, reason: null };
  const s = higherIsBetter(p, 60, 110);
  return {
    score: s,
    weight,
    reason:
      p >= 90 ? { weight: 0.7, tone: 'good', label: `고단백 ${p.toFixed(0)} g/1000kcal` } : null,
  };
}

/** 에너지 밀도. dir=low(감량) / high(증량·노령). */
function energyLever(food: Food, dir: 'low' | 'high', weight: number): Lever {
  const k = food.kcal_per_100g;
  if (k == null) return { score: 0.4, weight, reason: null };
  const s = dir === 'low' ? lowerIsBetter(k, 280, 420) : higherIsBetter(k, 300, 430);
  return {
    score: s,
    weight,
    reason:
      s > 0.6
        ? {
            weight: 0.6,
            tone: 'good',
            label: dir === 'low' ? `적정 칼로리 ${k} kcal/100g` : `에너지 밀도 ${k} kcal/100g`,
          }
        : null,
  };
}

/** IBD/췌장염/알레르기 — 단백 항원·소화율 전략(§3-C·D·H). */
function digestibilityLever(food: Food, weight: number): Lever {
  const h = hay(food);
  if (matchesAny(h, KEYWORDS.hydrolyzed)) {
    return { score: 1, weight, reason: { weight: 0.9, tone: 'good', label: '가수분해 단백 · 항원성 낮음' } };
  }
  if (matchesAny(h, KEYWORDS.novelProtein)) {
    return { score: 0.8, weight, reason: { weight: 0.8, tone: 'good', label: '신규 단백 · 미노출' } };
  }
  if (food.tags.map((t) => t.toLowerCase()).some((t) => t.includes('digest') || t.includes('소화'))) {
    return { score: 0.6, weight, reason: { weight: 0.6, tone: 'good', label: '고소화성 위장관식' } };
  }
  return { score: 0.3, weight, reason: null };
}

/** 오메가-3 공통 가점(노령·관절·항염). */
function omega3Lever(food: Food, weight: number): Lever {
  const o = food.omega3_pct;
  if (o == null || o <= 0) return { score: 0.3, weight, reason: null };
  const s = higherIsBetter(o, 0.1, 0.6);
  return {
    score: s,
    weight,
    reason: s > 0.5 ? { weight: 0.4, tone: 'good', label: '오메가-3 보강' } : null,
  };
}

/**
 * 임상 큐레이션 가점 (레지스트리 §5-1 준수).
 * 영양 점수는 0~88, 나머지 12점은 "이 질환·목표를 위해 큐레이션된 식인가"의 몫.
 * condition_fit은 브랜드가 아니라 임상 분류(ckd/diabetes/…)라 모든 브랜드에 균일 적용 →
 * 브랜드 중립성을 깨지 않으면서, 라벨 데이터로 못 잡는 처방식(요로 pH·RSS 등 §3-B 한계)을
 * 동급 영양식보다 위로 끌어올린다. 영양이 나쁘면(raw 낮음) 가점이 있어도 못 이긴다.
 */
const NUTRITION_MAX = 88;

const MODE_FIT_KEYS: Record<DiseaseMode, string[]> = {
  ckd_early: ['ckd'],
  ckd_12: ['ckd'],
  ckd_34: ['ckd'],
  diabetes: ['diabetes'],
  struvite: ['struvite'],
  oxalate: ['oxalate'],
  ibd: ['ibd', 'allergy'],
  pancreatitis: ['pancreatitis', 'ibd', 'allergy'],
};

function curationBonus(
  food: Food,
  input: RecInput,
  primaryMode: DiseaseMode | null,
): { bonus: number; reason: ScoreReason | null } {
  const fit = food.condition_fit.map((c) => c.toLowerCase());
  const mk = (label: string): ScoreReason => ({ weight: 0.85, tone: 'good', label });

  if (primaryMode) {
    const keys = MODE_FIT_KEYS[primaryMode];
    if (fit.some((f) => keys.includes(f))) return { bonus: 12, reason: mk('이 질환을 위해 설계된 관리식') };
    return { bonus: 0, reason: null };
  }
  if (input.goal === '체중관리 - 감량' || input.goal === '체중관리 - 증량') {
    return fit.includes('weight') ? { bonus: 12, reason: mk('체중관리 전용식') } : { bonus: 0, reason: null };
  }
  const senior = input.ageGroup === '11+' || input.ageGroup === '15+';
  if (senior && fit.includes('senior')) return { bonus: 8, reason: mk('노령 맞춤식') };
  return { bonus: 0, reason: null };
}

function aggregate(
  levers: Lever[],
  food: Food,
  curation: { bonus: number; reason: ScoreReason | null },
): ScoredFood {
  const active = levers.filter((l) => l.weight > 0);
  const wsum = active.reduce((s, l) => s + l.weight, 0) || 1;
  const raw = active.reduce((s, l) => s + l.score * l.weight, 0) / wsum;
  const score = Math.min(100, clamp01(raw) * NUTRITION_MAX + curation.bonus);
  const reasons = [...levers.map((l) => l.reason), curation.reason]
    .filter((r): r is ScoreReason => r != null)
    .sort((a, b) => b.weight - a.weight);
  const lowConfidence = reasons.some((r) => r.tone === 'warn' && r.label.includes('데이터'));
  return { food, score: Math.round(score), reasons, lowConfidence };
}

/**
 * 단일 후보를 주어진 primaryMode/goal 기준으로 채점.
 * primaryMode가 있으면 질환 1차 레버 중심, 없으면 goal(노령/체중) 중심.
 */
export function scoreFood(food: Food, input: RecInput, primaryMode: DiseaseMode | null): ScoredFood {
  const levers: Lever[] = [];
  const senior = input.ageGroup === '11+' || input.ageGroup === '15+';

  if (primaryMode === 'ckd_early' || primaryMode === 'ckd_12' || primaryMode === 'ckd_34') {
    levers.push(ckdLever(food, primaryMode === 'ckd_34'));
    levers.push(proteinLever(food, 0.15));
    levers.push(energyLever(food, 'high', 0.15));
    levers.push(omega3Lever(food, 0.15));
  } else if (primaryMode === 'struvite' || primaryMode === 'oxalate') {
    levers.push(moistureLever(food, 0.6));
    levers.push(proteinLever(food, 0.2));
    levers.push(omega3Lever(food, 0.2));
  } else if (primaryMode === 'diabetes') {
    levers.push(...diabetesLevers(food));
    levers.push(moistureLever(food, 0.25));
  } else if (primaryMode === 'ibd' || primaryMode === 'pancreatitis') {
    levers.push(digestibilityLever(food, 0.6));
    levers.push(proteinLever(food, 0.2));
    levers.push(omega3Lever(food, 0.2));
  } else {
    // 질환 없음 — goal 기반.
    if (input.goal === '체중관리 - 감량') {
      levers.push(energyLever(food, 'low', 0.45));
      levers.push(proteinLever(food, 0.4));
      levers.push(omega3Lever(food, 0.15));
    } else if (input.goal === '체중관리 - 증량') {
      levers.push(energyLever(food, 'high', 0.55));
      levers.push(proteinLever(food, 0.3));
      levers.push(omega3Lever(food, 0.15));
    } else {
      // 중노령 전환 / 질환관리(질환 없음) — 노령 단백-인 디커플링(§2).
      levers.push(proteinLever(food, 0.3));
      const p = phosphorusGramsPer1000kcal(food.phosphorus_pct, food.kcal_per_100g);
      if (senior && p != null) {
        levers.push({
          score: lowerIsBetter(p, 1.25, 2.5),
          weight: 0.3,
          reason:
            p <= 2.0 ? { weight: 0.8, tone: 'good', label: `저인 ${p.toFixed(2)} g/1000kcal · 신장 예방` } : null,
        });
      }
      levers.push(energyLever(food, 'high', 0.2));
      levers.push(omega3Lever(food, 0.2));
    }
  }

  return aggregate(levers, food, curationBonus(food, input, primaryMode));
}

/** 전체 통과 후보 채점 후 내림차순 정렬. */
export function scoreAll(
  foods: Food[],
  input: RecInput,
  primaryMode: DiseaseMode | null,
): ScoredFood[] {
  return foods
    .map((f) => scoreFood(f, input, primaryMode))
    .sort((a, b) => b.score - a.score || a.food.brand.localeCompare(b.food.brand));
}
