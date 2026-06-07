'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/user';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { recommendFromProfile, SEED_FOODS } from '@/lib/recommendation';
import type { GuestCat, RecSummary } from '@/lib/domain/types';

/**
 * 온보딩 완료 시 호출. 게스트 입력(cat)을 Supabase에 영구 저장하고 추천을 1회 계산해
 * 히스토리로 남긴다. 사용자당 고양이 1마리를 가정하고, 기존 행이 있으면 update(재온보딩).
 *
 * 사진은 클라이언트에서 미리 Storage에 업로드하고 그 path만 `heroImagePath`로 받는다
 * (큰 dataURL을 Server Action body로 보내지 않기 위함). 새 사진이 없으면 null →
 * 기존 path를 유지한다.
 *
 * - GENERATED 컬럼(age_group/age_label)은 payload에서 제외(포함 시 에러).
 * - current_food XOR 제약: id가 있으면 text는 null.
 * - 추천은 최근 3개만 유지(오래된 것 prune).
 */
export async function saveCatAndRecommend(
  cat: GuestCat,
  heroImagePath?: string | null,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error('로그인이 필요해요.');

  const result = recommendFromProfile(cat, SEED_FOODS);
  if (!result) throw new Error('추천에 필요한 정보가 부족해요.');

  const supabase = await createSupabaseServerClient();

  // 기존 고양이 조회 → update vs insert 결정.
  const { data: existing } = await supabase
    .from('cats')
    .select('id, hero_image_path')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const catId: string = existing?.id ?? randomUUID();

  // 새 사진이 올라왔으면 그 path, 아니면 기존 path 유지.
  const finalImagePath: string | null =
    heroImagePath ?? existing?.hero_image_path ?? null;

  const payload = {
    user_id: user.id,
    name: cat.name!,
    birth_year: cat.birth_year!,
    birth_month: cat.birth_month ?? null,
    birth_day: cat.birth_day ?? null,
    weight_kg: cat.weight_kg!,
    neutered_status: cat.neutered_status!,
    diet_type: cat.diet_type!,
    current_food_id: cat.current_food_id ?? null,
    current_food_text: cat.current_food_id ? null : cat.current_food_text?.trim() || null,
    health_conditions: cat.health_conditions ?? [],
    avoid_ingredients: cat.avoid_ingredients ?? [],
    goal: cat.goal!,
    hero_image_path: finalImagePath,
    last_recommended_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from('cats')
      .update(payload)
      .eq('id', catId)
      .eq('user_id', user.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('cats').insert({ id: catId, ...payload });
    if (error) throw error;
  }

  // 추천 히스토리 저장.
  const summary: RecSummary = {
    primaryMode: result.primaryMode,
    top: result.top.map((t) => ({
      foodId: t.food.id,
      brand: t.food.brand,
      productName: t.food.product_name,
      score: t.score,
    })),
  };
  const { error: recErr } = await supabase.from('recommendations').insert({
    user_id: user.id,
    cat_id: catId,
    cat_name: payload.name,
    top_food_ids: result.top.map((t) => t.food.id),
    summary,
    result,
  });
  if (recErr) throw recErr;

  // 최근 3개만 유지 — 4번째 이후를 삭제.
  const { data: stale } = await supabase
    .from('recommendations')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(3, 999);
  if (stale && stale.length > 0) {
    await supabase
      .from('recommendations')
      .delete()
      .in(
        'id',
        stale.map((r) => r.id),
      );
  }

  revalidatePath('/mypage');
  revalidatePath('/recommendations');
}
