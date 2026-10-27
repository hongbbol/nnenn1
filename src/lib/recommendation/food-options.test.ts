import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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

  it('기본은 cap 없음 — 브랜드 SKU 전부 노출, limit을 주면 그만큼만', () => {
    const many: FoodOption[] = Array.from({ length: 90 }, (_, i) => ({
      id: `f${i}`,
      brand: 'Royal Canin',
      productName: `사료 ${i}`,
      category: '건식',
    }));
    expect(filterFoodOptions(many, '로얄캐닌')).toHaveLength(90);
    expect(filterFoodOptions(many, 'Brand', 8)).toHaveLength(0);
    expect(filterFoodOptions(many, 'royal', 8)).toHaveLength(8);
  });

  it('브랜드(별칭) 매칭이 제품명 매칭보다 앞 — "로얄"에서 로얄캐닌이 팬시피스트 "로얄 참치"보다 먼저', () => {
    const mixed: FoodOption[] = [
      { id: 'ff1', brand: 'Fancy Feast', productName: '로얄 참치 그레이비 소스', category: '습식' },
      { id: 'rc1', brand: 'Royal Canin', productName: '노르웨이 숲 어덜트', category: '건식' },
      { id: 'ff2', brand: 'Fancy Feast', productName: '로얄 참치 젤리 소스', category: '습식' },
      { id: 'rc2', brand: 'Royal Canin', productName: '랙돌 어덜트', category: '건식' },
      { id: 'x', brand: 'Orijen', productName: '캣앤키튼', category: '건식' },
    ];
    expect(filterFoodOptions(mixed, '로얄').map((o) => o.id)).toEqual(['rc1', 'rc2', 'ff1', 'ff2']);
    // 브랜드+제품명 혼합 토큰도 그대로 AND.
    expect(filterFoodOptions(mixed, '로얄 랙돌').map((o) => o.id)).toEqual(['rc2']);
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

/**
 * 실데이터 회귀 — ETL 시드(KR 유통·active)에서 브랜드명 검색이 그 브랜드 SKU를 하나도 빠뜨리지 않는지.
 * 2026-10-27 프로덕션에서 "로얄캐닌" 입력 시 87개 중 12개만 보이던 cap 회귀를 막는다.
 */
const SEED_PATH = join(__dirname, '../../../scripts/etl/foods.seed.json');
describe.skipIf(!existsSync(SEED_PATH))('브랜드 검색 전수 노출 (scripts/etl/foods.seed.json)', () => {
  type SeedRow = {
    source_sku_id: string;
    brand: string;
    product_name: string;
    category: FoodOption['category'];
    active?: boolean;
    kr_available?: boolean;
  };
  const rows = (JSON.parse(readFileSync(SEED_PATH, 'utf8')) as SeedRow[]).filter(
    (r) => r.active !== false && r.kr_available !== false,
  );
  const opts: FoodOption[] = rows.map((r) => ({
    id: r.source_sku_id,
    brand: r.brand,
    productName: r.product_name,
    category: r.category,
  }));

  it.each([
    ['로얄캐닌', 'Royal Canin'],
    ['로열캐닌', 'Royal Canin'],
    ['힐스', "Hill's Pet Nutrition"],
    ['퓨리나', 'Purina'],
  ])('"%s" → %s KR SKU 전부, 그 브랜드가 맨 앞', (query, brand) => {
    const expected = opts.filter((o) => o.brand === brand);
    expect(expected.length).toBeGreaterThan(10);
    const got = filterFoodOptions(opts, query);
    expect(got.filter((o) => o.brand === brand)).toHaveLength(expected.length);
    expect(got.slice(0, expected.length).every((o) => o.brand === brand)).toBe(true);
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
