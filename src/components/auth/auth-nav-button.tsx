'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

/**
 * Login / logout affordance for the top nav.
 * - Signed out: link to /auth/sign-in, carrying the current path as `next`.
 * - Signed in: a POST form to /auth/sign-out (works without client JS).
 *
 * When the parent renders on the server it can pass `authed` to avoid a
 * flicker. On client-only parents (e.g. the onboarding layout) `authed` is
 * omitted and we resolve auth state from the browser client instead.
 */
export function AuthNavButton({ authed: authedProp }: { authed?: boolean }) {
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean>(authedProp ?? false);

  useEffect(() => {
    if (authedProp !== undefined) {
      setAuthed(authedProp);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });
    return () => data.subscription.unsubscribe();
  }, [authedProp]);

  if (authed) {
    return (
      <form method="post" action="/auth/sign-out">
        <Button type="submit" size="md" variant="ghost" className="whitespace-nowrap">
          로그아웃
        </Button>
      </form>
    );
  }

  const next = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
  return (
    <Link href={`/auth/sign-in${next}`}>
      <Button size="md" variant="ghost" className="whitespace-nowrap">
        로그인
      </Button>
    </Link>
  );
}
