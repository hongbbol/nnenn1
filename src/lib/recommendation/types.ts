import type { AgeGroup, Goal } from '@/lib/domain/constants';
import type { Food } from '@/lib/domain/types';

/** 엔진이 인식하는 질환 모드(규칙 레지스트리 §3). */
export type DiseaseMode =
  | 'ckd_early' // 신부전 초기/의심 (Stage 1 흡수)
  | 'ckd_12' // 신부전 1-2기
  | 'ckd_34' // 신부전 3-4기
  | 'diabetes' // 당뇨
  | 'struvite' // 결석-스트루바이트
  | 'oxalate' // 결석-옥살레이트
  | 'ibd' // IBD/만성 장병증
  | 'pancreatitis'; // 췌장염(만성)

/** 안전 게이팅 등급(레지스트리 §1). */
export type SafetyGate = 1 | 2 | 3;

/** 프로필 → 엔진 입력으로 정규화한 형태. */
export type RecInput = {
  name: string;
  ageGroup: AgeGroup;
  goal: Goal;
  /** 정규화된 질환 모드 목록. */
  diseases: DiseaseMode[];
  /** 알레르겐/회피 원료(소문자 키워드). */
  avoid: string[];
  /** 사용자가 추천에서 제외한 사료 id 목록. */
  excludeFoodIds: string[];
  dietPref: '건식' | '습식' | '혼합' | null;
};

/** 후보가 hard 게이트에서 탈락한 이유. */
export type ExclusionReason = {
  code: string;
  label: string;
};

/** soft 점수에 기여한 근거 한 줄(추천 카드의 "왜"). */
export type ScoreReason = {
  /** 우선순위 박스/카드 정렬용 가중치(0~1, 높을수록 중요). */
  weight: number;
  label: string;
  /** 긍정(가점) / 주의(감점·경고) / 중립 팩트(점수 무관 표시 보강) */
  tone: 'good' | 'warn' | 'info';
};

export type ScoredFood = {
  food: Food;
  /** 0~100 정규화 점수. */
  score: number;
  reasons: ScoreReason[];
  /** 데이터 부족으로 신뢰도가 낮은 추천(스키마 §5-3). */
  lowConfidence: boolean;
};

export type ExcludedFood = {
  food: Food;
  reasons: ExclusionReason[];
};

/** 추천 우선순위 박스 한 항목(레지스트리 §0-2 1차 레버 시각화). */
export type PriorityItem = {
  key: string;
  label: string;
  /** 0~1, 막대 길이. */
  weight: number;
  detail: string;
};

export type RecResult = {
  input: RecInput;
  /** 적용된 최우선(priority) 질환 모드. 없으면 목표 기반. */
  primaryMode: DiseaseMode | null;
  /** 가장 높은 안전 게이트(상담 톤 결정). */
  safetyGate: SafetyGate | null;
  /** 응급으로 모드 비활성된 경우. */
  emergency: boolean;
  priorityOrder: PriorityItem[];
  top: ScoredFood[];
  excluded: ExcludedFood[];
  /** 사용자에게 보여줄 상담/주의 고지 문장. */
  notices: string[];
};
