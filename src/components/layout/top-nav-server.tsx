import { getCurrentUser } from '@/lib/auth/user';
import { hasCatProfile } from '@/lib/data/queries';
import { TopNav } from './top-nav';

/**
 * Server-side TopNav wrapper. 로그인 여부와 프로필(cats) 보유 여부를 서버에서
 * 판정해 client TopNav에 주입한다(메뉴 플리커 방지). server component에서 사용.
 */
export async function TopNavServer() {
  const user = await getCurrentUser();
  const hasProfile = user ? await hasCatProfile() : false;
  return <TopNav authed={!!user} hasProfile={hasProfile} />;
}
