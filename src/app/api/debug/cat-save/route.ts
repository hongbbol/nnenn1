import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/user';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * [임시 진단용] 로그인 상태로 브라우저에서 /api/debug/cat-save 를 열면
 * cats/recommendations 저장 경로의 각 단계 실제 에러를 JSON으로 그대로 반환한다.
 * production 빌드의 에러 마스킹을 우회해 원인을 확인하기 위함. 진단 후 삭제 예정.
 */
export async function GET() {
  const out: Record<string, unknown> = {};
  try {
    const user = await getCurrentUser();
    out.user = user ? { id: user.id, email: user.email } : null;
    if (!user) return NextResponse.json({ step: 'auth-failed', ...out });

    const supabase = await createSupabaseServerClient();

    // 1) cats SELECT (RLS/연결 확인)
    const sel = await supabase
      .from('cats')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    out.catsSelect = { error: sel.error?.message ?? null, rows: sel.data?.length ?? 0 };

    // 2) cats INSERT (더미)
    const ins = await supabase
      .from('cats')
      .insert({
        user_id: user.id,
        name: 'DEBUG_DELETE_ME',
        birth_year: 2020,
        birth_month: 1,
        birth_day: 1,
        weight_kg: 4.0,
        neutered_status: '완료',
        diet_type: '건식',
        current_food_text: '디버그',
        health_conditions: [],
        avoid_ingredients: [],
        goal: '질환관리',
      })
      .select('id')
      .maybeSingle();
    out.catsInsert = {
      error: ins.error?.message ?? null,
      details: ins.error?.details ?? null,
      hint: ins.error?.hint ?? null,
      id: ins.data?.id ?? null,
    };

    const catId = (ins.data as { id?: string } | null)?.id;

    // 3) recommendations INSERT (더미)
    if (catId) {
      const rec = await supabase.from('recommendations').insert({
        user_id: user.id,
        cat_id: catId,
        cat_name: 'DEBUG_DELETE_ME',
        top_food_ids: ['debug-1'],
        summary: { primaryMode: null, top: [] },
        result: { ok: true },
      });
      out.recInsert = {
        error: rec.error?.message ?? null,
        details: rec.error?.details ?? null,
        hint: rec.error?.hint ?? null,
      };

      // cleanup — 더미 cat 삭제(recommendations는 cascade).
      const del = await supabase.from('cats').delete().eq('id', catId);
      out.cleanup = { error: del.error?.message ?? null };
    }

    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({
      caught: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : null,
      ...out,
    });
  }
}
