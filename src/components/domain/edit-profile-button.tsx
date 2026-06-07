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
  label = '프로필 수정',
  variant = 'ghost',
  full = false,
}: {
  cat: GuestCat;
  label?: string;
  variant?: BtnVariant;
  full?: boolean;
}) {
  const router = useRouter();
  const resetCat = useGuestStore((s) => s.resetCat);
  const setCat = useGuestStore((s) => s.setCat);

  return (
    <Button
      variant={variant}
      full={full}
      onClick={() => {
        resetCat();
        setCat(cat);
        router.push('/onboarding/basics');
      }}
    >
      {label}
    </Button>
  );
}
