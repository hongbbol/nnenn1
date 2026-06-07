import { redirect } from 'next/navigation';
import { TopNavServer } from '@/components/layout/top-nav-server';
import { ProfileCard } from '@/components/domain/profile-card';
import { RecHistoryList } from '@/components/domain/rec-history-list';
import { ComparisonHistoryList } from '@/components/domain/comparison-history-list';
import { getCurrentUser } from '@/lib/auth/user';
import {
  getCatPhotoUrl,
  getOwnedCat,
  getRecentComparisons,
  getRecentRecommendations,
} from '@/lib/data/queries';

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in?next=/mypage');

  const [cat, recs, comps] = await Promise.all([
    getOwnedCat(),
    getRecentRecommendations(3),
    getRecentComparisons(5),
  ]);
  // 프로필이 없으면 아직 온보딩 전 — 입력부터.
  if (!cat) redirect('/onboarding/basics');

  const imageSrc = await getCatPhotoUrl(cat.hero_image_path);

  return (
    <>
      <TopNavServer />
      <div className="min-h-[calc(100vh-68px)] bg-brand-bg pb-24">
        <div className="mx-auto max-w-[820px] px-8 pt-10">
          <h1 className="text-[30px] font-bold leading-[1.2] tracking-[-0.02em] text-brand-text">
            마이페이지
          </h1>

          <section className="mt-7">
            <SectionTitle>내 아이 프로필</SectionTitle>
            <ProfileCard cat={cat} imageSrc={imageSrc} />
          </section>

          <section className="mt-10">
            <SectionTitle hint={`최근 ${recs.length}건`}>추천 히스토리</SectionTitle>
            <RecHistoryList items={recs} />
          </section>

          <section className="mt-10">
            <SectionTitle>비교 히스토리</SectionTitle>
            <ComparisonHistoryList items={comps} />
          </section>
        </div>
      </div>
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
