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
  mineralGramsPer1000kcal,
  phosphorusGramsPer1000kcal,
  proteinGramsPer1000kcal,
} from './nutrition';
import {
  CKD_PHOSPHORUS,
  CKD_POTASSIUM,
  CKD_SODIUM,
  DIABETES_CARB,
  fitMatches,
  KEYWORDS,
  matchesAny,
  URINARY_DRY_SODIUM,
  URINARY_MOISTURE,
} from './rules';

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

/**
 * 비활성 레버 — 미네랄 결측 시 중립 점수 대신 가중치 0으로 제외한다.
 * Na/K/EPA+DHA는 보조 레버라 결측=무시(가중 재분배)가 온당하고(스키마 §1-3 임의 추정 금지),
 * 데이터가 없는 기존 후보의 점수·순위를 흔들지 않는다. (핵심 레버 결측은 각 lever가 warn 처리.)
 */
const INACTIVE: Lever = { score: 0, weight: 0, reason: null };

/** CKD 나트륨 — 0.5–1 g/1000kcal 적정, 고·초저 회피(§3-A, 근거 약함 → 저가중 보조). */
function ckdSodiumLever(food: Food, weight: number): Lever {
  const na = mineralGramsPer1000kcal(food.sodium_pct, food.kcal_per_100g);
  if (na == null) return INACTIVE;
  let score: number;
  let reason: ScoreReason | null = null;
  if (na >= CKD_SODIUM.idealLo && na <= CKD_SODIUM.idealHi) {
    score = 1;
    reason = { weight: 0.5, tone: 'good', label: `나트륨 적정 ${na.toFixed(2)} g/1000kcal` };
  } else if (na < CKD_SODIUM.idealLo) {
    // 초저나트륨(RAAS 자극) — 소폭 감점만.
    score = 0.5;
  } else {
    score = lowerIsBetter(na, CKD_SODIUM.idealHi, CKD_SODIUM.cap);
    if (na > 1.8) reason = { weight: 0.6, tone: 'warn', label: `나트륨 다소 높음 ${na.toFixed(2)} g/1000kcal` };
  }
  return { score, weight, reason };
}

/** CKD 칼륨 — 1.4–2.6 g/1000kcal 보충 가점(§3-A, IRIS 2023 근거 중간). */
function ckdPotassiumLever(food: Food, weight: number): Lever {
  const k = mineralGramsPer1000kcal(food.potassium_pct, food.kcal_per_100g);
  if (k == null) return INACTIVE;
  const inRange = k >= CKD_POTASSIUM.lo && k <= CKD_POTASSIUM.hi;
  const score = inRange
    ? 1
    : k < CKD_POTASSIUM.lo
      ? higherIsBetter(k, 0.8, CKD_POTASSIUM.lo)
      : lowerIsBetter(k, CKD_POTASSIUM.hi, 4);
  return {
    score,
    weight,
    reason: inRange ? { weight: 0.5, tone: 'good', label: `칼륨 ${k.toFixed(1)} g/1000kcal · 보충 적정` } : null,
  };
}

/**
 * 요로 건식 나트륨 음수 유도 — 3.0–3.3 g/1000kcal(§3-B, 제조사 관여 근거 '중간').
 * ⚠ CKD 동반이면 미적용(Na 증량 대신 습식 희석 — §4 충돌 규칙). 습식도 미적용(수분 레버 몫).
 */
function urinaryDrySodiumLever(food: Food, input: RecInput, weight: number): Lever {
  const hasCkd = input.diseases.some((d) => d === 'ckd_early' || d === 'ckd_12' || d === 'ckd_34');
  if (hasCkd || food.category !== '건식') return INACTIVE;
  const na = mineralGramsPer1000kcal(food.sodium_pct, food.kcal_per_100g);
  if (na == null) return INACTIVE;
  const inRange = na >= URINARY_DRY_SODIUM.lo && na <= URINARY_DRY_SODIUM.hi;
  const score = inRange
    ? 1
    : na < URINARY_DRY_SODIUM.lo
      ? higherIsBetter(na, 1.0, URINARY_DRY_SODIUM.lo) * 0.8
      : lowerIsBetter(na, URINARY_DRY_SODIUM.hi, 4.5);
  return {
    score,
    weight,
    reason: inRange
      ? { weight: 0.6, tone: 'good', label: `나트륨 ${na.toFixed(1)} g/1000kcal · 음수 유도 설계` }
      : null,
  };
}

