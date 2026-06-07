import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Sign out. Invoked via a `<form method="post" action="/auth/sign-out">`.
 * `signOut()` clears the auth cookies; the 303 redirect makes the browser
 * follow up with a GET to `/`.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
