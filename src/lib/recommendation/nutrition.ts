/**
 * 영양소 환산 — 데이터 스키마 v1 §3.
 *
 * 라벨값(as-fed %)을 비교 가능한 공통 기준으로 환산한다.
 * - DMB(건물기준): 습식 vs 건식 직접 비교용
 * - per_1000kcal: AAFCO·FEDIAF·임상 기준과 직접 대조 (스코어링 1차 단위)
 *
 * ⚠ 단위 정합(스키마 §2-1): 규칙 레지스트리의 인·나트륨·칼륨 목표는 g/1000kcal.
 * 여기서 다량영양소는 g/1000kcal, 비교 직전 단위를 단일화한다. CKD 인 비교에서
 * g↔mg 혼동은 1000× 오류 → 치명적이므로 함수명에 단위를 명시한다.
 */

/** 건물기준(DMB) 환산. N_dmb = N_af × 100 / (100 − moisture). */
export function toDmbPct(asFedPct: number, moisturePct: number): number {
  const dm = 100 - moisturePct;
  if (dm <= 0) return asFedPct;
  return (asFedPct * 100) / dm;
}

/**
 * % 단위 영양소(단백·지방·인 등) → g / 1000 kcal ME.
 * N_g/1000kcal = N_af(%) × 10000 / ME(kcal/kg). ME(kcal/kg) = kcalPer100g × 10.
 * ⇒ N_af(%) × 1000 / kcalPer100g.
 */
export function pctToGramsPer1000kcal(asFedPct: number, kcalPer100g: number): number {
  if (kcalPer100g <= 0) return 0;
  return (asFedPct * 1000) / kcalPer100g;
}

/** g/1000kcal → mg/1000kcal (미네랄 비교 단위). */
export function gramsToMgPer1000kcal(grams: number): number {
  return grams * 1000;
}

/** 회분 라벨 결측 시 제형별 기본값(as-fed %). 습식은 수분 때문에 as-fed 회분이 2% 안팎. */
export const ASH_DEFAULT_PCT: Record<'건식' | '습식', number> = { 건식: 7, 습식: 2 };

/**
 * 무질소추출물(NFE, 탄수화물 근사) as-fed %.
 * NFE% = 100 − moisture − protein − fat − ash − crude_fiber.
 * 결측 필드는 0으로 두지 않고 null을 반환해 "탄수 판단 불가"를 표현한다(스키마 §1-3).
 */
export function nfePct(args: {
  moisture: number | null;
  protein: number | null;
  fat: number | null;
  ash: number | null;
  fiber: number | null;
  /**
   * 제형 — 회분 결측 시 기본값 선택용(건식 7% / 습식 2%). 생략하면 종전과 같이 7%.
   * ⚠ 스코어러는 아직 생략(순위 불변) — 제형별 기본값 전면 적용은 PENDING §0-0a 별도 PR.
   */
  category?: '건식' | '습식';
}): number | null {
  const { moisture, protein, fat, ash, fiber, category } = args;
  // ash는 라벨 결측이 흔하다 — 건식 ≈ 7% 가정(스키마 §3-3). moisture/protein/fat이 핵심.
  if (moisture == null || protein == null || fat == null) return null;
  const ashUsed = ash ?? ASH_DEFAULT_PCT[category ?? '건식'];
  const fiberUsed = fiber ?? 0;
  const nfe = 100 - moisture - protein - fat - ashUsed - fiberUsed;
  return Math.max(0, nfe);
}

/** 탄수화물(NFE) → g/1000kcal. 당뇨 1차 레버. 결측이면 null. */
export function carbGramsPer1000kcal(args: {
  moisture: number | null;
  protein: number | null;
  fat: number | null;
  ash: number | null;
  fiber: number | null;
  kcalPer100g: number | null;
  category?: '건식' | '습식';
}): number | null {
  const nfe = nfePct(args);
  if (nfe == null || args.kcalPer100g == null) return null;
  return pctToGramsPer1000kcal(nfe, args.kcalPer100g);
}

