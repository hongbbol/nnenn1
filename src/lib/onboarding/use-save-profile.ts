'use client';
import { useGuestStore } from '@/lib/guest-store';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { uploadCatPhotoClient } from '@/lib/storage/client-upload';
import { saveCatAndRecommend, type SaveResult } from '@/app/onboarding/_actions';
import { invalidateCatFoodHistory } from '@/lib/onboarding/food-history-client';

/**
 * 온보딩 버퍼(store)의 고양이를 저장하고 추천을 1회 계산한다.
 * - 사진이 새로 추가됐으면(data:image) 먼저 Storage에 업로드하고 경로만 서버로 전달.
 * - editingCatId가 있으면 그 프로필 UPDATE, 없으면 신규 INSERT(상한은 서버에서 검사).
 *
 * goal 스텝의 "추천 받기"와 수정 모드의 "완료"가 공유한다.
 */
export function useSaveProfile(): () => Promise<SaveResult> {
  const cat = useGuestStore((s) => s.cat);
  const editingCatId = useGuestStore((s) => s.editingCatId);

  return async function save() {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: '로그인이 필요해요.' };

    let heroPath: string | null = null;
    if (cat.hero_image_preview?.startsWith('data:image/')) {
      heroPath = await uploadCatPhotoClient(supabase, user.id, cat.hero_image_preview);
    }
    const { hero_image_preview, ...catData } = cat;
    void hero_image_preview;
    const result = await saveCatAndRecommend(catData, heroPath, editingCatId);
    // 기록 칩 캐시 갱신 — 신규 프로필은 id를 모르니 전체 비움.
    if (result.ok) invalidateCatFoodHistory(editingCatId ?? null);
    return result;
  };
}
