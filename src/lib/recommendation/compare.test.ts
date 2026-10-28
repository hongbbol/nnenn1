import { describe, expect, it } from 'vitest';
import type { Food } from '@/lib/domain/types';
import { buildComparison } from './compare';

function food(over: Partial<Food> & { id: string }): Food {
  return {
    brand: 'B',
    product_name: over.id,
    category: '건식',
    age_fit: [],
    condition_fit: [],
    protein_pct: 32,
    fat_pct: 14,
    fiber_pct: 3,
    ash_pct: 7,
    moisture_pct: 10,
    phosphorus_pct: 1.0,
    sodium_pct: 0.4,
    potassium_pct: null,
    chloride_pct: null,
    taurine_pct: null,
    epa_dha_pct: null,
    omega3_pct: null,
    magnesium_pct: 0.1,
    calcium_pct: null,
    kcal_per_100g: 400,
    ingredient_summary: null,
    ingredient_keywords: [],
    form: null,
    rec_daily_g: null,
    tags: [],
    image_url: null,
    affiliate_links: null,
    price_per_kg_krw: null,
    active: true,
    kr_available: true,
    ...over,
  };
}

const metric = (r: ReturnType<typeof buildComparison>, key: string) => r.metrics.find((m) => m.key === key)!;

describe('비교표 — ME 기준 환산(2026-10-28)', () => {
  it('인·단백은 g/1000kcal로, 수분·열량은 라벨 단위 그대로', () => {
    const cur = food({ id: 'cur' }); // P 1.0% / 400 kcal → 2.5 g/1000kcal
    const cand = food({ id: 'c', category: '습식', phosphorus_pct: 0.25, protein_pct: 10, moisture_pct: 80, kcal_per_100g: 100 });
    const r = buildComparison({ source: 'db', food: cur }, [cand]);
    const p = metric(r, 'phosphorus_me');
    expect(p.unit).toBe('g/1000kcal');
    expect(p.baseline).toBeCloseTo(2.5, 2);
    expect(p.values[0]).toBeCloseTo(2.5, 2); // as-fed 0.25% vs 1.0%지만 열량 기준으론 같다
    expect(metric(r, 'moisture_pct').unit).toBe('%');
    expect(metric(r, 'kcal_per_100g').values[0]).toBe(100);
  });

  it('마그네슘은 mg/1000kcal 정수, 탄수는 추정치 행이 있다', () => {
    const r = buildComparison({ source: 'none' }, [food({ id: 'c' })]);
    expect(metric(r, 'magnesium_me').values[0]).toBe(250);
    expect(metric(r, 'magnesium_me').unit).toBe('mg/1000kcal');
    expect(metric(r, 'carb_me').label).toContain('추정');
    expect(metric(r, 'carb_me').values[0]).toBeCloseTo(85, 0); // NFE 34% / 400 kcal
  });

  it('습식 kcal 상한 초과면 환산 값은 비우고 라벨 단위 값은 남긴다', () => {
    const bad = food({ id: 'x', category: '습식', kcal_per_100g: 582 });
    const r = buildComparison({ source: 'none' }, [bad]);
    expect(metric(r, 'phosphorus_me').values[0]).toBeNull();
    expect(metric(r, 'kcal_per_100g').values[0]).toBe(582);
  });

  it('baseline이 text/none이면 baseline 열은 비고 label만 채운다', () => {
    const r = buildComparison({ source: 'text', text: '우리집 사료' }, [food({ id: 'c' })]);
    expect(r.baseline.label).toBe('우리집 사료');
    expect(r.metrics.every((m) => m.baseline == null)).toBe(true);
  });
});
