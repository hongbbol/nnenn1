import type { AgeGroup, DietType, Goal, NeuteredStatus, Sex } from './constants';
// type-only import — 런타임 순환 없음(타입은 컴파일 시 제거됨).
import type { RecResult } from '@/lib/recommendation/types';

export type CatProfile = {
  name: string;
  // 기존 행 호환을 위해 DB는 nullable. 앱(온보딩 스키마)에서 필수로 강제한다.
  sex: Sex | null;
  breed: string | null;
  birth_year: number;
  birth_month: number;
  birth_day: number;
  weight_kg: number;
  neutered_status: NeuteredStatus;
  diet_type: DietType;
  current_food_id?: string | null;
  current_food_text?: string | null;
  health_conditions: string[];
  avoid_ingredients: string[];
  /** 추천에서 제외할 사료 id 목록(SEED_FOODS 기준). */
  exclude_food_ids: string[];
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

// ─── 추천 히스토리 ────────────────────────────────────────────
export type RecSummaryTopItem = {
  foodId: string;
  brand: string;
  productName: string;
  score: number;
};

/** recommendations.summary — 히스토리 리스트를 가볍게 렌더링하기 위한 요약. */
export type RecSummary = {
  primaryMode: string | null;
  top: RecSummaryTopItem[];
};

export type RecommendationRow = {
  id: string;
  user_id: string;
  /** 프로필 삭제 시 set null — 히스토리는 cat_name으로 계속 표시. */
  cat_id: string | null;
  cat_name: string;
  top_food_ids: string[];
  summary: RecSummary;
  /** RecResult 전체 직렬화(상세 복원용). */
  result: RecResult;
  created_at: string;
};

// ─── 비교 ─────────────────────────────────────────────────────
export type ComparisonMetric = {
  /** Food의 영양 키(예: 'protein_pct'). */
  key: string;
  label: string;
  unit: string;
  /** 현재(baseline) 사료 값. 자유입력/미매칭이면 null. */
  baseline: number | null;
  /** candidates 순서대로의 값. */
  values: (number | null)[];
  /** 높을수록/낮을수록 좋음(중립 표기는 'neutral'). */
  better: 'higher' | 'lower' | 'neutral';
};

export type ComparisonCandidate = {
  id: string;
  brand: string;
  productName: string;
  category: '건식' | '습식';
};

export type ComparisonResult = {
  baseline: {
    /** 'db'=foods에서 정확 매칭, 'text'=자유입력(영양 데이터 없음), 'none'=현재 사료 미입력. */
    source: 'db' | 'text' | 'none';
    foodId: string | null;
    label: string;
  };
  candidates: ComparisonCandidate[];
  metrics: ComparisonMetric[];
};

export type ComparisonRow = {
  id: string;
  user_id: string;
  /** 프로필 삭제 시 set null. */
  cat_id: string | null;
  baseline_food_id: string | null;
  baseline_text: string | null;
  candidate_food_ids: string[];
  result: ComparisonResult;
  created_at: string;
};
