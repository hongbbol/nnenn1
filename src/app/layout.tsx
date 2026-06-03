import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '@/styles/globals.css';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body>{children}</body>
    </html>
  );
}
