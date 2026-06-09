'use client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { useGuestStore } from '@/lib/guest-store';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { catRowToGuestCat } from '@/lib/domain/cat-mapping';
import type { CatRow } from '@/lib/domain/types';

/**
 * 온보딩 1단계 상단 바 — 프로필이 2개일 때 다른 프로필로 폼을 교체하는 탭.
 * (전환 전 경고. 전환 시 사진은 hero_image_path의 signed URL을 받아 미리보기로 채운다.)
 * 프로필이 1개거나 신규 추가일 땐 전환할 대상이 없어 표시하지 않는다.
 */
export function OnboardingProfileBar() {
  const editingCatId = useGuestStore((s) => s.editingCatId);
  const resetCat = useGuestStore((s) => s.resetCat);
  const setCat = useGuestStore((s) => s.setCat);
  const setEditingCatId = useGuestStore((s) => s.setEditingCatId);
  const [cats, setCats] = useState<CatRow[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('cats')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (active && data) setCats(data as CatRow[]);
    })();
    return () => {
      active = false;
    };
  }, []);

  // 전환할 다른 프로필이 없으면(1마리/신규) 숨긴다.
  if (cats.length < 2) return null;

  async function switchTo(cat: CatRow) {
    if (cat.id === editingCatId) return;
    if (!window.confirm('지금 입력 중인 내용이 사라져요. 다른 프로필로 전환할까요?')) return;
    resetCat();
    setCat(catRowToGuestCat(cat));
    setEditingCatId(cat.id);
    // 사진은 GuestCat에 없으므로 저장된 hero_image_path의 signed URL을 받아 미리보기에 채운다.
    // (저장 단계는 'data:image/'로 시작할 때만 재업로드하므로 signed URL을 넣어도 안전)
    if (cat.hero_image_path) {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.storage
        .from('cat-photos')
        .createSignedUrl(cat.hero_image_path, 3600);
      if (data?.signedUrl) setCat({ hero_image_preview: data.signedUrl });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-[14px] border border-border-soft bg-surface-1 px-3 py-2.5">
      <span className="mr-1 text-[12px] font-medium text-brand-faint">프로필</span>
      {cats.map((c) => {
        const active = c.id === editingCatId;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => switchTo(c)}
            className={cn(
              'rounded-md px-2.5 py-[5px] text-[13px] font-semibold transition-colors',
              active
                ? 'bg-brand-text text-white'
                : 'bg-surface-card text-brand-sub hover:text-brand-text',
            )}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
