import 'server-only';
import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Returns the authenticated user for the current request, or `null` for guests.
 *
 * Uses `getUser()` (not `getSession()`) so the token is validated against the
 * auth server. Safe to call from Server Components: middleware already refreshed
 * the session this request, so this only reads cookies (no cookie writes).
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
