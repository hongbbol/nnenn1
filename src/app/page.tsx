import Link from 'next/link';
import { ArrowRight, Cat, Check, Droplet, Heart, Leaf, Scale, Sparkles } from 'lucide-react';
import {
  Body,
  Button,
  Card,
  CatAvatar,
  Caption,
  Chip,
  FoodArt,
  H1,
  H2,
  H3,
  H4,
  Mono,
  Small,
} from '@/components/ui';
import { TopNavServer } from '@/components/layout/top-nav-server';
import { Footer } from '@/components/layout/footer';
import { StartButton } from '@/components/domain/start-button';
import { getOwnedCat, getCatPhotoUrl } from '@/lib/data/queries';
import { catRowToGuestCat } from '@/lib/domain/cat-mapping';
import type { GuestCat } from '@/lib/domain/types';

const HERO_FOODS = [
  {
    id: 'demo-1',
    brand: '로얄캐닌',
    product_name: '신장 케어 EARLY',
    category: '건식' as const,
    accent: '#CEE6F7',
    tags: ['저인', '저나트륨', '신장 케어'],
  },
  {
    id: 'demo-2',
    brand: '힐스 사이언스 다이어트',
    product_name: 'k/d 키드니 케어',
    category: '습식' as const,
    accent: '#FBEFC1',
    tags: ['수분 보충', '저인', '신장 처방식'],
  },
];

const STEPS = [
  {
    num: '01',
    title: '아이 정보 입력',
    sub: '나이·체중·질환·현재 사료·목표를 4단계로 입력해요. 진단 정보가 없어도 괜찮아요.',
    Icon: Cat,
  },
  {
    num: '02',
    title: 'TOP 2 추천',
    sub: '연령·질환 적합도, 성분, 기호성을 종합해서 가장 부담이 적은 두 가지를 골라드려요.',
    Icon: Sparkles,
  },
  {
    num: '03',
    title: '현재 사료와 비교',
    sub: '인·나트륨·칼로리가 어떻게 다른지 표로 보여드리고, 전환 가이드도 알려드려요.',
    Icon: Scale,
  },
];

const WHY = [
  {
    Icon: Droplet,
    title: '수분·인·나트륨까지 본다',
    sub: '주요 성분 9가지를 모두 비교해 종합 적합도를 계산해요.',
  },
  {
    Icon: Heart,
    title: '질환 가이드 반영',
    sub: '신부전·당뇨·결석 등 진단별 권장 영양 기준을 적용해요.',
  },
  {
    Icon: Leaf,
    title: '진단 없어도 OK',
    sub: '진단이 없어도 나이·체중·목표만으로 추천이 가능해요.',
  },
];

