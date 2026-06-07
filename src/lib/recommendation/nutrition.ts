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
}): number | null {
  const { moisture, protein, fat, ash, fiber } = args;
  // ash는 라벨 결측이 흔하다 — 건식 ≈ 7% 가정(스키마 §3-3). moisture/protein/fat이 핵심.
  if (moisture == null || protein == null || fat == null) return null;
  const ashUsed = ash ?? 7;
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
}): number | null {
  const nfe = nfePct(args);
  if (nfe == null || args.kcalPer100g == null) return null;
  return pctToGramsPer1000kcal(nfe, args.kcalPer100g);
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
