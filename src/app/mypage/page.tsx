import { redirect } from 'next/navigation';
import { TopNavServer } from '@/components/layout/top-nav-server';
import { ProfileCard } from '@/components/domain/profile-card';
import { AddProfileButton } from '@/components/domain/add-profile-button';
import { MyPageHistory } from '@/components/domain/mypage-history';
import { getCurrentUser } from '@/lib/auth/user';
import { CAT_LIMIT } from '@/lib/domain/constants';
import {
  getCatPhotoUrl,
  getOwnedCats,
  getRecentComparisons,
  getRecentRecommendations,
} from '@/lib/data/queries';

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in?next=/mypage');

  const [cats, recs, comps] = await Promise.all([
    getOwnedCats(),
    // 고양이별 탭 필터를 위해 넉넉히 — 추천은 고양이당 최대 3건 prune되므로 6건이면 2마리 전부 커버.
    getRecentRecommendations(6),
    getRecentComparisons(20),
  ]);
  // 프로필이 없으면 아직 온보딩 전 — 입력부터.
  if (cats.length === 0) redirect('/onboarding/basics');

  const imageSrcs = await Promise.all(
    cats.map((c) => getCatPhotoUrl(c.hero_image_path)),
  );
  const atLimit = cats.length >= CAT_LIMIT;

  return (
    <>
      <TopNavServer />
      <div className="min-h-[calc(100vh-68px)] bg-brand-bg pb-24">
        <div className="mx-auto max-w-[820px] px-8 pt-10">
          <h1 className="text-[30px] font-bold leading-[1.2] tracking-[-0.02em] text-brand-text">
            마이페이지
          </h1>

          <section className="mt-7">
            <SectionTitle hint={`${cats.length}/${CAT_LIMIT}`}>내 아이 프로필</SectionTitle>
            <div className="flex flex-col gap-4">
              {cats.map((c, i) => (
                <ProfileCard key={c.id} cat={c} imageSrc={imageSrcs[i]} />
              ))}
            </div>
            <div className="mt-4">
              <AddProfileButton
                disabled={atLimit}
                label={atLimit ? `프로필은 최대 ${CAT_LIMIT}개까지` : '프로필 추가'}
                full
              />
            </div>
          </section>

          <MyPageHistory
            cats={cats.map((c) => ({ id: c.id, name: c.name }))}
            recs={recs}
            comps={comps}
          />
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
