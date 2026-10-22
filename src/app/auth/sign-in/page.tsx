import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, H2 } from '@/components/ui';
import { TopNav } from '@/components/layout/top-nav';
import { getCurrentUser } from '@/lib/auth/user';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import { GoogleSignInButton } from './_google-button';
import { KakaoSignInButton } from './_kakao-button';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next: rawNext, error } = await searchParams;
  const next = safeRedirectPath(rawNext, '/');

  // Already signed in → skip the page.
  const user = await getCurrentUser();
  if (user) redirect(next);

  return (
    <>
      <TopNav authed={false} />
      <main className="mx-auto flex min-h-[calc(100vh-68px)] max-w-[440px] flex-col items-center justify-center px-6">
        <Card padding={32} className="w-full">
          <H2 className="text-center !text-[24px]">로그인</H2>
          <p className="mt-2 text-center text-[14px] leading-relaxed text-brand-sub">
            로그인하시면 추천·비교·저장 이력이 계속 기억돼요.
          </p>

          {error === 'oauth' && (
            <p className="mt-4 rounded-[10px] bg-surface-1 px-4 py-3 text-center text-[13px] text-brand-text">
              로그인에 실패했어요. 다시 시도해 주세요.
            </p>
          )}

          {/* 카카오가 주 로그인(2026-10-22 결정). Google은 기존 계정 호환용 보조 — 제거 여부는 사용자 결정. */}
          <div className="mt-6 flex flex-col gap-2.5">
            <KakaoSignInButton next={next} />
            <GoogleSignInButton next={next} />
          </div>

          <p className="mt-5 text-center text-[12px] leading-relaxed text-brand-faint">
            로그인하면{' '}
            <Link href="/legal/terms" className="underline">
              이용약관
            </Link>
            과{' '}
            <Link href="/legal/privacy" className="underline">
              개인정보처리방침
            </Link>
            에 동의하는 것으로 간주됩니다. 만 14세 이상만 이용할 수 있어요.
          </p>
        </Card>
      </main>
    </>
  );
}