/** 노령 나트륨 과량 회피(§2-8: 잠재 CKD·고혈압 고려) — 보조 감점. */
function seniorSodiumLever(food: Food, weight: number): Lever {
  const na = mineralGramsPer1000kcal(food.sodium_pct, food.kcal_per_100g);
  if (na == null) return INACTIVE;
  const score = lowerIsBetter(na, 1.5, 3.5);
  return {
    score,
    weight,
    reason: na > 2.5 ? { weight: 0.5, tone: 'warn', label: `나트륨 높음 ${na.toFixed(1)} g/1000kcal` } : null,
  };
}

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

/**
 * 오메가-3 공통 가점(노령·관절·항염).
 * EPA+DHA 분리값 우선 — 고양이는 ALA→EPA/DHA 전환 불가라 총 오메가3(ALA 포함)보다
 * 강한 신호(스키마 §영양, Rivers 1975). 없으면 기존 총 오메가3 fallback(동작 불변).
 */
function omega3Lever(food: Food, weight: number): Lever {
  const ed = food.epa_dha_pct;
  if (ed != null && ed > 0) {
    const s = higherIsBetter(ed, 0.05, 0.3);
    return {
      score: s,
      weight,
      reason: s > 0.5 ? { weight: 0.5, tone: 'good', label: `EPA+DHA ${ed}% 보강` } : null,
    };
  }
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
  // 별칭 매칭(rules.CONDITION_ALIASES) — 시드('ckd')와 nnenn2 ETL 한글 라벨('신부전 1-2기') 모두 흡수.
  const fit = food.condition_fit.map((c) => c.toLowerCase());
  const mk = (label: string): ScoreReason => ({ weight: 0.85, tone: 'good', label });

  if (primaryMode) {
    const keys = MODE_FIT_KEYS[primaryMode];
    if (keys.some((k) => fitMatches(fit, k))) return { bonus: 12, reason: mk('이 질환을 위해 설계된 관리식') };
    return { bonus: 0, reason: null };
  }
  if (input.goal === '체중관리 - 감량' || input.goal === '체중관리 - 증량') {
    return fitMatches(fit, 'weight') ? { bonus: 12, reason: mk('체중관리 전용식') } : { bonus: 0, reason: null };
  }
  const senior = input.ageGroup === '11+' || input.ageGroup === '15+';
  if (senior && fitMatches(fit, 'senior')) return { bonus: 8, reason: mk('노령 맞춤식') };
  return { bonus: 0, reason: null };
}

/**
 * 카드에 보장할 최소 설명 수(warn 제외).
 * 레버 reason은 임계값 초과 시에만 생기므로(실데이터는 값 평범·결측이 흔함) 그대로 두면
 * 카드가 비는 경우가 많다 — 임계 미달이어도 라벨 팩트를 중립 톤으로 서술해 채운다(§5-3).
 */
const MIN_REASONS = 3;

