import { redirect } from 'next/navigation';
import { Info, Sparkles } from 'lucide-react';
import { TopNavServer } from '@/components/layout/top-nav-server';
import { ProfileBanner } from '@/components/domain/profile-banner';
import { PriorityOrderBox } from '@/components/domain/priority-order-box';
import { FoodRecCard } from '@/components/domain/food-rec-card';
import { EditProfileButton } from '@/components/domain/edit-profile-button';
import { CompareButton } from '@/components/domain/compare-button';
import { getCurrentUser } from '@/lib/auth/user';
import {
  getCatPhotoUrl,
  getOwnedCat,
  getRecentRecommendations,
} from '@/lib/data/queries';
import { catRowToGuestCat } from '@/lib/domain/cat-mapping';

/**
 * 추천 결과 페이지. 저장은 온보딩 완료 시 1회 수행되므로 여기서는 가장 최근
 * 추천(recommendations 최신 1건)을 그대로 표시한다(재계산·중복 저장 없음).
 */
export default async function RecommendationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in?next=/recommendations');

  const [cat, recs] = await Promise.all([
    getOwnedCat(),
    getRecentRecommendations(1),
  ]);
  const latest = recs[0];
  if (!latest) redirect('/onboarding/basics');

  const result = latest.result;
  const imageSrc = await getCatPhotoUrl(cat?.hero_image_path);

  return (
    <>
      <TopNavServer />
      <div className="min-h-[calc(100vh-68px)] bg-brand-bg pb-24">
        <div className="mx-auto max-w-[720px] px-8 pt-10">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-brand-blue-deep">
            <Sparkles size={15} />
            추천 결과
          </div>
          <h1 className="mt-2 text-[30px] font-bold leading-[1.2] tracking-[-0.02em] text-brand-text">
            {result.input.name}님께 맞는 사료를 찾았어요
          </h1>

          <div className="mt-7">
            <ProfileBanner input={result.input} imageSrc={imageSrc} />
          </div>

          {result.notices.length > 0 && (
            <div className="mt-5 flex flex-col gap-2.5">
              {result.notices.map((n, i) => (
                <div
                  key={i}
                  className="flex gap-2.5 rounded-[12px] bg-brand-blue px-4 py-3.5 text-[13px] font-medium leading-[1.55] text-brand-blue-deep"
                >
                  <Info size={15} className="mt-0.5 shrink-0" />
                  <span>{n}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8">
            <PriorityOrderBox items={result.priorityOrder} />
          </div>

          <div className="mt-8 flex flex-col gap-4">
            {result.top.length > 0 ? (
              result.top.map((item, i) => (
                <FoodRecCard key={item.food.id} item={item} rank={i} />
              ))
            ) : (
              <div className="rounded-[18px] border border-border-soft bg-surface-card p-8 text-center text-[14px] leading-[1.6] text-brand-sub">
                입력하신 조건을 모두 만족하는 사료를 아직 찾지 못했어요.
                <br />
                질환이 여러 개이거나 회피 원료가 많은 경우일 수 있어요. 수의사와 상의해보세요.
              </div>
            )}
          </div>

          {result.top.length > 0 && (
            <div className="mt-8">
              <CompareButton />
            </div>
          )}

          {cat && (
            <div className="mt-4 text-center">
              <EditProfileButton
                cat={catRowToGuestCat(cat)}
                variant="text"
                label="입력 정보 수정"
              />
            </div>
          )}

          <p className="mt-8 text-center text-[12px] leading-[1.6] text-brand-faint">
            본 추천은 정보 제공용이며 수의학적 진단·처방을 대체하지 않습니다.
            <br />
            데이터는 MVP 예시 데이터셋(수입 전용) 기준입니다.
          </p>
        </div>
      </div>
    </>
  );
}
