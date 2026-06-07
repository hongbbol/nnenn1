import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/user';
import type {
  CatRow,
  ComparisonRow,
  RecommendationRow,
} from '@/lib/domain/types';

/** 현재 로그인 사용자의 가장 최근 고양이 1마리. 없으면 null. (MVP: 사용자당 1마리 가정) */
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
