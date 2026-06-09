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
}: {
  catId: string;
  catName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="text"
        size="sm"
        disabled={pending}
        leading={<Trash2 size={14} />}
        onClick={() => {
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
              setErr(res.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        {pending ? '삭제 중…' : '삭제'}
      </Button>
      {err && <span className="text-[12px] font-medium text-brand-danger">{err}</span>}
    </div>
  );
}
