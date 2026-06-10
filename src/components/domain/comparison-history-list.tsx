'use client';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ComparisonRow } from '@/lib/domain/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { ComparisonTable } from './comparison-table';

/** 마이페이지 — 비교 히스토리. 카드를 누르면 그 날짜 영양소 비교표를 펼쳐 보여준다. */
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
        <ComparisonHistoryItem key={c.id} row={c} />
      ))}
    </div>
  );
}

function ComparisonHistoryItem({ row: c }: { row: ComparisonRow }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-[16px] border border-border-soft bg-surface-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full p-5 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-[14px] font-semibold text-brand-text">사료 비교</div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-brand-faint">{formatDate(c.created_at)}</span>
            <ChevronDown
              size={16}
              className={cn(
                'text-brand-faint transition-transform',
                open && 'rotate-180',
              )}
            />
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
      </button>

      {open && (
        <div className="border-t border-border-soft px-5 py-5">
          {c.result.metrics.length > 0 ? (
            <ComparisonTable result={c.result} />
          ) : (
            <div className="text-[13px] text-brand-sub">
              비교할 영양 정보가 없는 기록이에요.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
