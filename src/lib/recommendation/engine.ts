/**
 * 추천 엔진 오케스트레이터.
 *
 * 파이프라인(레지스트리 §4-4): 프로필 정규화 → 응급 체크 → hard 필터 →
 * 충돌 처리(우선 질환) → soft 채점 → TOP 2 선정 → 우선순위 박스·고지.
 */
import type { GuestCat, Food } from '@/lib/domain/types';
import { ageGroupFromBirthYear } from '@/lib/domain/constants';
import type { DiseaseMode, RecInput, RecResult, ScoredFood } from './types';
import { filterFoods } from './filter';
import { relativeReason, scoreAll } from './scorer';
import {
  buildNotices,
  buildPriorityOrder,
  highestSafetyGate,
  resolvePrimaryMode,
} from './selector';

/** UI 건강 옵션 id → 엔진 질환 모드. '질병 없음'·미지원 항목은 무시. */
const CONDITION_TO_MODE: Record<string, DiseaseMode> = {
  '신부전 초기': 'ckd_early',
  '신부전 1-2기': 'ckd_12',
  '신부전 3-4기': 'ckd_34',
  당뇨: 'diabetes',
  '결석-스트루바이트': 'struvite',
  '결석-옥살레이트': 'oxalate',
  IBD: 'ibd',
  췌장염: 'pancreatitis',
};

/** GuestCat / CatProfile → 엔진 입력으로 정규화. 필수 필드 누락 시 null. */
export function toRecInput(cat: GuestCat): RecInput | null {
  const ag = ageGroupFromBirthYear(cat.birth_year);
  if (!ag || !cat.goal) return null;

  const diseases: DiseaseMode[] = [];
  for (const c of cat.health_conditions ?? []) {
    const mode = CONDITION_TO_MODE[c];
    if (mode && !diseases.includes(mode)) diseases.push(mode);
  }

  return {
    name: cat.name?.trim() || '우리 아이',
    ageGroup: ag.group,
    goal: cat.goal,
    diseases,
    // '피하고 싶은 성분' UI는 제거됨 — 현재 avoid는 항상 비움. (레거시 cat.avoid_ingredients의
    // stale 값이 추천에 반영되지 않도록 여기서 차단.) 알레르겐 하드 게이트(filter.ts)·우선순위
    // 박스(selector.ts)·동의어(ingredient-synonyms)는 그대로 보존 — 추후 '알러지' 질환 옵션을
    // 추가하면 이 줄에서 해당 소스로 avoid 토큰을 채워 재사용한다.
    avoid: [],
    excludeFoodIds: cat.exclude_food_ids ?? [],
    dietPref: cat.diet_type ?? null,
  };
}

/** 프로필이 추천을 돌릴 만큼 충분한지. */
export function isProfileReady(cat: GuestCat): boolean {
  return toRecInput(cat) !== null;
}

/** 메인 엔진. 정규화된 입력 + 후보 사료로 결과를 만든다. */
export function recommend(input: RecInput, foods: Food[]): RecResult {
  // ① 응급 체크 — 현재 UI는 만성 질환만 수집하므로 응급 진입점 없음(급성 췌장염 미수집).
  const emergency = false;

  // ③ hard 필터.
  const { passed, excluded } = filterFoods(foods, input);

  // ② 충돌 처리 — 우선 질환 결정.
  const primaryMode = resolvePrimaryMode(input);

  // ④ soft 채점.
  const scored = scoreAll(passed, input, primaryMode);

  // ⑤ 데이터 충분성(스키마 §5-3·레지스트리 §3-0): CKD·당뇨는 핵심 레버(인·탄수) 결측 후보를
  // 상위에 노출하지 않는다 — 신뢰 가능한 후보가 2개 이상이면 결측 후보는 뒤로, 3-4기는 아예 보류.
  const { pool, heldCount } = applySufficiencyHold(scored, primaryMode);

  // ⑥ TOP 2 — 다양성 휴리스틱(dev-plan §4.5): 2위는 1위와 제형·브랜드가 다른 후보 우선.
  const top = pickTopDiverse(pool);

  // TOP 카드에 상대비교 설명 부여 — 통과 후보군 대비 1차 지표 상위 %(카드 "왜" 보강).
  for (const t of top) {
    const rel = relativeReason(t.food, passed, primaryMode);
    if (rel) {
      t.reasons.push(rel);
      t.reasons.sort((a, b) => b.weight - a.weight);
    }
  }

  return {
    input,
    primaryMode,
    safetyGate: highestSafetyGate(input),
    emergency,
    priorityOrder: buildPriorityOrder(input, primaryMode),
    top,
    excluded,
    notices: buildNotices(input, primaryMode, { heldCount }),
  };
}

const DATA_DRIVEN_MODES: ReadonlySet<DiseaseMode> = new Set(['ckd_early', 'ckd_12', 'ckd_34', 'diabetes']);

/**
 * 데이터 부족 후보 보류/후순위. 반환 pool은 점수순을 유지하되 lowConfidence를 뒤로 보낸다.
 * - ckd_34: 인 결측 후보는 추천 자체에서 보류(heldCount로 고지) — "3-4기 인 데이터 결측 → 보류"(§3-A).
 * - ckd_early/12·diabetes: 신뢰 후보가 2개 이상이면 결측 후보는 뒤로. 1개 이하면 그대로(빈 결과 방지).
 */
export function applySufficiencyHold(
  scored: ScoredFood[],
  primaryMode: DiseaseMode | null,
): { pool: ScoredFood[]; heldCount: number } {
  if (!primaryMode || !DATA_DRIVEN_MODES.has(primaryMode)) return { pool: scored, heldCount: 0 };
  const confident = scored.filter((s) => !s.lowConfidence);
  const low = scored.filter((s) => s.lowConfidence);
  if (primaryMode === 'ckd_34') return { pool: confident, heldCount: low.length };
  if (confident.length >= 2) return { pool: [...confident, ...low], heldCount: 0 };
  return { pool: scored, heldCount: 0 };
}

/** 2위 후보가 1위 대비 이 비율 미만이면 다양성보다 점수를 우선(dev-plan §4.5 "30%+ 차이"). */
const DIVERSITY_SCORE_FLOOR = 0.7;

/**
 * TOP 2 선정 — 1위는 최고점. 2위는 ① 제형·브랜드 모두 다른 후보 ② 브랜드만 다른 후보 ③ 차순위 순으로,
 * 단 1위 점수의 70% 이상일 때만 다양성 후보를 채택한다. 실데이터에서 같은 브랜드 형제 제품
 * (젤리/그레이비 파우치)이 1·2위를 동시에 차지하던 문제(2026-10-20 검토) 대응.
 */
export function pickTopDiverse(pool: ScoredFood[]): ScoredFood[] {
  if (pool.length === 0) return [];
  const first = pool[0];
  if (pool.length === 1) return [first];
  const floor = first.score * DIVERSITY_SCORE_FLOOR;
  const rest = pool.slice(1);
  const otherBrand = (s: ScoredFood) => s.food.brand !== first.food.brand;
  const otherForm = (s: ScoredFood) => s.food.category !== first.food.category;
  const second =
    rest.find((s) => s.score >= floor && otherBrand(s) && otherForm(s)) ??
    rest.find((s) => s.score >= floor && otherBrand(s)) ??
    rest[0];
  return [first, second];
}

/** 프로필에서 바로 추천을 생성하는 편의 함수. */
export function recommendFromProfile(cat: GuestCat, foods: Food[]): RecResult | null {
  const input = toRecInput(cat);
  if (!input) return null;
  return recommend(input, foods);
}
