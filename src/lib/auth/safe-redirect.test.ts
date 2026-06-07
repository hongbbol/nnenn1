import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './safe-redirect';

describe('safeRedirectPath', () => {
  it('accepts internal absolute paths', () => {
    expect(safeRedirectPath('/')).toBe('/');
    expect(safeRedirectPath('/onboarding/basics')).toBe('/onboarding/basics');
    expect(safeRedirectPath('/cat?x=1')).toBe('/cat?x=1');
  });

  it('rejects protocol-relative URLs', () => {
    expect(safeRedirectPath('//evil.com')).toBe('/');
  });

  it('rejects absolute URLs', () => {
    expect(safeRedirectPath('http://evil.com')).toBe('/');
    expect(safeRedirectPath('https://evil.com/path')).toBe('/');
  });

  it('rejects backslash tricks', () => {
    expect(safeRedirectPath('/\\evil.com')).toBe('/');
    expect(safeRedirectPath('\\\\evil.com')).toBe('/');
    expect(safeRedirectPath('/path\\x')).toBe('/');
  });

  it('rejects null, undefined, and empty', () => {
    expect(safeRedirectPath(null)).toBe('/');
    expect(safeRedirectPath(undefined)).toBe('/');
    expect(safeRedirectPath('')).toBe('/');
  });

  it('rejects bare paths not starting with slash', () => {
    expect(safeRedirectPath('evil.com')).toBe('/');
  });

  it('honors a custom fallback', () => {
    expect(safeRedirectPath(null, '/auth/sign-in')).toBe('/auth/sign-in');
    expect(safeRedirectPath('//evil.com', '/home')).toBe('/home');
  });
});
