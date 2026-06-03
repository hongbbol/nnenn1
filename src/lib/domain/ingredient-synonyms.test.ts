import { describe, expect, it } from 'vitest';
import { INGREDIENT_SYNONYMS, expandAvoidKeywords } from './ingredient-synonyms';

describe('INGREDIENT_SYNONYMS sanity', () => {
  it('every key includes itself as a synonym', () => {
    for (const [key, syns] of Object.entries(INGREDIENT_SYNONYMS)) {
      expect(syns).toContain(key);
    }
  });

  it('covers core categories', () => {
    expect(Object.keys(INGREDIENT_SYNONYMS).sort()).toEqual(
      ['곡물', '닭', '소고기', '연어', '옥수수', '생선', '유제품'].sort(),
    );
  });
});

describe('expandAvoidKeywords', () => {
  it('expands 닭 to its synonyms incl. chicken/치킨', () => {
    const r = expandAvoidKeywords(['닭']);
    expect(r).toContain('닭');
    expect(r).toContain('치킨');
    expect(r).toContain('chicken');
  });

  it('expands 소고기 to beef/쇠고기/우육', () => {
    const r = expandAvoidKeywords(['소고기']);
    expect(r).toEqual(expect.arrayContaining(['소고기', '쇠고기', '우육', 'beef']));
  });

  it('expands 생선 to salmon/tuna/연어/참치/대구', () => {
    const r = expandAvoidKeywords(['생선']);
    expect(r).toEqual(
      expect.arrayContaining(['생선', '어류', '연어', '참치', '대구', 'salmon', 'tuna']),
    );
  });

  it('곡물 includes corn/wheat/rice/옥수수/밀/쌀/보리', () => {
    const r = expandAvoidKeywords(['곡물']);
    expect(r).toEqual(
      expect.arrayContaining([
        '곡물',
        '옥수수',
        '밀',
        '쌀',
        '보리',
        'corn',
        'wheat',
        'rice',
      ]),
    );
  });

  it('유제품 includes dairy/milk/우유/치즈/요거트', () => {
    const r = expandAvoidKeywords(['유제품']);
    expect(r).toEqual(
      expect.arrayContaining(['유제품', '우유', '치즈', '요거트', 'dairy', 'milk']),
    );
  });

  it('unknown ingredients pass through as themselves (lowercased)', () => {
    expect(expandAvoidKeywords(['양고기'])).toEqual(['양고기']);
    expect(expandAvoidKeywords(['LAMB'])).toEqual(['lamb']);
  });

  it('deduplicates across multiple inputs (연어 ⊂ 생선)', () => {
    const r = expandAvoidKeywords(['생선', '연어']);
    const count = (k: string) => r.filter((x) => x === k).length;
    expect(count('salmon')).toBe(1);
    expect(count('연어')).toBe(1);
  });

  it('output is all-lowercase (matching food.ingredient_keywords convention)', () => {
    const r = expandAvoidKeywords(['닭', '소고기', '생선', 'CORN']);
    for (const k of r) expect(k).toBe(k.toLowerCase());
  });

  it('empty input → empty output', () => {
    expect(expandAvoidKeywords([])).toEqual([]);
  });
});
