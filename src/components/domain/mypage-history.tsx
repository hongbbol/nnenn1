'use client';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { RecHistoryList } from './rec-history-list';
import { ComparisonHistoryList } from './comparison-history-list';
import type { ComparisonRow, RecommendationRow } from '@/lib/domain/types';

type CatTab = { id: string; name: string };

/**
 * 마이페이지 추천·비교 히스토리. 프로필이 2개 이상이면 상단 탭으로 고양이별 기록을
 * 즉시 전환해 보여준다(데이터는 이미 전부 로드돼 있어 리로드 없음). 1개면 탭 없이 전체 표시.
 * cat_id로 필터하므로 삭제된 프로필(cat_id=null)의 기록은 탭에 나타나지 않는다.
 */
export function MyPageHistory({
  cats,
  recs,
  comps,
}: {
  cats: CatTab[];
  recs: RecommendationRow[];
  comps: ComparisonRow[];
}) {
  const multi = cats.length > 1;
  const [activeId, setActiveId] = useState(cats[0]?.id ?? '');

  const shownRecs = multi ? recs.filter((r) => r.cat_id === activeId) : recs;
  const shownComps = multi ? comps.filter((c) => c.cat_id === activeId) : comps;

  return (
    <>
      {multi && (
        <div className="mt-10 flex flex-wrap gap-1.5">
          {cats.map((c) => {
            const active = c.id === activeId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors',
                  active
                    ? 'bg-brand-text text-white'
                    : 'bg-surface-card text-brand-sub hover:text-brand-text',
                )}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      <section className={multi ? 'mt-5' : 'mt-10'}>
        <SectionTitle hint={`최근 ${shownRecs.length}건`}>추천 히스토리</SectionTitle>
        <RecHistoryList items={shownRecs} />
      </section>

      <section className="mt-10">
        <SectionTitle>비교 히스토리</SectionTitle>
        <ComparisonHistoryList items={shownComps} />
      </section>
    </>
  );
}

function SectionTitle({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <h2 className="text-[16px] font-bold text-brand-text">{children}</h2>
      {hint && <span className="text-[12px] font-medium text-brand-faint">{hint}</span>}
    </div>
  );
}
