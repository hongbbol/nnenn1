import type { RecommendationRow } from '@/lib/domain/types';
import { formatDate } from '@/lib/format';

/** 마이페이지 — 최근 추천 히스토리(최대 3건). */
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
        <div
          key={r.id}
          className="rounded-[16px] border border-border-soft bg-surface-card p-5"
        >
          <div className="flex items-center justify-between">
            <div className="text-[14px] font-semibold text-brand-text">
              {r.cat_name}님 추천
            </div>
            <div className="text-[12px] text-brand-faint">
              {formatDate(r.created_at)}
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
        </div>
      ))}
    </div>
  );
}
