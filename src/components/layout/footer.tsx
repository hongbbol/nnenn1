import Link from 'next/link';
import { Small } from '@/components/ui';

export function Footer() {
  return (
    <footer className="border-t border-border-soft bg-surface-1 py-8">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 md:px-8">
        <Small>© 2026 완그릇 — 가제. 본 추천은 의료 진단을 대체하지 않아요.</Small>
        <div className="flex gap-4">
          <Link href="/legal/terms">
            <Small>이용약관</Small>
          </Link>
          <Link href="/legal/privacy">
            <Small>개인정보</Small>
          </Link>
          <Link href="/legal/affiliate">
            <Small>광고·제휴 표기</Small>
          </Link>
          <Link href="/legal/medical-disclaimer">
            <Small>의료 면책</Small>
          </Link>
        </div>
      </div>
    </footer>
  );
}
