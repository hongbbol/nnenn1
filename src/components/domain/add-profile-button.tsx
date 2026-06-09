'use client';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { useGuestStore } from '@/lib/guest-store';

type BtnVariant = React.ComponentProps<typeof Button>['variant'];

/**
 * "프로필 추가" — 빈 온보딩 버퍼로 초기화하고(editingCatId=null = 신규 INSERT) 1단계로 보낸다.
 * 프로필이 상한에 도달하면 disabled로 렌더(클릭 불가).
 */
export function AddProfileButton({
  disabled = false,
  label = '프로필 추가',
  variant = 'ghost',
  full = false,
}: {
  disabled?: boolean;
  label?: string;
  variant?: BtnVariant;
  full?: boolean;
}) {
  const router = useRouter();
  const resetCat = useGuestStore((s) => s.resetCat);

  return (
    <Button
      variant={variant}
      full={full}
      disabled={disabled}
      leading={<Plus size={16} />}
      onClick={() => {
        // resetCat()은 editingCatId도 null로 리셋 → 신규 고양이로 저장.
        resetCat();
        router.push('/onboarding/basics');
      }}
    >
      {label}
    </Button>
  );
}
