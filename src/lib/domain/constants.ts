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

export const NEUTERED_STATUS = ['완료', '안 함', '몰라요'] as const;
export type NeuteredStatus = (typeof NEUTERED_STATUS)[number];

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
  { id: '췌장염', desc: '저지방 필요' },
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
