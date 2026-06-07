/**
 * Sanitize a user-supplied `next` redirect target to an internal path only.
 *
 * Prevents open-redirect: only same-origin absolute paths (starting with a
 * single `/`) are allowed. Anything that could navigate off-site — absolute
 * URLs (`http://`, `https://`), protocol-relative (`//host`), or backslash
 * tricks browsers normalize to `//` (`/\host`, `\\host`) — falls back.
 */
export function safeRedirectPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  // Must start with a single forward slash.
  if (raw[0] !== '/') return fallback;
  // Reject protocol-relative and backslash-normalized variants.
  if (raw[1] === '/' || raw[1] === '\\') return fallback;
  // Reject any backslash anywhere (browsers may treat `\` as `/`).
  if (raw.includes('\\')) return fallback;
  return raw;
}
