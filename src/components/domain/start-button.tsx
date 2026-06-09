'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { useGuestStore } from '@/lib/guest-store';
import type { GuestCat } from '@/lib/domain/types';

type BtnVariant = React.ComponentProps<typeof Button>['variant'];

/**
 * 랜딩의 "시작하기" CTA. 기존 이용자(prefill 있음)는 저장된 프로필을 온보딩 버퍼(store)에
 * 채운 뒤 1단계로 보내 다시 입력하지 않게 한다. 비로그인·무프로필(prefill 없음)은 기존처럼
 * 빈 온보딩으로 — 이때는 prefetch를 위해 Link로 렌더한다.
 *
 * prefill은 server component에서 catRowToGuestCat()로 매핑해 prop으로 주입한다.
 * hero_image_preview에는 저장된 사진의 signed URL을 넣어도 안전하다 — 저장 단계는
 * 'data:image/'로 시작할 때만 재업로드하므로 기존 사진 경로는 그대로 유지된다.
 */
export function StartButton({
  prefill = null,
  prefillCatId = null,
  label,
  variant,
  trailing,
  full = false,
}: {
  prefill?: GuestCat | null;
  /** prefill 대상 cat의 id — 시작하기로 들어가면 그 프로필을 편집(UPDATE)하도록 기록. */
  prefillCatId?: string | null;
  label: string;
  variant?: BtnVariant;
  trailing?: React.ReactNode;
  full?: boolean;
}) {
  const router = useRouter();
  const resetCat = useGuestStore((s) => s.resetCat);
  const setCat = useGuestStore((s) => s.setCat);
  const setEditingCatId = useGuestStore((s) => s.setEditingCatId);

  if (!prefill) {
    return (
      <Link href="/onboarding/basics">
        <Button variant={variant} trailing={trailing} full={full}>
          {label}
        </Button>
      </Link>
    );
  }

  return (
    <Button
      variant={variant}
      trailing={trailing}
      full={full}
      onClick={() => {
        resetCat();
        setCat(prefill);
        setEditingCatId(prefillCatId ?? null);
        router.push('/onboarding/basics');
      }}
    >
      {label}
    </Button>
  );
}
