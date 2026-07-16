/**
 * 규칙 레지스트리 v1 — 정량 임계치 + 검출 사전.
 *
 * 모든 정량 목표는 per_1000kcal 단일 단위로 정규화한다(레지스트리 §0-1).
 * 인·나트륨은 g/1000kcal. 각 값에는 출처/강도 주석을 단다.
 */
import type { DiseaseMode, SafetyGate } from './types';

/** 모드별 안전 게이팅 등급(레지스트리 §1). */
export const SAFETY_GATE: Record<DiseaseMode, SafetyGate> = {
  ckd_early: 3,
  ckd_12: 3,
  ckd_34: 3,
  diabetes: 3,
  struvite: 2,
  oxalate: 2,
  ibd: 2,
  pancreatitis: 2,
};

/** CKD 인(P) 목표 — g/1000kcal (레지스트리 §3-A). */
export const CKD_PHOSPHORUS = {
  /** 이상 범위. 이 안에서 낮을수록 가점. */
  idealRange: [0.8, 1.35] as const,
  /** 일반 제한 목표 <1 g/1000kcal (WSAVA). */
  generalTarget: 1.0,
  /** 3-4기 더 엄격. */
  strict: [0.8, 1.0] as const,
  /** 총인 상한 — 초과 시 탈락/강감점 (건강묘도 손상 위험). */
  hardCap: 3.3,
  /** 유지식 경계 — 이 위는 신장 모드 부적합. */
  maintenanceCeiling: 1.5,
};

/** 당뇨 탄수 상한 — g/1000kcal (레지스트리 §3-E, <5 g/100kcal = 50 g/1000kcal). */
export const DIABETES_CARB = {
  target: 50,
  /** 강감점 경계. */
  cap: 50,
};

/** 요로 공통 — 수분(희석)이 1차 레버. 고수분 습식 강력 권장(레지스트리 §3-B). */
export const URINARY_MOISTURE = {
  /** 희석 효과가 충분한 수분%(as-fed). */
  wetTarget: 70,
};

/**
 * CKD 나트륨 적정 — g/1000kcal (레지스트리 §3-A: 0.5–1 적정, 고나트륨·초저나트륨(RAAS 자극)
 * 모두 회피. 근거 '약함·논쟁' — RC Academy·WSAVA 2018 → 보조 레버(저가중)로만).
 */
export const CKD_SODIUM = {
  idealLo: 0.5,
  idealHi: 1.0,
  /** 이 위로는 감점이 0에 수렴하는 상한. */
  cap: 2.5,
};

/** CKD 칼륨 보충 — g/1000kcal (레지스트리 §3-A: 1.4–2.6, IRIS 2023·WSAVA 2018, 근거 '중간'). */
export const CKD_POTASSIUM = {
  lo: 1.4,
  hi: 2.6,
};

/**
 * 요로 건식 나트륨 음수 유도 — g/1000kcal (레지스트리 §3-B: 3.0–3.3).
 * 근거는 동료심사(Queau 2020·PEANUT/Reynolds 2024)이나 둘 다 Royal Canin 관여 →
 * mfr_corroborated, '중간'(§5-1 정정). ⚠ CKD 동반 시 미적용 — Na 증량 대신 습식·음수 희석(§4 충돌 규칙).
 */
export const URINARY_DRY_SODIUM = {
  lo: 3.0,
  hi: 3.3,
};

/**
 * 원료 검출 사전(부록 A). 라벨 원료명/태그에서 기계적으로 플래그를 도출한다.
 * 시드 데이터에서는 food.tags 또는 food.ingredient_keywords에 아래 토큰을 넣어 표현.
 */
export const KEYWORDS = {
  /** A-1 Tier1 무기 인산염 첨가물 — CKD·노령 배제/강감점. */
  inorganicPhosphate: [
    'inorganic_phosphate',
    'sodium phosphate',
    'phosphoric acid',
    'potassium phosphate',
    'sodium tripolyphosphate',
    'sodium hexametaphosphate',
    '인산염',
    '인산나트륨',
    '인산',
  ],
  /** 산성화제 — struvite엔 의도적, oxalate엔 금기(레지스트리 §3-G). */
  acidifier: [
    'acidifier',
    'ammonium chloride',
    'dl-methionine',
    'methionine',
    'phosphoric acid',
    '염화암모늄',
    '메티오닌',
    '산성화',
  ],
  /** 첨가 단순당 — 당뇨·비만 배제. */
  addedSugar: [
    'added_sugar',
    'sucrose',
    'fructose',
    'dextrose',
    'corn syrup',
    'caramel',
    'molasses',
    '설탕',
    '당밀',
    '시럽',
  ],
  /** A-2 Tier1 하드 배제 독성(전 모드 공통). */
  toxic: [
    'propylene glycol',
    'propylene_glycol',
    '프로필렌글리콜',
    'onion',
    'garlic',
    'allium',
    '양파',
    '마늘',
    '부추',
    'xylitol',
    '자일리톨',
  ],
  /** 옥살산염 금기 — 비타민C 보충/크랜베리(레지스트리 §3-G). */
  oxalateAvoid: [
    'vitamin_c',
    'ascorbic acid',
    'ascorbate',
    'cranberry',
    '크랜베리',
    '아스코르브산',
    '비타민c',
  ],
  /** 알레르기·IBD 1차 단백 전략 태그. */
  hydrolyzed: ['hydrolyzed', 'hydrolysed', '가수분해'],
  novelProtein: ['novel', 'novel_protein', '신규단백'],
  /** 보조식·간식 — 주식단 후보 탈락(레지스트리 §0-3). */
  notStaple: ['complementary', 'treat', '보조식', '간식'],
  /** 반습식 제형 — 당뇨 배제. */
  semiMoist: ['semi_moist', 'semi-moist', '반습식'],
};

/** 흔한 식이 항원 한국어/영어 매핑(레지스트리 §3-C·D — 소고기·생선·닭·유제품). */
export const ALLERGEN_SYNONYMS: Record<string, string[]> = {
  닭: ['닭', 'chicken', '계육', '가금'],
  소고기: ['소고기', '소', 'beef', '우육'],
  생선: ['생선', '연어', '참치', '어류', 'fish', 'salmon', 'tuna'],
  유제품: ['유제품', '우유', 'dairy', 'milk', 'cheese'],
  곡물: ['곡물', '밀', '옥수수', 'grain', 'wheat', 'corn', 'gluten'],
  옥수수: ['옥수수', 'corn', 'maize'],
};

/** 텍스트(소문자)가 키워드 집합 중 하나라도 포함하는지. */
export function matchesAny(haystack: string[], needles: string[]): boolean {
  return haystack.some((h) => needles.some((n) => h.includes(n)));
}
