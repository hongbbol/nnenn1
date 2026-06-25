'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { saveCurrentComparison } from '@/app/compare/_actions';
import { trackEvent } from '@/lib/analytics';

/**
 * "현재 사료와 비교하기" — 비교를 히스토리에 저장한 뒤 /compare로 이동.
 * 저장 시점이 사용자의 명시적 행동이라 중복 prune 없이 그대로 쌓는다.
 */
export function CompareButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="dark"
        full
        disabled={busy}
        onClick={async () => {
          setErr(null);
          setBusy(true);
          try {
            await saveCurrentComparison();
            trackEvent('compare_clicked');
            router.push('/compare');
          } catch (e) {
            setErr(e instanceof Error ? e.message : '비교 중 문제가 생겼어요.');
            setBusy(false);
          }
        }}
      >
        {busy ? '비교 준비 중…' : '현재 사료와 비교하기'}
      </Button>
      {err && <span className="text-center text-[13px] text-brand-danger">{err}</span>}
    </div>
  );
}
