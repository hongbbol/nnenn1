import { describe, expect, it } from 'vitest';
import { butlerName, catCallName } from './honorific';

describe('호칭 — "{고양이 이름}집사님" (2026-10-22 결정)', () => {
  it('받침 있는 이름엔 "이"를 붙인다', () => {
    expect(catCallName('낭낭')).toBe('낭낭이');
    expect(catCallName('하늘')).toBe('하늘이');
    expect(catCallName('가을')).toBe('가을이');
  });
  it('받침 없는 이름·비한글은 그대로', () => {
    expect(catCallName('베리')).toBe('베리');
    expect(catCallName('나비')).toBe('나비');
    expect(catCallName('Tom')).toBe('Tom');
    expect(catCallName(' 코코 ')).toBe('코코');
  });
  it('집사 호칭은 첫 고양이 기준, 없으면 "집사님"', () => {
    expect(butlerName(['낭낭', '베리'])).toBe('낭낭이집사님');
    expect(butlerName(['베리'])).toBe('베리집사님');
    expect(butlerName([])).toBe('집사님');
    expect(butlerName(['', '낭낭'])).toBe('낭낭이집사님');
  });
});
