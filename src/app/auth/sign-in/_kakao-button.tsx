'use client';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';

/**
 * 카카오 로그인(주 로그인 수단 — 2026-10-22 사용자 결정: 게스트 없음, 카카오 필수).
 * Supabase Auth 기본 제공자 `kakao` 사용(dev-plan R1의 "1st-class 미지원 → 우회" 전제는 더 이상 사실이 아님).
 * 콜백은 Google과 같은 /auth/callback(PKCE code → 세션 교환).
 * 버튼 색은 카카오 디자인 가이드(컨테이너 #FEE500 · 심볼/라벨 #000000 85%).
 */
export function KakaoSignInButton({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const safeNext = safeRedirectPath(next, '/');
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      },
    });
    // 성공 시 브라우저가 카카오로 이동 — 여기 도달하는 건 에러일 때뿐.
    if (error) setLoading(false);
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={signIn}
      className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#FEE500] text-[15px] font-semibold text-[rgba(0,0,0,0.85)] transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      <KakaoSymbol />
      {loading ? '이동 중…' : '카카오로 시작하기'}
    </button>
  );
}

/** 카카오 말풍선 심볼(단색). */
function KakaoSymbol() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.86 5.33 4.66 6.76l-.95 3.55c-.08.3.26.55.52.38l4.2-2.8c.51.07 1.03.11 1.57.11 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
    </svg>
  );
}
