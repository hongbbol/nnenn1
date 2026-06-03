import type { AgeGroup, DietType, Goal, NeuteredStatus } from './constants';

export type CatProfile = {
  name: string;
  birth_year: number;
  weight_kg: number;
  neutered_status: NeuteredStatus;
  diet_type: DietType;
  current_food_id?: string | null;
  current_food_text?: string | null;
  health_conditions: string[];
  avoid_ingredients: string[];
  goal: Goal;
  hero_image_path?: string | null;
};

export type CatRow = CatProfile & {
  id: string;
  user_id: string | null;
  age_group: AgeGroup;
  age_label: string;
  last_recommended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GuestCat = Partial<CatProfile> & {
  /** base64 data URL — only used by guest store before upload */
  hero_image_preview?: string | null;
};

export type Food = {
  id: string;
  brand: string;
  product_name: string;
  category: '건식' | '습식';
  age_fit: AgeGroup[];
  condition_fit: string[];
  protein_pct: number | null;
  fat_pct: number | null;
  fiber_pct: number | null;
  ash_pct: number | null;
  moisture_pct: number | null;
  phosphorus_pct: number | null;
  sodium_pct: number | null;
  omega3_pct: number | null;
  kcal_per_100g: number | null;
  ingredient_summary: string | null;
  ingredient_keywords: string[];
  form: string | null;
  rec_daily_g: number | null;
  tags: string[];
  image_url: string | null;
  affiliate_links: Record<string, string> | null;
  price_per_kg_krw: number | null;
  active: boolean;
};
