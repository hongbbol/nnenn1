import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { GoogleAnalytics } from '@next/third-parties/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import '@/styles/globals.css';
import { getCurrentUser } from '@/lib/auth/user';
import { GuestOwnerSync } from '@/components/auth/guest-owner-sync';

const pretendard = localFont({
  src: '../../public/fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  display: 'swap',
  weight: '45 920',
});

export const metadata: Metadata = {
  title: '완그릇 — 우리 아이 컨디션에 맞는 사료',
  description:
    '중·노령·질환 고양이 보호자가 내 아이 조건에 맞는 사료를 이유와 함께 추천받고, 현재 사료와 비교해 전환 판단까지 돕는 서비스.',
  metadataBase: new URL('https://wangrut.com'),
  openGraph: {
    title: '완그릇',
    description: '우리 아이 컨디션에 맞는 사료를 알려드려요',
    type: 'website',
    locale: 'ko_KR',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 게스트 스토어(localStorage) 주인 동기화 — 계정이 바뀌면 이전 계정의 입력 버퍼를 비운다.
  const user = await getCurrentUser();
  // GA4 측정 ID: 환경변수 우선, 없으면 프로덕션 빌드에서만 기본값 사용.
  // (로컬·dev에서 실제 속성으로 트래픽이 새어 행동 분석이 오염되는 걸 방지)
  const gaId =
    process.env.NEXT_PUBLIC_GA_ID ||
    (process.env.NODE_ENV === 'production' ? 'G-B1CR2K6LNQ' : undefined);
  return (
    <html lang="ko" className={pretendard.variable}>
      <body>
        <GuestOwnerSync userId={user?.id ?? null} />
        {children}
        <SpeedInsights />
      </body>
      {gaId && <GoogleAnalytics gaId={gaId} />}
    </html>
  );
}
