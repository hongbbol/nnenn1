'use client';
import { useEffect } from 'react';
import { useGuestStore } from '@/lib/guest-store';

/**
 * 로그인 사용자 id를 게스트 스토어에 동기화한다(루트 레이아웃에서 렌더).
 * 주인이 바뀌면(다른 계정 로그인·로그아웃) 스토어가 스스로 리셋해, 같은 브라우저의 이전 계정 입력이
 * 새 계정 온보딩 폼에 prefill되는 일을 막는다. 화면에는 아무것도 그리지 않는다.
 */
export function GuestOwnerSync({ userId }: { userId: string | null }) {
  const syncOwner = useGuestStore((s) => s.syncOwner);
  useEffect(() => {
    syncOwner(userId);
  }, [userId, syncOwner]);
  return null;
}
