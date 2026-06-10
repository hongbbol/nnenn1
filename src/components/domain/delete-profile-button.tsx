'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { deleteCat } from '@/app/mypage/_actions';

/**
 * "삭제" — 확인(window.confirm) 후 프로필을 삭제한다. 추천·비교 히스토리는 남는다
 * (서버 액션이 cats row만 삭제, FK는 set null). 삭제 후 마이페이지를 새로고침.
 */
export function DeleteProfileButton({
  catId,
  catName,
  overlay = false,
}: {
  catId: string;
  catName: string;
  /** true면 사진 위에 올리는 반투명 원형 아이콘 버튼으로 렌더(마이페이지 카드). */
  overlay?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const confirmDelete = () => {
    if (
      !window.confirm(
        `'${catName}' 프로필을 삭제할까요? 추천 히스토리는 그대로 남아요.`,
      )
    ) {
      return;
    }
    setErr(null);
    startTransition(async () => {
      const res = await deleteCat(catId);
      if (!res.ok) {
        if (overlay) window.alert(res.error);
        else setErr(res.error);
        return;
      }
      router.refresh();
    });
  };

  if (overlay) {
    return (
      <button
        type="button"
        aria-label="프로필 삭제"
        disabled={pending}
        onClick={confirmDelete}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/40 active:scale-[0.96] disabled:opacity-50"
      >
        <Trash2 size={15} />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="text"
        size="sm"
        disabled={pending}
        leading={<Trash2 size={14} />}
        onClick={confirmDelete}
      >
        {pending ? '삭제 중…' : '삭제'}
      </Button>
      {err && <span className="text-[12px] font-medium text-brand-danger">{err}</span>}
    </div>
  );
}
