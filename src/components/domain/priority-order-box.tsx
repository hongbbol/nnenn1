import type { PriorityItem } from '@/lib/recommendation';

/** 추천 우선순위 박스 — "이 추천에서 무엇을 가장 중요하게 봤는가"(레지스트리 §0-2). */
export function PriorityOrderBox({ items }: { items: PriorityItem[] }) {
  return (
    <div className="rounded-[18px] border border-border-soft bg-surface-card p-6">
      <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-brand-sub">
        추천 우선순위
      </div>
      <p className="mt-1.5 text-[13px] leading-[1.5] text-brand-sub">
        아이 조건에 맞춰 이런 기준 순서로 사료를 골랐어요.
      </p>
      <div className="mt-5 flex flex-col gap-4">
        {items.map((it, i) => (
          <div key={it.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[12px] font-semibold text-brand-faint">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[14.5px] font-bold text-brand-text">{it.label}</span>
              </div>
              <span className="text-[12px] text-brand-sub">{it.detail}</span>
            </div>
            <div className="h-[7px] overflow-hidden rounded-full bg-surface-1">
              <div
                className="h-full rounded-full bg-brand-yellow"
                style={{ width: `${Math.round(it.weight * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
