'use server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/user';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getOwnedCat, getRecentRecommendations } from '@/lib/data/queries';
import { buildComparison, resolveBaseline } from '@/lib/recommendation/compare';

/**
 * 현재 프로필의 최신 추천을 baseline(현재 사료)과 비교해 히스토리에 1건 저장한다.
 * 추천 페이지의 "현재 사료와 비교하기"에서 호출 → 저장 후 /compare로 이동.
 */
export async function saveCurrentComparison(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error('로그인이 필요해요.');

  const [cat, recs] = await Promise.all([
    getOwnedCat(),
    getRecentRecommendations(1),
  ]);
  if (!cat) throw new Error('프로필이 없어요.');
  const latest = recs[0];
  if (!latest || latest.result.top.length === 0) {
    throw new Error('비교할 추천 결과가 없어요.');
  }

  const candidates = latest.result.top.map((t) => t.food);
  const baseline = resolveBaseline(cat);
  const comparison = buildComparison(baseline, candidates);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('comparisons').insert({
    user_id: user.id,
    cat_id: cat.id,
    baseline_food_id: baseline.source === 'db' ? baseline.food.id : null,
    baseline_text: baseline.source === 'text' ? baseline.text : null,
    candidate_food_ids: candidates.map((c) => c.id),
    result: comparison,
  });
  if (error) throw error;

  revalidatePath('/mypage');
}
