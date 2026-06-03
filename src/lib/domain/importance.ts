/** Nutrient importance map. MVP: static (per dev-plan §4.9). Phase 2: dynamic by condition. */
export type Importance = 'high' | 'mid' | 'low';

export const STATIC_IMPORTANCE: Record<string, Importance> = {
  protein_pct: 'mid',
  fat_pct: 'mid',
  fiber_pct: 'low',
  ash_pct: 'low',
  moisture_pct: 'mid',
  phosphorus_pct: 'high',
  sodium_pct: 'high',
  omega3_pct: 'mid',
  kcal_per_100g: 'mid',
};
