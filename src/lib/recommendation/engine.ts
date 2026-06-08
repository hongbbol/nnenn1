/**
 * 추천 엔진 오케스트레이터.
 *
 * 파이프라인(레지스트리 §4-4): 프로필 정규화 → 응급 체크 → hard 필터 →
 * 충돌 처리(우선 질환) → soft 채점 → TOP 2 선정 → 우선순위 박스·고지.
 */
import type { GuestCat, Food } from '@/lib/domain/types';
import { ageGroupFromBirthYear } from '@/lib/domain/constants';
import type { DiseaseMode, RecInput, RecResult } from './types';
import { filterFoods } from './filter';
import { scoreAll } from './scorer';
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

  // ④ soft 채점 + TOP 2.
  const scored = scoreAll(passed, input, primaryMode);
  const top = scored.slice(0, 2);

  return {
    input,
    primaryMode,
    safetyGate: highestSafetyGate(input),
    emergency,
    priorityOrder: buildPriorityOrder(input, primaryMode),
    top,
    excluded,
    notices: buildNotices(input, primaryMode),
  };
}

/** 프로필에서 바로 추천을 생성하는 편의 함수. */
export function recommendFromProfile(cat: GuestCat, foods: Food[]): RecResult | null {
  const input = toRecInput(cat);
  if (!input) return null;
  return recommend(input, foods);
}
