import type { ComparisonRow } from '@/lib/domain/types';
import { formatDate } from '@/lib/format';

/** 마이페이지 — 비교 히스토리. */
export function ComparisonHistoryList({ items }: { items: ComparisonRow[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-border-soft bg-surface-card p-6 text-center text-[14px] text-brand-sub">
        아직 비교 기록이 없어요. 추천 결과에서 &lsquo;현재 사료와 비교하기&rsquo;를 눌러보세요.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((c) => (
        <div
          key={c.id}
          className="rounded-[16px] border border-border-soft bg-surface-card p-5"
        >
          <div className="flex items-center justify-between">
            <div className="text-[14px] font-semibold text-brand-text">사료 비교</div>
            <div className="text-[12px] text-brand-faint">
              {formatDate(c.created_at)}
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-1.5 text-[13px]">
            <div className="flex gap-2">
              <span className="shrink-0 text-brand-faint">현재</span>
              <span className="min-w-0 truncate font-medium text-brand-text">
                {c.result.baseline.label}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="shrink-0 text-brand-faint">추천</span>
              <span className="min-w-0 truncate font-medium text-brand-text">
                {c.result.candidates.map((x) => x.brand).join(', ') || '—'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