export default async function LandingPage() {
  // 기존 이용자(로그인 + 프로필 보유)는 저장된 '내 아이 프로필'을 온보딩 버퍼에 미리 채워
  // 다시 입력하지 않게 한다. 비로그인·무프로필은 prefill=null → 빈 온보딩.
  const ownedCat = await getOwnedCat();
  let prefill: GuestCat | null = null;
  if (ownedCat) {
    const photoUrl = await getCatPhotoUrl(ownedCat.hero_image_path);
    prefill = { ...catRowToGuestCat(ownedCat), hero_image_preview: photoUrl };
  }

  return (
    <div className="min-h-screen">
      <TopNavServer />

      {/* HERO */}
      <section className="mx-auto max-w-[1200px] px-8 pb-24 pt-16">
        <div className="grid items-center gap-16 md:grid-cols-[1.05fr_1fr]">
          <div>
            <Chip variant="blue" size="md" leading={<Leaf size={14} />} className="mb-[18px]">
              중·노령 고양이 전용
            </Chip>
            <H1 className="!text-[56px]">
              우리 아이 컨디션에 맞는
              <br />
              사료를{' '}
              <span
                style={{
                  background: 'linear-gradient(180deg, transparent 62%, #F6CC46 62%)',
                }}
              >
                골라
              </span>{' '}
              알려드려요
            </H1>
            <Body muted className="mt-6 max-w-[520px] !text-[17px] !leading-[1.65]">
              나이·체중·질환·현재 식단을 종합해서 가장 부담이 적은 사료 두 가지를 추천해요.
              왜 맞는지 한 줄 요약과 체크리스트로 보여드리고, 현재 사료와 성분도 표로 비교해드려요.
            </Body>
            <div className="mt-8 flex gap-3">
              <StartButton
                prefill={prefill}
                prefillCatId={ownedCat?.id ?? null}
                label="3분 안에 시작하기"
                trailing={<ArrowRight size={16} />}
              />
              <Link href="/demo">
                <Button variant="ghost">예시 결과 먼저 보기</Button>
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-6 text-[13px] text-brand-sub">
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-brand-green" /> 고양이 최적 맞춤
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-brand-green" /> 수의영양학 가이드 기반
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-brand-green" /> 비교 선택 가능
              </span>
            </div>
          </div>

          {/* hero preview card */}
          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-10 z-0"
              style={{
                background: 'radial-gradient(ellipse at center, #CEE6F755, transparent 70%)',
              }}
            />
            <Card padding={20} className="relative z-10 shadow-card-hero">
              <div className="mb-4 flex items-center gap-3">
                <CatAvatar name="낭낭이" size={44} />
                <div className="flex-1">
                  <H4>낭낭이 · 9살 · 4.7kg</H4>
                  <Small>신부전 초기 · 건식 위주</Small>
                </div>
                <Chip variant="ok" size="sm">
                  예시
                </Chip>
              </div>
              <div className="my-4 h-px bg-border-soft" />
              <Caption className="mb-3">추천 사료 TOP 2</Caption>
              {HERO_FOODS.map((f, i) => (
                <div
                  key={f.id}
                  className={
                    'flex items-center gap-3 py-3 ' + (i > 0 ? 'border-t border-border-soft' : '')
                  }
                >
                  <FoodArt accent={f.accent} label={f.category} size={56} brand={f.brand} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <Chip variant="yellow" size="sm">
                        TOP {i + 1}
                      </Chip>
                      <Small>{f.brand}</Small>
                    </div>
                    <H4 className="mt-1 !text-[14px]">{f.product_name}</H4>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {f.tags.slice(0, 3).map((t) => (
                        <Chip key={t} variant="blue" size="sm">
                          {t}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <div className="mt-3 rounded-[12px] bg-brand-yellow-soft px-3.5 py-2.5">
                <Small muted={false} className="!text-[12px] !font-semibold text-brand-yellow-dark">
                  💡 인 함량 약 52% ↓, 나트륨 약 48% ↓
                </Small>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-surface-1 py-20">
        <div className="mx-auto max-w-[1200px] px-8">
          <Caption className="mb-3">어떻게 알 수 있어요?</Caption>
          <H2 className="mb-12 max-w-[640px]">
            프로필 → 추천 → 비교, 우리 아이에게 맞는 사료를 만나요
          </H2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map(({ num, title, sub, Icon }) => (
              <Card key={num} padding={28}>
                <Mono className="text-[13px] font-semibold text-brand-faint">{num}</Mono>
                <div className="mb-[18px] mt-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-brand-blue text-brand-blue-deep">
                  <Icon size={24} />
                </div>
                <H3 className="mb-2">{title}</H3>
                <Body muted className="!text-[14px]">
                  {sub}
                </Body>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="py-20">
        <div className="mx-auto max-w-[1200px] px-8">
          <div className="grid items-start gap-16 md:grid-cols-2">
            <div>
              <Caption className="mb-3">왜 완그릇이에요?</Caption>
              <H2 className="mb-6">광고가 아닌, 우리 아이 기준으로 골라요</H2>
              <Body muted className="!text-[16px] !leading-[1.7]">
                대부분의 사료 추천은 &ldquo;잘 팔리는 제품&rdquo; 중심이에요. 완그릇은 우리 아이
                나이와 진단을 먼저 보고, 성분 기준으로만 사료를 거른 다음, 그중에서 가장 적합한
                두 가지를 골라요. 제휴 링크와 추천 결과는 분리해서 표기해요.
              </Body>
            </div>
            <div className="flex flex-col gap-3">
              {WHY.map(({ Icon, title, sub }) => (
                <Card key={title} padding={20} hoverable>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-blue text-brand-blue-deep">
                      <Icon size={20} />
                    </div>
                    <div>
                      <H4>{title}</H4>
                      <Body muted className="mt-1 !text-[14px]">
                        {sub}
                      </Body>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BIG CTA */}
      <section className="pb-24">
        <div className="mx-auto max-w-[1200px] px-8">
          <Card
            padding={48}
            className="flex flex-wrap items-center justify-between gap-6 !border-brand-text !bg-brand-text"
          >
            <div>
              <H2 className="mb-2 !text-white">지금 아이 정보로 시작해볼까요?</H2>
              <Body className="!text-white/70">
                3분 정도 걸려요. 진단이나 사료명을 모르면 비워두셔도 돼요.
              </Body>
            </div>
            <StartButton
              prefill={prefill}
              prefillCatId={ownedCat?.id ?? null}
              variant="primary"
              label="추천 받기 시작"
              trailing={<ArrowRight size={16} />}
            />
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
