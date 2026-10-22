/** 사용자당 등록 가능한 고양이 프로필 최대 수. */
export const CAT_LIMIT = 2;

export const AGE_GROUPS = ['1+', '7+', '11+', '15+'] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const AGE_LABELS: Record<AgeGroup, string> = {
  '1+': '성묘',
  '7+': '중년',
  '11+': '고령',
  '15+': '초고령',
};

export const DIET_TYPES = ['건식', '습식', '혼합'] as const;
export type DietType = (typeof DIET_TYPES)[number];

/**
 * 추천 범위(제형 필터, 2026-10-22 사용자 결정). "주로 먹는 식단"(현재 급여 형태)과는 다른 질문 —
 * 습식을 못 먹이는 집·자동급식기 등 실제 제약용 하드 필터. '건식만'은 수분이 핵심인 모드(요로·CKD 3-4기·
 * 당뇨)와 감량 목표에서 경고 고지를 띄운다(엔진 selector.buildNotices).
 */
export const FORM_FILTERS = ['전체', '건식만', '습식만'] as const;
export type FormFilter = (typeof FORM_FILTERS)[number];
export const FORM_FILTER_OPTIONS: ReadonlyArray<{ id: FormFilter; desc: string }> = [
  { id: '전체', desc: '건식·습식 모두에서 가장 적합한 사료' },
  { id: '건식만', desc: '습식을 못 먹이는 경우 — 일부 질환은 경고가 표시돼요' },
  { id: '습식만', desc: '건식을 못 먹이는 경우' },
];

export const NEUTERED_STATUS = ['완료', '안 함', '몰라요'] as const;
export type NeuteredStatus = (typeof NEUTERED_STATUS)[number];

export const SEXES = ['여아', '남아'] as const;
export type Sex = (typeof SEXES)[number];

/** 묘종 드롭다운 목록(주요 묘종). 목록에 없으면 '기타(직접 입력)'로 자유 입력. */
export const CAT_BREEDS = [
  '코리안 숏헤어',
  '믹스(혼종)',
  '페르시안',
  '러시안 블루',
  '스코티시 폴드',
  '브리티시 숏헤어',
  '아메리칸 숏헤어',
  '벵갈',
  '먼치킨',
  '샴',
  '노르웨이 숲',
  '랙돌',
  '아비시니안',
  '메인쿤',
  '터키시 앙고라',
] as const;

export const GOALS = [
  '질환관리',
  '중노령 전환',
  '체중관리 - 감량',
  '체중관리 - 증량',
] as const;
export type Goal = (typeof GOALS)[number];

export const GOAL_OPTIONS: ReadonlyArray<{ id: Goal; desc: string }> = [
  { id: '질환관리', desc: '진단받은 질환을 우선 고려해드려요' },
  { id: '중노령 전환', desc: '나이에 맞는 부담이 적은 사료로' },
  { id: '체중관리 - 감량', desc: '저칼로리·고단백 사료 위주로' },
  { id: '체중관리 - 증량', desc: '에너지 밀도가 높은 사료 위주로' },
];

export type HealthOption = {
  readonly id: string;
  readonly desc?: string;
  /** 다른 모든 옵션과 동시 선택 불가 (예: '질병 없음') */
  readonly exclusive?: true;
  /** 같은 group은 한 번에 1개만 선택 가능 (예: 신부전 단계, 결석 종류) */
  readonly group?: string;
};

export const HEALTH_OPTIONS: ReadonlyArray<HealthOption> = [
  { id: '질병 없음', desc: '특별한 진단 없이 건강해요', exclusive: true },
  { id: '신부전 초기', desc: 'BUN/크레아티닌 가벼운 상승', group: 'kidney' },
  { id: '신부전 1-2기', desc: 'IRIS 1~2단계 · 조기 관리', group: 'kidney' },
  { id: '신부전 3-4기', desc: 'IRIS 3~4단계 · 치료식 필요', group: 'kidney' },
  { id: '당뇨', desc: '인슐린 또는 식이 조절' },
  { id: '결석-스트루바이트', desc: '용해 가능 · pH 산성화 사료', group: 'stone' },
  { id: '결석-옥살레이트', desc: '용해 불가 · 예방·관리 중심', group: 'stone' },
  { id: 'IBD', desc: '염증성 장 질환' },
  // 2026-10-20 사용자 확정(레지스트리 §3-H·ACVIM 2021): 고양이는 지방 제한 근거 없음 —
  // 고소화성/가수분해 단백 + 칼로리 확보가 1차. 급성은 수의사 진료(응급).
  { id: '췌장염', desc: '만성 · 소화 잘 되는 사료와 식욕 유지가 핵심' },
];

export const HEALTH_IDS = HEALTH_OPTIONS.map((o) => o.id) as ReadonlyArray<string>;

export const AVOID_INGREDIENTS_POPULAR = [
  '곡물',
  '닭',
  '소고기',
  '생선',
  '유제품',
  '옥수수',
] as const;

export const POPULAR_FOODS = [
  '데일리 인도어 어덜트',
  '내추럴 그레인프리',
  '시니어 라이트 어덜트',
  '키튼 포뮬러',
] as const;

export function ageGroupFromBirthYear(birthYear: number | undefined | null): {
  age: number;
  group: AgeGroup;
  label: string;
} | null {
  if (!birthYear) return null;
  const age = new Date().getFullYear() - birthYear;
  if (Number.isNaN(age) || age < 0 || age > 30) return null;
  let group: AgeGroup = '1+';
  if (age >= 15) group = '15+';
  else if (age >= 11) group = '11+';
  else if (age >= 7) group = '7+';
  return { age, group, label: AGE_LABELS[group] };
}
