'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/user';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { recommendFromProfile, SEED_FOODS } from '@/lib/recommendation';
import { CAT_LIMIT } from '@/lib/domain/constants';
import type { GuestCat, RecSummary } from '@/lib/domain/types';

export type SaveResult = { ok: true } | { ok: false; error: string };

/**
 * 온보딩 완료 시 호출. 게스트 입력(cat)을 Supabase에 영구 저장하고 추천을 1회 계산해
 * 히스토리로 남긴다. `editingCatId`가 있으면 그 프로필 UPDATE, 없으면 신규 INSERT
 * (단, 사용자당 최대 CAT_LIMIT마리).
 *
 * 사진은 클라이언트에서 미리 Storage에 업로드하고 그 path만 `heroImagePath`로 받는다
 * (큰 dataURL을 Server Action body로 보내지 않기 위함). 새 사진이 없으면 null →
 * 기존 path를 유지한다.
 *
 * 실패 시 throw하지 않고 { ok:false, error } 를 반환한다 — production 빌드에서 throw는
 * 메시지가 마스킹돼 원인을 알 수 없기 때문. 어느 단계에서 실패했는지 prefix로 표기한다.
 *
 * - GENERATED 컬럼(age_group/age_label)은 payload에서 제외(포함 시 에러).
 * - current_food XOR 제약: id가 있으면 text는 null.
 * - 추천은 고양이별 최근 3개만 유지(오래된 것 prune).
 */
export async function saveCatAndRecommend(
  cat: GuestCat,
  heroImagePath?: string | null,
  editingCatId?: string | null,
): Promise<SaveResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: '로그인이 필요해요.' };

    const result = recommendFromProfile(cat, SEED_FOODS);
    if (!result) {
      return { ok: false, error: '추천에 필요한 정보가 부족해요. (필수 입력 누락)' };
    }

    const supabase = await createSupabaseServerClient();

    // editingCatId 기준 update vs insert 결정.
    let existing: { id: string; hero_image_path: string | null } | null = null;
    if (editingCatId) {
      // 편집 모드 — 해당 프로필 소유 검증.
      const { data, error: selErr } = await supabase
        .from('cats')
        .select('id, hero_image_path')
        .eq('id', editingCatId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (selErr) return { ok: false, error: `프로필 조회 실패: ${selErr.message}` };
      if (!data) return { ok: false, error: '수정할 프로필을 찾을 수 없어요.' };
      existing = data;
    } else {
      // 신규 모드 — 프로필 상한 검사.
      const { count, error: cntErr } = await supabase
        .from('cats')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (cntErr) return { ok: false, error: `프로필 조회 실패: ${cntErr.message}` };
      if ((count ?? 0) >= CAT_LIMIT) {
        return { ok: false, error: `프로필은 최대 ${CAT_LIMIT}개까지 추가할 수 있어요.` };
      }
    }

    const catId: string = existing?.id ?? randomUUID();
    const finalImagePath: string | null =
      heroImagePath ?? existing?.hero_image_path ?? null;

    const payload = {
      user_id: user.id,
      name: cat.name!,
      sex: cat.sex ?? null,
      breed: cat.breed?.trim() || null,
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
      exclude_food_ids: cat.exclude_food_ids ?? [],
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
      if (error) return { ok: false, error: `프로필 업데이트 실패: ${error.message}` };
    } else {
      const { error } = await supabase.from('cats').insert({ id: catId, ...payload });
      if (error) return { ok: false, error: `프로필 저장 실패: ${error.message}` };
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
    if (recErr) return { ok: false, error: `추천 저장 실패: ${recErr.message}` };

    // 고양이별 최근 3개만 유지 — 4번째 이후를 삭제(실패해도 치명적 아님).
    // user_id 전역이 아니라 cat_id별로 prune해야 다른 고양이 추천이 밀려 사라지지 않는다.
    const { data: stale } = await supabase
      .from('recommendations')
      .select('id')
      .eq('user_id', user.id)
      .eq('cat_id', catId)
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
    return { ok: true };
  } catch (e) {
    console.error('[saveCatAndRecommend]', e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
