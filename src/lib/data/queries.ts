import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/user';
import type {
  CatRow,
  ComparisonRow,
  Food,
  RecommendationRow,
} from '@/lib/domain/types';

/** 현재 로그인 사용자의 가장 최근 고양이 1마리. 없으면 null. (랜딩 prefill 등 단일 진입점용) */
export async function getOwnedCat(): Promise<CatRow | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('cats')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as CatRow | null) ?? null;
}

/** 현재 로그인 사용자의 모든 고양이. 등록 순(created_at 오름차순) — 탭/카드 순서 안정. */
export async function getOwnedCats(): Promise<CatRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('cats')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });
  return (data as CatRow[] | null) ?? [];
}

/** id로 고양이 1마리 조회(현재 사용자 소유만). 없거나 타인 소유면 null. */
export async function getCatById(id: string): Promise<CatRow | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('cats')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  return (data as CatRow | null) ?? null;
}

/** 특정 고양이의 가장 최근 추천 1건. 없으면 null. */
export async function getLatestRecommendationForCat(
  catId: string,
): Promise<RecommendationRow | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', user.id)
    .eq('cat_id', catId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as RecommendationRow | null) ?? null;
}

/** cat 사진(hero_image_path)의 만료형 signed URL. 버킷이 private이라 public URL 불가. */
export async function getCatPhotoUrl(
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage
    .from('cat-photos')
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** 프로필(cats row) 보유 여부 — TopNav 메뉴 노출 판정용. */
export async function hasCatProfile(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from('cats')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);
  return (count ?? 0) > 0;
}

/** 최근 추천 히스토리(기본 3개). */
export async function getRecentRecommendations(
  limit = 3,
): Promise<RecommendationRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data as RecommendationRow[] | null) ?? [];
}

/** 최근 비교 히스토리(기본 5개). */
export async function getRecentComparisons(limit = 5): Promise<ComparisonRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('comparisons')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data as ComparisonRow[] | null) ?? [];
}

/**
 * 추천 후보 사료 전체(active=true) — nnenn2 ETL로 시드된 `foods` 테이블.
 *
 * - PostgREST 기본 max_rows(1000) 때문에 1333행은 range 페이지네이션으로 수집.
 * - 레거시 안전 매핑: 마이그레이션 이전 행엔 kr_available/미네랄 컬럼이 없을 수 있어
 *   `kr_available ?? true`(구 시드 통과), 미네랄은 `?? null`.
 * - 실패/빈 테이블이면 [] 반환 — 호출부가 SEED_FOODS로 폴백한다.
 */
export async function getRecommendationFoods(): Promise<Food[]> {
  const supabase = await createSupabaseServerClient();
  const PAGE = 1000;
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('foods')
      .select('*')
      .eq('active', true)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    rows.push(...(data as Record<string, unknown>[]));
    if (data.length < PAGE) break;
  }
  return rows.map((r) => ({
    id: r.id as string,
    brand: (r.brand as string) ?? '',
    product_name: (r.product_name as string) ?? '',
    category: (r.category as Food['category']) ?? '건식',
    age_fit: (r.age_fit as Food['age_fit']) ?? [],
    condition_fit: (r.condition_fit as string[]) ?? [],
    protein_pct: (r.protein_pct as number | null) ?? null,
    fat_pct: (r.fat_pct as number | null) ?? null,
    fiber_pct: (r.fiber_pct as number | null) ?? null,
    ash_pct: (r.ash_pct as number | null) ?? null,
    moisture_pct: (r.moisture_pct as number | null) ?? null,
    phosphorus_pct: (r.phosphorus_pct as number | null) ?? null,
    sodium_pct: (r.sodium_pct as number | null) ?? null,
    potassium_pct: (r.potassium_pct as number | null) ?? null,
    chloride_pct: (r.chloride_pct as number | null) ?? null,
    taurine_pct: (r.taurine_pct as number | null) ?? null,
    epa_dha_pct: (r.epa_dha_pct as number | null) ?? null,
    omega3_pct: (r.omega3_pct as number | null) ?? null,
    kcal_per_100g: (r.kcal_per_100g as number | null) ?? null,
    ingredient_summary: (r.ingredient_summary as string | null) ?? null,
    ingredient_keywords: (r.ingredient_keywords as string[]) ?? [],
    form: (r.form as string | null) ?? null,
    rec_daily_g: (r.rec_daily_g as number | null) ?? null,
    tags: (r.tags as string[]) ?? [],
    image_url: (r.image_url as string | null) ?? null,
    affiliate_links: (r.affiliate_links as Record<string, string> | null) ?? null,
    price_per_kg_krw: (r.price_per_kg_krw as number | null) ?? null,
    active: (r.active as boolean) ?? true,
    kr_available: (r.kr_available as boolean | undefined) ?? true,
  }));
}