/** 팩트 서술형 보강 설명 — 점수와 무관한 라벨 사실만, 기존 설명과 주제 중복 없이. */
function factReasons(food: Food, existing: ScoreReason[]): ScoreReason[] {
  const has = (kw: string) => existing.some((r) => r.label.includes(kw));
  const out: ScoreReason[] = [];
  const push = (label: string) => out.push({ weight: 0.25, tone: 'info', label });

  const p = proteinGramsPer1000kcal(food.protein_pct, food.kcal_per_100g);
  if (p != null && !has('단백')) push(`단백질 ${p.toFixed(0)} g/1000kcal`);
  if (food.moisture_pct != null && !has('수분')) {
    push(
      food.category === '습식'
        ? `습식 · 수분 ${food.moisture_pct}%로 음수 보충`
        : `수분 ${food.moisture_pct}%`,
    );
  }
  if (food.kcal_per_100g != null && !has('kcal')) push(`${food.kcal_per_100g} kcal/100g`);
  const ph = phosphorusGramsPer1000kcal(food.phosphorus_pct, food.kcal_per_100g);
  if (ph != null && !has('인 ')) push(`인 ${ph.toFixed(2)} g/1000kcal`);
  if (food.kr_available) push('한국에서 구매 가능');
  return out;
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
  const informative = reasons.filter((r) => r.tone !== 'warn').length;
  if (informative < MIN_REASONS) {
    reasons.push(...factReasons(food, reasons).slice(0, MIN_REASONS - informative));
  }
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
    // 보조 미네랄 레버(§3-A) — 데이터 있을 때만 활성(결측=INACTIVE, 기존 순위 보존).
    levers.push(ckdSodiumLever(food, 0.1));
    levers.push(ckdPotassiumLever(food, 0.1));
  } else if (primaryMode === 'struvite' || primaryMode === 'oxalate') {
    levers.push(moistureLever(food, 0.6));
    levers.push(proteinLever(food, 0.2));
    levers.push(omega3Lever(food, 0.2));
    // 건식 한정 나트륨 음수 유도(§3-B) — CKD 동반 시 자체 비활성(§4 충돌).
    levers.push(urinaryDrySodiumLever(food, input, 0.15));
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
      // 노령 나트륨 과량 회피(§2-8) — 데이터 있을 때만.
      if (senior) levers.push(seniorSodiumLever(food, 0.1));
    }
  }

  return aggregate(levers, food, curationBonus(food, input, primaryMode));
}

/**
 * 상대비교 설명 — 통과 후보군 안에서 모드의 1차 지표 기준 상위 몇 %인지.
 * TOP 카드에만 붙인다(engine). 상위 절반 안일 때만 반환(하위권 홍보 금지),
 * 후보가 5개 미만이면 백분위가 무의미해 생략.
 */
export function relativeReason(
  food: Food,
  pool: Food[],
  primaryMode: DiseaseMode | null,
): ScoreReason | null {
  if (pool.length < 5) return null;

  let value: (f: Food) => number | null;
  let lowerBetter: boolean;
  let name: string;
  if (primaryMode === 'ckd_early' || primaryMode === 'ckd_12' || primaryMode === 'ckd_34') {
    value = (f) => phosphorusGramsPer1000kcal(f.phosphorus_pct, f.kcal_per_100g);
    lowerBetter = true;
    name = '인이 낮은';
  } else if (primaryMode === 'struvite' || primaryMode === 'oxalate') {
    value = (f) => f.moisture_pct;
    lowerBetter = false;
    name = '수분이 높은';
  } else if (primaryMode === 'diabetes') {
    value = (f) =>
      carbGramsPer1000kcal({
        moisture: f.moisture_pct,
        protein: f.protein_pct,
        fat: f.fat_pct,
        ash: f.ash_pct,
        fiber: f.fiber_pct,
        kcalPer100g: f.kcal_per_100g,
      });
    lowerBetter = true;
    name = '탄수가 낮은';
  } else {
    value = (f) => proteinGramsPer1000kcal(f.protein_pct, f.kcal_per_100g);
    lowerBetter = false;
    name = '단백질이 높은';
  }

  const mine = value(food);
  if (mine == null) return null;
  const values = pool.map(value).filter((v): v is number => v != null);
  if (values.length < 5) return null;
  const betterCount = values.filter((v) => (lowerBetter ? v < mine : v > mine)).length;
  const pct = Math.max(1, Math.ceil(((betterCount + 1) / values.length) * 100));
  if (pct > 50) return null;
  return {
    weight: 0.45,
    tone: 'info',
    label: `통과 후보 ${values.length}개 중 ${name} 상위 ${pct}%`,
  };
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
