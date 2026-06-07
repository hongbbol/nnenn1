'use client';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';

export function GoogleSignInButton({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const safeNext = safeRedirectPath(next, '/');
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      },
    });
    // On success the browser navigates to Google; only reachable on error.
    if (error) setLoading(false);
  }

  return (
    <Button variant="ghost" size="lg" full disabled={loading} onClick={signIn}>
      {loading ? '이동 중…' : 'Google로 계속하기'}
    </Button>
  );
}
