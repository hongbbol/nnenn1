import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * 로그인해야만 쓸 수 있는 경로. 미로그인 시 /auth/sign-in?next=…로 보낸다.
 * 랜딩('/')과 인증 흐름('/auth/*')은 공개.
 */
const PROTECTED_PREFIXES = [
  '/onboarding',
  '/recommendations',
  '/compare',
  '/mypage',
  '/cat',
];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet: CookieToSet[]) => {
          for (const { name, value } of toSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // refreshes the session if needed (no-op for guest users)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 보호 경로 + 미로그인 → 로그인 페이지로. 갱신된 세션 쿠키는 redirect 응답에 복사한다
  // (복사하지 않으면 로그인 직후에도 쿠키가 누락돼 리다이렉트 루프가 생긴다).
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/sign-in';
    url.search = '';
    url.searchParams.set('next', path);
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  return response;
}
