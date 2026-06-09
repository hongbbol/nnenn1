'use server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/user';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type DeleteResult = { ok: true } | { ok: false; error: string };

/**
 * 고양이 프로필 1마리 삭제. cats row만 지운다 — 추천·비교 히스토리는 보존한다
 * (FK가 on delete set null이라 히스토리의 cat_id만 비워지고, cat_name으로 계속 표시됨).
 * 소유 검증은 RLS + user_id 조건으로 이중 보장.
 */
export async function deleteCat(catId: string): Promise<DeleteResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: '로그인이 필요해요.' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('cats')
      .delete()
      .eq('id', catId)
      .eq('user_id', user.id);
    if (error) return { ok: false, error: `프로필 삭제 실패: ${error.message}` };

    revalidatePath('/mypage');
    revalidatePath('/recommendations');
    return { ok: true };
  } catch (e) {
    console.error('[deleteCat]', e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
