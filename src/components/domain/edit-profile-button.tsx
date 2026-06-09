'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { useGuestStore } from '@/lib/guest-store';
import type { GuestCat } from '@/lib/domain/types';

type BtnVariant = React.ComponentProps<typeof Button>['variant'];

/**
 * "프로필 수정" — DB의 cat 값을 온보딩 버퍼(store)에 채운 뒤 온보딩 1단계로 보낸다.
 * server component(마이페이지/추천)에서 cat을 prop으로 받아 재온보딩 prefill을 처리.
 */
export function EditProfileButton({
  cat,
  catId,
  photoUrl = null,
  label = '프로필 수정',
  variant = 'ghost',
  full = false,
}: {
  cat: GuestCat;
  /** 편집 대상 cat의 id — 저장 시 이 프로필을 UPDATE하도록 store에 기록. */
  catId: string;
  /** 저장된 사진의 signed URL — 미리보기에 채워 수정 화면에서도 사진이 보이게 한다.
   *  'data:image/'가 아니라 재업로드되지 않으므로 기존 사진 경로는 그대로 유지된다. */
  photoUrl?: string | null;
  label?: string;
  variant?: BtnVariant;
  full?: boolean;
}) {
  const router = useRouter();
  const resetCat = useGuestStore((s) => s.resetCat);
  const setCat = useGuestStore((s) => s.setCat);
  const setEditingCatId = useGuestStore((s) => s.setEditingCatId);

  return (
    <Button
      variant={variant}
      full={full}
      onClick={() => {
        resetCat();
        setCat({ ...cat, hero_image_preview: photoUrl });
        setEditingCatId(catId);
        router.push('/onboarding/basics');
      }}
    >
      {label}
    </Button>
  );
}
