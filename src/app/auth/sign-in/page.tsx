import { redirect } from 'next/navigation';
import { Card, H2 } from '@/components/ui';
import { TopNav } from '@/components/layout/top-nav';
import { getCurrentUser } from '@/lib/auth/user';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import { GoogleSignInButton } from './_google-button';

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
          <H2 className="text-center text-[24px]">로그인</H2>
          <p className="mt-2 text-center text-[14px] leading-relaxed text-brand-sub">
            로그인하시면 추천·비교·저장 이력이 계속 기억돼요.
          </p>

          {error === 'oauth' && (
            <p className="mt-4 rounded-[10px] bg-surface-1 px-4 py-3 text-center text-[13px] text-brand-text">
              로그인에 실패했어요. 다시 시도해 주세요.
            </p>
          )}

          <div className="mt-6">
            <GoogleSignInButton next={next} />
          </div>

          <p className="mt-5 text-center text-[12px] leading-relaxed text-brand-faint">
            로그인하면 이용약관과 개인정보처리방침에 동의하는 것으로 간주됩니다.
          </p>
        </Card>
      </main>
    </>
  );
}
