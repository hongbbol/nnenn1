import { redirect } from 'next/navigation';
import { Info, Scale } from 'lucide-react';
import { TopNavServer } from '@/components/layout/top-nav-server';
import { ComparisonTable } from '@/components/domain/comparison-table';
import { getCurrentUser } from '@/lib/auth/user';
import { getFoodById, getOwnedCat, getRecentRecommendations } from '@/lib/data/queries';
import { buildComparison, resolveBaseline } from '@/lib/recommendation/compare';

/**
 * 비교 페이지. 현재 프로필의 최신 추천 사료를 현재 먹이는 사료(baseline)와 표로 비교.
 * 저장(히스토리)은 추천 페이지의 CompareButton → saveCurrentComparison에서 수행하고,
 * 이 페이지는 표시 전용이다(직접/마이페이지 진입 시 중복 저장 방지).
 */
export default async function ComparePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in?next=/compare');

  const [cat, recs] = await Promise.all([
    getOwnedCat(),
    getRecentRecommendations(1),
  ]);
  if (!cat) redirect('/onboarding/basics');
  const latest = recs[0];
  if (!latest || latest.result.top.length === 0) redirect('/recommendations');

  const candidates = latest.result.top.map((t) => t.food);
  const currentFood = cat.current_food_id ? await getFoodById(cat.current_food_id) : null;
  const baseline = resolveBaseline(cat, currentFood);
  const comparison = buildComparison(baseline, candidates);

  return (
    <>
      <TopNavServer />
      <div className="min-h-[calc(100vh-68px)] bg-brand-bg pb-24">
        <div className="mx-auto max-w-[820px] px-8 pt-10">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-brand-blue-deep">
            <Scale size={15} />
            비교
          </div>
          <h1 className="mt-2 text-[30px] font-bold leading-[1.2] tracking-[-0.02em] text-brand-text">
            {cat.name}님의 현재 사료와 추천을 비교했어요
          </h1>

          {baseline.source !== 'db' && (
            <div className="mt-5 flex gap-2.5 rounded-[12px] bg-brand-blue px-4 py-3.5 text-[13px] font-medium leading-[1.55] text-brand-blue-deep">
              <Info size={15} className="mt-0.5 shrink-0" />
              <span>
                {baseline.source === 'text'
                  ? '현재 사료를 직접 입력하셔서 영양 정보가 없어요. 추천 사료끼리 비교해드릴게요 — 현재 사료를 목록에서 선택하면 직접 비교가 가능해요.'
                  : '현재 사료 정보가 없어 추천 사료끼리 비교해드릴게요.'}
              </span>
            </div>
          )}

          <div className="mt-7">
            <ComparisonTable result={comparison} />
          </div>

          <p className="mt-8 text-center text-[12px] leading-[1.6] text-brand-faint">
            본 비교는 정보 제공용이며 수의학적 진단·처방을 대체하지 않습니다.
          </p>
        </div>
      </div>
    </>
  );
}