/**
 * 인 라벨값 타당성 하한 — **건물 기준 0.2%**. 완전식은 신장식도 0.3% DM 아래로 내려가지 않는다
 * (AAFCO 성묘 최소 0.5% DM · 상용 신장식 0.3~0.5% DM). 이보다 낮으면 실함량이 아니라
 * 보증분석 '최소값'(예: S1169 Equilíbrio Renal "Fósforo (mín.) 500 mg/kg" = 0.05% as-fed, 2026-10-28 실증)
 * 이라 결측으로 취급한다 — 그대로 쓰면 CKD 전 병기 TOP 1로 올라가는 오도가 생긴다.
 * 수분 결측이면 제형 대표값(건식 8% / 습식 78%)으로 환산. 2,140 KR 활성 SKU 중 해당 1건, 경계(0.2~0.3%) 0건.
 */
export const PHOSPHORUS_DM_FLOOR_PCT = 0.2;

export function plausiblePhosphorusPct(food: {
  phosphorus_pct: number | null;
  moisture_pct: number | null;
  category: '건식' | '습식';
}): number | null {
  const p = food.phosphorus_pct;
  if (p == null) return null;
  const m = food.moisture_pct ?? (food.category === '습식' ? 78 : 8);
  if (m >= 100) return null;
  return toDmbPct(p, m) < PHOSPHORUS_DM_FLOOR_PCT ? null : p;
}

/** 인(P) g/1000kcal. CKD 1차 레버. as-fed % 또는 kcal 결측이면 null. */
export function phosphorusGramsPer1000kcal(
  phosphorusPct: number | null,
  kcalPer100g: number | null,
): number | null {
  if (phosphorusPct == null || kcalPer100g == null) return null;
  return pctToGramsPer1000kcal(phosphorusPct, kcalPer100g);
}

/** 단백 g/1000kcal. */
export function proteinGramsPer1000kcal(
  proteinPct: number | null,
  kcalPer100g: number | null,
): number | null {
  if (proteinPct == null || kcalPer100g == null) return null;
  return pctToGramsPer1000kcal(proteinPct, kcalPer100g);
}

/**
 * 에너지 밀도 — kcal/100 g **건물(DM) 기준**.
 * 감량·증량 레버가 as-fed kcal/100g를 쓰면 수분 80% 습식이 구조적으로 '저칼로리'로 보여
 * 감량 추천이 항상 습식 파우치가 되는 왜곡(2026-10-20 검토)이 난다 — 스키마 §3-1대로 수분을 뺀다.
 * 수분 결측이면 제형 대표값(건식 8% / 습식 78%)을 쓴다 — 영양소 추정이 아니라 단위 환산용 상수이며,
 * 그래도 추정이 섞인 값이라 호출부가 라벨에 '(제형 가정)'을 붙일 수 있도록 flag를 돌려준다.
 */
export function kcalPer100gDm(
  kcalPer100g: number | null,
  moisturePct: number | null,
  category: '건식' | '습식',
): { value: number; assumedMoisture: boolean } | null {
  if (kcalPer100g == null) return null;
  const m = moisturePct ?? (category === '습식' ? 78 : 8);
  const dm = 100 - m;
  if (dm <= 0) return null;
  return { value: (kcalPer100g * 100) / dm, assumedMoisture: moisturePct == null };
}

/**
 * 지방 유래 에너지 비율(ME 분율, 0~1). 지방 1 g ≈ 8.5 kcal ME(AAFCO 수정 Atwater).
 * 췌장염 '지방 상위 구간' 고지용 — 점수 입력이 아니다.
 */
export function fatEnergyShare(fatPct: number | null, kcalPer100g: number | null): number | null {
  if (fatPct == null || kcalPer100g == null || kcalPer100g <= 0) return null;
  const fatG = pctToGramsPer1000kcal(fatPct, kcalPer100g);
  return Math.min(1, (fatG * 8.5) / 1000);
}

/** 미네랄(Na/K 등) g/1000kcal — as-fed % 또는 kcal 결측이면 null(임의 추정 금지, 스키마 §1-3). */
export function mineralGramsPer1000kcal(
  mineralPct: number | null,
  kcalPer100g: number | null,
): number | null {
  if (mineralPct == null || kcalPer100g == null) return null;
  return pctToGramsPer1000kcal(mineralPct, kcalPer100g);
}
