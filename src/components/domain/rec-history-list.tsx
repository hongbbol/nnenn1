'use client';
import { useState } from 'react';
import { Check, ChevronDown, Info, TriangleAlert } from 'lucide-react';
import type { RecommendationRow } from '@/lib/domain/types';
import { modeLabel } from '@/lib/recommendation/labels';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { PriorityOrderBox } from './priority-order-box';

/** 마이페이지 — 최근 추천 히스토리(최대 3건). 카드를 누르면 그 날짜 추천 요약을 펼쳐 보여준다. */
export function RecHistoryList({ items }: { items: RecommendationRow[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-border-soft bg-surface-card p-6 text-center text-[14px] text-brand-sub">
        아직 추천 기록이 없어요. 온보딩을 마치면 여기에 쌓여요.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((r) => (
        <RecHistoryItem key={r.id} row={r} />
      ))}
    </div>
  );
}

function RecHistoryItem({ row: r }: { row: RecommendationRow }) {
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
          <div className="text-[14px] font-semibold text-brand-text">
            {r.cat_name}님 추천
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-brand-faint">{formatDate(r.created_at)}</span>
            <ChevronDown
              size={16}
              className={cn(
                'text-brand-faint transition-transform',
                open && 'rotate-180',
              )}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {r.summary.top.length > 0 ? (
            r.summary.top.map((t, i) => (
              <div key={t.foodId} className="flex items-center gap-2 text-[13px]">
                <span className="rounded-md bg-brand-primary-soft px-2 py-[2px] text-[11px] font-semibold text-brand-primary-ink">
                  TOP {i + 1}
                </span>
                <span className="min-w-0 truncate font-medium text-brand-text">
                  {t.brand} {t.productName}
                </span>
                <span className="ml-auto shrink-0 text-[12px] font-semibold text-brand-blue-deep">
                  {t.score}점
                </span>
              </div>
            ))
          ) : (
            <div className="text-[13px] text-brand-sub">
              조건에 맞는 사료를 찾지 못한 추천이에요.
            </div>
          )}
        </div>
      </button>

      {open && <RecHistoryDetail row={r} />}
    </div>
  );
}

function RecHistoryDetail({ row: r }: { row: RecommendationRow }) {
  if (!r.result) {
    return (
      <div className="border-t border-border-soft px-5 py-4 text-[13px] text-brand-sub">
        이 기록은 요약 정보만 있어요.
      </div>
    );
  }

  const { input, priorityOrder, top } = r.result;
  const conditions = [
    ...(input?.diseases?.length ? input.diseases.map(modeLabel) : ['질환 없음']),
    ...(input?.goal ? [input.goal] : []),
  ];

  return (
    <div className="flex flex-col gap-5 border-t border-border-soft px-5 py-5">
      {/* 적용 조건 */}
      <div>
        <DetailLabel>적용 조건</DetailLabel>
        <div className="flex flex-wrap gap-1.5">
          {conditions.map((c) => (
            <span
              key={c}
              className="rounded-full bg-surface-1 px-2.5 py-1 text-[12px] font-medium text-brand-sub"
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* 우선순위 */}
      {priorityOrder?.length > 0 && (
        <div>
          <DetailLabel>우선순위</DetailLabel>
          <PriorityOrderBox items={priorityOrder} />
        </div>
      )}

      {/* TOP 사료 + 근거 */}
      {top?.length > 0 && (
        <div>
          <DetailLabel>추천 사료와 근거</DetailLabel>
          <div className="flex flex-col gap-3">
            {top.map((item, i) => (
              <div
                key={item.food.id}
                className="rounded-[14px] border border-border-soft bg-surface-1 p-4"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <span className="mr-1.5 rounded-md bg-brand-text px-1.5 py-[2px] text-[10px] font-semibold text-white">
                      TOP {i + 1}
                    </span>
                    <span className="text-[13.5px] font-semibold text-brand-text">
                      {item.food.brand} {item.food.product_name}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-[14px] font-bold text-brand-text">
                    {item.score}
                  </span>
                </div>
                {item.reasons.length > 0 && (
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    {item.reasons.slice(0, 3).map((reason, j) => (
                      <div
                        key={j}
                        className="flex items-start gap-2 text-[12.5px] leading-[1.5]"
                      >
                        {reason.tone === 'good' ? (
                          <Check size={14} className="mt-0.5 shrink-0 text-brand-green" />
                        ) : reason.tone === 'warn' ? (
                          <TriangleAlert
                            size={14}
                            className="mt-0.5 shrink-0 text-brand-danger"
                          />
                        ) : (
                          <Info size={14} className="mt-0.5 shrink-0 text-brand-faint" />
                        )}
                        <span className="text-brand-sub">{reason.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-brand-faint">
      {children}
    </div>
  );
}
