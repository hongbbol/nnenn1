'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CircleUserRound, UtensilsCrossed } from 'lucide-react';
import { AuthNavButton } from '@/components/auth/auth-nav-button';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

const NAV_ITEMS = [
  { href: '/recommendations', label: '추천 결과', requiresProfile: true },
  { href: '/compare', label: '비교', requiresProfile: true },
];

export function TopNav({
  hasProfile = false,
  authed,
}: {
  hasProfile?: boolean;
  authed?: boolean;
}) {
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-50 border-b border-border-soft bg-brand-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between gap-3 px-4 md:h-[68px] md:px-8">
        <div className="flex shrink-0 items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-primary text-white">
              <UtensilsCrossed size={20} />
            </div>
            <span className="whitespace-nowrap text-[18px] font-bold tracking-[-0.025em] text-brand-text">
              완그릇
            </span>
          </Link>
          <span className="hidden rounded-md bg-surface-1 px-[9px] py-[5px] text-[12px] font-semibold text-brand-sub md:inline-block">
            beta
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 md:gap-2">
          {hasProfile &&
            NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                active={pathname?.startsWith(item.href)}
                className="hidden md:block"
              >
                {item.label}
              </NavLink>
            ))}
          {hasProfile && <div className="mx-2 hidden h-[22px] w-px bg-border-soft md:block" />}
          {/* 마이페이지는 로그인 전에도 노출 — 클릭 시 로그인으로 유도(미들웨어).
              모바일에서는 아이콘으로 축약, md 이상에서 텍스트 링크. */}
          <Link
            href="/mypage"
            aria-label="마이페이지"
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-[10px] transition-colors md:hidden',
              pathname?.startsWith('/mypage')
                ? 'bg-surface-1 text-brand-text'
                : 'text-brand-sub hover:text-brand-text',
            )}
          >
            <CircleUserRound size={22} />
          </Link>
          <NavLink
            href="/mypage"
            active={pathname?.startsWith('/mypage')}
            className="hidden md:block"
          >
            마이페이지
          </NavLink>
          {/* M3에서 /help 페이지 작성 시 NavLink로 교체. 현재는 placeholder. */}
          <span className="hidden rounded-[10px] px-3.5 py-2 text-[14px] font-medium text-brand-faint md:block">
            도움말
          </span>
          {/* 시작하기 — 인증 버튼(로그인/로그아웃) 앞에 노출. 온보딩 1단계로 진입. */}
          <Link href="/onboarding/basics">
            <Button variant="primary" size="md" className="whitespace-nowrap">
              시작하기
            </Button>
          </Link>
          <AuthNavButton authed={authed} />
        </div>
      </div>
    </div>
  );
}

function NavLink({
  children,
  href,
  active,
  className,
}: {
  children: React.ReactNode;
  href: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'whitespace-nowrap rounded-[10px] px-3.5 py-2 text-[14px] transition-colors',
        active
          ? 'bg-surface-1 font-semibold text-brand-text'
          : 'font-medium text-brand-sub hover:text-brand-text',
        className,
      )}
    >
      {children}
    </Link>
  );
}
