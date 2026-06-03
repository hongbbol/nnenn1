/**
 * Ingredient synonym map — keyword normalization for `avoid_ingredients` matching.
 * Why: substring matching ('닭' vs 'chicken') would miss alternate spellings.
 * Source: dev-plan.md §4.3.
 */
export const INGREDIENT_SYNONYMS: Record<string, readonly string[]> = {
  닭: ['닭', '닭고기', '치킨', 'chicken'],
  소고기: ['소고기', '쇠고기', '우육', 'beef'],
  생선: ['생선', '어류', '연어', '참치', '대구', 'salmon', 'tuna'],
  연어: ['연어', 'salmon'],
  곡물: ['곡물', '옥수수', '밀', '쌀', '보리', 'corn', 'wheat', 'rice'],
  옥수수: ['옥수수', 'corn'],
  유제품: ['유제품', '우유', '치즈', '요거트', 'dairy', 'milk'],
};

export function expandAvoidKeywords(avoid: readonly string[]): string[] {
  const out = new Set<string>();
  for (const a of avoid) {
    const expanded = INGREDIENT_SYNONYMS[a] ?? [a];
    for (const k of expanded) out.add(k.toLowerCase());
  }
  return [...out];
}
