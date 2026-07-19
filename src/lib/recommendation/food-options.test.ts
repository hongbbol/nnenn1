import { describe, expect, it } from 'vitest';
import { filterFoodOptions, foodOptionLabel, getFoodOptions, type FoodOption } from './food-options';

const OPTS: FoodOption[] = [
  { id: 'a', brand: 'KidneyCare', productName: '리날 서포트 습식', category: '습식' },
  { id: 'b', brand: 'KidneyCare', productName: '리날 서포트 건식', category: '건식' },
  { id: 'c', brand: 'GlucoBalance', productName: '다이아 컨트롤 습식', category: '습식' },
];

describe('filterFoodOptions', () => {
  it('빈 쿼리는 빈 배열(드롭다운 미노출)', () => {
    expect(filterFoodOptions(OPTS, '')).toEqual([]);
    expect(filterFoodOptions(OPTS, '   ')).toEqual([]);
  });

  it('제품명 부분일치', () => {
    const r = filterFoodOptions(OPTS, '다이아');
    expect(r.map((o) => o.id)).toEqual(['c']);
  });

  it('브랜드 부분일치 — 여러 건', () => {
    const r = filterFoodOptions(OPTS, 'kidney');
    expect(r.map((o) => o.id)).toEqual(['a', 'b']);
  });

  it('대소문자 무시', () => {
    expect(filterFoodOptions(OPTS, 'GLUCO').map((o) => o.id)).toEqual(['c']);
  });

  it('상위 N개로 cap', () => {
    const many: FoodOption[] = Array.from({ length: 20 }, (_, i) => ({
      id: `f${i}`,
      brand: 'Brand',
      productName: `사료 ${i}`,
      category: '건식',
    }));
    expect(filterFoodOptions(many, 'Brand', 8)).toHaveLength(8);
  });

  it('토큰 AND 매칭 — 브랜드+제품명 혼합 검색', () => {
    const r = filterFoodOptions(OPTS, 'kidney 건식');
    expect(r.map((o) => o.id)).toEqual(['b']);
  });

  it('영문 브랜드를 한글 별칭으로 검색', () => {
    const rc: FoodOption[] = [
      { id: 'r1', brand: 'Royal Canin', productName: '유리너리 SO 드라이', category: '건식' },
      { id: 'h1', brand: "Hill's Pet Nutrition", productName: '처방식 k/d 치킨', category: '건식' },
    ];
    expect(filterFoodOptions(rc, '로얄캐닌').map((o) => o.id)).toEqual(['r1']);
    expect(filterFoodOptions(rc, '힐스 k/d').map((o) => o.id)).toEqual(['h1']);
  });
});

describe('foodOptionLabel', () => {
  it('브랜드 + 제품명', () => {
    expect(foodOptionLabel(OPTS[0])).toBe('KidneyCare 리날 서포트 습식');
  });
});

describe('getFoodOptions', () => {
  it('활성 사료를 경량 옵션으로 반환', () => {
    const opts = getFoodOptions();
    expect(opts.length).toBeGreaterThan(0);
    for (const o of opts) {
      expect(typeof o.id).toBe('string');
      expect(typeof o.brand).toBe('string');
      expect(typeof o.productName).toBe('string');
      expect(['건식', '습식']).toContain(o.category);
    }
  });
});
