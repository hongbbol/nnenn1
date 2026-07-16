/**
 * 미네랄·EPA+DHA 보조 레버 테스트 (레지스트리 §3-A·§3-B·§2-8, 2026-06-24).
 *
 * 핵심 계약:
 * 1) 데이터가 있으면 레버가 작동해 적정 범위가 가점을 받는다.
 * 2) 데이터가 없으면 레버는 INACTIVE — 기존 후보의 점수·순위를 바꾸지 않는다.
 * 3) 요로 건식 나트륨 음수 유도는 CKD 동반 시 비활성(§4 충돌 규칙).
 */
import { describe, expect, it } from 'vitest';
import type { Food } from '@/lib/domain/types';
import { scoreFood } from './scorer';
import type { RecInput } from './types';

function food(over: Partial<Food> & Pick<Food, 'id'>): Food {
  return {
    brand: 'T',
    product_name: over.id,
    category: '건식',
    age_fit: ['1+', '7+', '11+', '15+'],
    condition_fit: [],
    protein_pct: 32,
    fat_pct: 14,
    fiber_pct: 4,
    ash_pct: 7,
    moisture_pct: 8,
    phosphorus_pct: 0.4, // CKD 이상 범위(≈1.0 g/1000kcal @400kcal)
    sodium_pct: null,
    potassium_pct: null,
    chloride_pct: null,
    taurine_pct: null,
    epa_dha_pct: null,
    omega3_pct: null,
    kcal_per_100g: 400,
    ingredient_summary: null,
    ingredient_keywords: [],
    form: 'dry',
    rec_daily_g: null,
    tags: ['staple_complete'],
    image_url: null,
    affiliate_links: null,
    price_per_kg_krw: null,
    active: true,
    kr_available: true,
    ...over,
  };
}

function input(over: Partial<RecInput> = {}): RecInput {
  return {
    name: '보리',
    ageGroup: '7+',
    goal: '질환관리',
    diseases: [],
    avoid: [],
    excludeFoodIds: [],
    dietPref: null,
    ...over,
  };
}

describe('CKD 미네랄 보조 레버 (§3-A)', () => {
  const ckd = input({ diseases: ['ckd_12'] });

  it('나트륨 적정(0.5–1 g/1000kcal)이 과다(>2)보다 점수 높다', () => {
    // 0.3% @400kcal/100g = 0.75 g/1000kcal(적정) vs 1.0% = 2.5(과다)
    const ok = scoreFood(food({ id: 'na-ok', sodium_pct: 0.3 }), ckd, 'ckd_12');
    const high = scoreFood(food({ id: 'na-high', sodium_pct: 1.0 }), ckd, 'ckd_12');
    expect(ok.score).toBeGreaterThan(high.score);
    expect(ok.reasons.some((r) => r.label.includes('나트륨 적정'))).toBe(true);
  });

  it('칼륨 보충 범위(1.4–2.6 g/1000kcal)가 저칼륨보다 점수 높다', () => {
    // 0.8% @400 = 2.0(범위 내) vs 0.3% = 0.75(미달)
    const ok = scoreFood(food({ id: 'k-ok', potassium_pct: 0.8 }), ckd, 'ckd_12');
    const low = scoreFood(food({ id: 'k-low', potassium_pct: 0.3 }), ckd, 'ckd_12');
    expect(ok.score).toBeGreaterThan(low.score);
    expect(ok.reasons.some((r) => r.label.includes('칼륨'))).toBe(true);
  });

  it('결측이면 레버 비활성 — 미네랄 없는 후보와 있는(적정) 후보의 인 점수 축은 동일', () => {
    // 결측 후보 점수가 "중립 페널티"를 받지 않는지: 결측 vs 적정 차이는 보조 가중(0.1) 이내.
    const none = scoreFood(food({ id: 'na-none' }), ckd, 'ckd_12');
    const ok = scoreFood(food({ id: 'na-ok2', sodium_pct: 0.3 }), ckd, 'ckd_12');
    expect(ok.score).toBeGreaterThanOrEqual(none.score);
    expect(ok.score - none.score).toBeLessThanOrEqual(8); // 보조 레버 몫 이내
  });
});

describe('요로 건식 나트륨 음수 유도 (§3-B) + CKD 충돌 (§4)', () => {
  it('건식·CKD 없음: Na 3.0–3.3 g/1000kcal 설계가 저나트륨보다 가점', () => {
    const uri = input({ diseases: ['struvite'] });
    // 1.25% @400 = 3.125(설계 범위) vs 0.4% = 1.0
    const designed = scoreFood(food({ id: 'u-na', sodium_pct: 1.25 }), uri, 'struvite');
    const plain = scoreFood(food({ id: 'u-plain', sodium_pct: 0.4 }), uri, 'struvite');
    expect(designed.score).toBeGreaterThan(plain.score);
    expect(designed.reasons.some((r) => r.label.includes('음수 유도'))).toBe(true);
  });

  it('CKD 동반이면 비활성 — 고나트륨이 가점을 받지 않는다', () => {
    const both = input({ diseases: ['struvite', 'ckd_12'] });
    const designed = scoreFood(food({ id: 'c-na', sodium_pct: 1.25 }), both, 'struvite');
    const plain = scoreFood(food({ id: 'c-plain', sodium_pct: 0.4 }), both, 'struvite');
    expect(designed.score).toBeLessThanOrEqual(plain.score);
    expect(designed.reasons.some((r) => r.label.includes('음수 유도'))).toBe(false);
  });

  it('습식은 비활성(수분 레버 몫)', () => {
    const uri = input({ diseases: ['struvite'] });
    const wet = scoreFood(
      food({ id: 'w-na', category: '습식', moisture_pct: 80, sodium_pct: 0.28, kcal_per_100g: 90 }),
      uri,
      'struvite',
    );
    expect(wet.reasons.some((r) => r.label.includes('음수 유도'))).toBe(false);
  });
});

describe('EPA+DHA 분리값 우선 (스키마 §영양 — ALA 전환 불가)', () => {
  it('epa_dha_pct 있으면 EPA+DHA 근거 라벨, 총 오메가3만 있으면 기존 라벨', () => {
    const senior = input({ ageGroup: '11+', goal: '중노령 전환' });
    const ed = scoreFood(food({ id: 'ed', epa_dha_pct: 0.3 }), senior, null);
    const o3 = scoreFood(food({ id: 'o3', omega3_pct: 0.7 }), senior, null);
    expect(ed.reasons.some((r) => r.label.includes('EPA+DHA'))).toBe(true);
    expect(o3.reasons.some((r) => r.label.includes('오메가-3'))).toBe(true);
  });

  it('노령 나트륨 과량 회피 — 고나트륨이 감점된다(§2-8)', () => {
    const senior = input({ ageGroup: '11+', goal: '중노령 전환' });
    const high = scoreFood(food({ id: 's-high', sodium_pct: 1.3 }), senior, null); // 3.25 g/1000kcal
    const ok = scoreFood(food({ id: 's-ok', sodium_pct: 0.3 }), senior, null); // 0.75
    expect(ok.score).toBeGreaterThan(high.score);
    expect(high.reasons.some((r) => r.label.includes('나트륨 높음'))).toBe(true);
  });
});
