'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UtensilsCrossed } from 'lucide-react';
import { AuthNavButton } from '@/components/auth/auth-nav-button';
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
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-8">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-yellow text-brand-blue-deep">
              <UtensilsCrossed size={20} />
            </div>
            <span className="text-[18px] font-bold tracking-[-0.025em] text-brand-text">
              완그릇
            </span>
          </Link>
          <span className="rounded-md bg-surface-1 px-[9px] py-[5px] text-[12px] font-semibold text-brand-sub">
            beta
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasProfile &&
            NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                active={pathname?.startsWith(item.href)}
              >
                {item.label}
              </NavLink>
            ))}
          {hasProfile && <div className="mx-2 h-[22px] w-px bg-border-soft" />}
          {/* 마이페이지는 로그인 전에도 노출 — 클릭 시 로그인으로 유도(미들웨어). */}
          <NavLink href="/mypage" active={pathname?.startsWith('/mypage')}>
            마이페이지
          </NavLink>
          {/* M3에서 /help 페이지 작성 시 NavLink로 교체. 현재는 placeholder. */}
          <span className="rounded-[10px] px-3.5 py-2 text-[14px] font-medium text-brand-faint">
            도움말
          </span>
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
}: {
  children: React.ReactNode;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-[10px] px-3.5 py-2 text-[14px] transition-colors',
        active
          ? 'bg-surface-1 font-semibold text-brand-text'
          : 'font-medium text-brand-sub hover:text-brand-text',
      )}
    >
      {children}
    </Link>
  );
}
