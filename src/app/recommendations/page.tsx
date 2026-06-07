'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Info, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';
import { TopNav } from '@/components/layout/top-nav';
import { ProfileBanner } from '@/components/domain/profile-banner';
import { PriorityOrderBox } from '@/components/domain/priority-order-box';
import { FoodRecCard } from '@/components/domain/food-rec-card';
import { useGuestStore } from '@/lib/guest-store';
import { recommendFromProfile, SEED_FOODS } from '@/lib/recommendation';

export default function RecommendationsPage() {
  const router = useRouter();
  const cat = useGuestStore((s) => s.cat);
  const demoMode = useGuestStore((s) => s.demoMode);

  // zustand persist 하이드레이션을 기다린다 — 새로고침 직후 빈 store로 잘못 리다이렉트 방지.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const result = useMemo(() => recommendFromProfile(cat, SEED_FOODS), [cat]);

  useEffect(() => {
    if (hydrated && !result) router.replace('/onboarding/basics');
  }, [hydrated, result, router]);

  if (!hydrated || !result) {
    return (
      <>
        <TopNav hasProfile />
        <div className="mx-auto max-w-[720px] px-8 pt-24 text-center text-brand-sub">
          추천 결과를 불러오는 중…
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav hasProfile />
      <div className="min-h-[calc(100vh-68px)] bg-brand-bg pb-24">
        <div className="mx-auto max-w-[720px] px-8 pt-10">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-brand-blue-deep">
            <Sparkles size={15} />
            추천 결과
            {demoMode && (
              <span className="rounded-md bg-brand-blue px-2 py-[3px] text-[11px] text-brand-blue-deep">
                예시 데이터입니다
              </span>
            )}
          </div>
          <h1 className="mt-2 text-[30px] font-bold leading-[1.2] tracking-[-0.02em] text-brand-text">
            {result.input.name}님께 맞는 사료를 찾았어요
          </h1>

          <div className="mt-7">
            <ProfileBanner input={result.input} imageSrc={cat.hero_image_preview} />
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
              <Button variant="dark" full disabled title="비교 기능은 곧 제공돼요">
                현재 사료와 비교하기 (준비 중)
              </Button>
            </div>
          )}

          <div className="mt-4 text-center">
            <Button variant="text" onClick={() => router.push('/onboarding/goal')}>
              입력 정보 수정
            </Button>
          </div>

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
