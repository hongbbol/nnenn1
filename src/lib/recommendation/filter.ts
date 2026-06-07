/**
 * Hard 게이트 (레지스트리 §0-2·§0-3·§3-G).
 *
 * 점수를 매기기 전에 통과해야 하는 pass/fail 필터. 통과한 후보만 scorer로 넘어간다.
 * 순서: 주식 적합성 → 공통 독성 → 생애단계 → 알레르겐 → 질환별 배제.
 */
import type { Food } from '@/lib/domain/types';
import type { DiseaseMode, ExcludedFood, ExclusionReason, RecInput } from './types';
import { phosphorusGramsPer1000kcal } from './nutrition';
import { ALLERGEN_SYNONYMS, CKD_PHOSPHORUS, KEYWORDS, matchesAny } from './rules';

/**
 * 검출 대상 텍스트 풀(소문자) — 통제 어휘만 사용.
 * ingredient_summary(자유 서술)는 "비산성화"·"무첨가" 같은 부정 표현이 부분 문자열
 * 매칭을 깨뜨려 오탐을 내므로 제외한다(예: "비산성화" ∋ "산성화"). 표시 전용 필드다.
 */
function haystack(food: Food): string[] {
  const pool = [...food.tags, ...food.ingredient_keywords, food.form ?? ''];
  return pool.map((s) => s.toLowerCase());
}

/** 알레르겐 회피 토큰을 동의어까지 확장. */
function expandAvoid(avoid: string[]): string[] {
  const out = new Set<string>();
  for (const a of avoid) {
    const key = a.trim();
    out.add(key.toLowerCase());
    const syn = ALLERGEN_SYNONYMS[key];
    if (syn) syn.forEach((s) => out.add(s.toLowerCase()));
  }
  return [...out];
}

const CKD_MODES: DiseaseMode[] = ['ckd_early', 'ckd_12', 'ckd_34'];

/**
 * 단일 후보를 하드 게이트에 통과시킨다.
 * @returns 탈락 사유 배열(비어 있으면 통과).
 */
export function gateFood(food: Food, input: RecInput): ExclusionReason[] {
  const reasons: ExclusionReason[] = [];
  const hay = haystack(food);

  // 0. 주식(staple) 적합성 — 보조식·간식은 주식단 추천에서 탈락(§0-3).
  if (matchesAny(hay, KEYWORDS.notStaple)) {
    reasons.push({ code: 'not_staple', label: '보조식·간식 (주식단 아님)' });
  }

  // 1. 공통 독성 — 전 모드 하드 배제(§A-2 Tier1).
  if (matchesAny(hay, KEYWORDS.toxic)) {
    reasons.push({ code: 'toxic', label: '고양이 부적합 성분 포함' });
  }

  // 2. 생애단계 적합성 — age_fit에 해당 연령대 없으면 탈락(§0-3).
  if (food.age_fit.length > 0 && !food.age_fit.includes(input.ageGroup)) {
    reasons.push({ code: 'life_stage', label: `${input.ageGroup} 연령대 부적합` });
  }

  // 3. 식이 알레르기 — 원인 단백 포함 시 절대 탈락(§4-1, 최우선 hard).
  const avoid = expandAvoid(input.avoid);
  if (avoid.length > 0 && matchesAny(hay, avoid)) {
    const hit = input.avoid.find((a) =>
      matchesAny(hay, [a.toLowerCase(), ...(ALLERGEN_SYNONYMS[a] ?? []).map((s) => s.toLowerCase())]),
    );
    reasons.push({ code: 'allergen', label: `회피 원료 포함: ${hit ?? '알레르겐'}` });
  }

  // 4. 질환별 배제(§3-G).
  const diseases = input.diseases;

  // CKD — 무기 인산염 첨가물 또는 총인 상한 초과 → 탈락.
  if (diseases.some((d) => CKD_MODES.includes(d))) {
    if (matchesAny(hay, KEYWORDS.inorganicPhosphate)) {
      reasons.push({ code: 'ckd_phosphate_additive', label: '무기 인산염 첨가물 (신장 부담)' });
    }
    const p = phosphorusGramsPer1000kcal(food.phosphorus_pct, food.kcal_per_100g);
    if (p != null && p > CKD_PHOSPHORUS.hardCap) {
      reasons.push({ code: 'ckd_high_p', label: `총인 과다 (${p.toFixed(1)} g/1000kcal)` });
    }
  }

  // 요로 옥살레이트 — 산성화제·비타민C 보충·크랜베리 금기 → 탈락(§3-G).
  if (diseases.includes('oxalate')) {
    if (matchesAny(hay, KEYWORDS.acidifier)) {
      reasons.push({ code: 'oxalate_acidifier', label: '산성화제 첨가 (옥살레이트 금기)' });
    }
    if (matchesAny(hay, KEYWORDS.oxalateAvoid)) {
      reasons.push({ code: 'oxalate_vitc', label: '비타민C·크랜베리 (옥살산 전구체)' });
    }
  }

  // 당뇨 — 반습식·첨가 단순당 → 탈락(§3-E).
  if (diseases.includes('diabetes')) {
    if (matchesAny(hay, KEYWORDS.semiMoist)) {
      reasons.push({ code: 'diabetes_semi_moist', label: '반습식 제형 (혈당 급상승)' });
    }
    if (matchesAny(hay, KEYWORDS.addedSugar)) {
      reasons.push({ code: 'diabetes_sugar', label: '첨가 단순당 포함' });
    }
  }

  return reasons;
}

/** 전체 후보를 통과/탈락으로 분리. */
export function filterFoods(
  foods: Food[],
  input: RecInput,
): { passed: Food[]; excluded: ExcludedFood[] } {
  const passed: Food[] = [];
  const excluded: ExcludedFood[] = [];
  for (const food of foods) {
    if (!food.active) continue;
    const reasons = gateFood(food, input);
    if (reasons.length === 0) passed.push(food);
    else excluded.push({ food, reasons });
  }
  return { passed, excluded };
}
