import { describe, expect, it } from 'vitest';
import type { GuestCat } from '@/lib/domain/types';
import {
  carbGramsPer1000kcal,
  phosphorusGramsPer1000kcal,
  toDmbPct,
} from './nutrition';
import { SEED_FOODS } from './foods-data';
import { recommend, recommendFromProfile, toRecInput } from './engine';
import type { RecInput } from './types';

const THIS_YEAR = new Date().getFullYear();

function baseCat(over: Partial<GuestCat> = {}): GuestCat {
  return {
    name: '보리',
    birth_year: THIS_YEAR - 5, // 성묘 1+
    weight_kg: 4.5,
    neutered_status: '완료',
    diet_type: '건식',
    health_conditions: [],
    avoid_ingredients: [],
    goal: '중노령 전환',
    ...over,
  };
}

function input(over: Partial<RecInput> = {}): RecInput {
  return {
    name: '보리',
    ageGroup: '1+',
    goal: '중노령 전환',
    diseases: [],
    avoid: [],
    excludeFoodIds: [],
    dietPref: '건식',
    formFilter: '전체',
    ...over,
  };
}

describe('nutrition 환산 (스키마 §3·§4)', () => {
  it('DMB: 습식 11% → 50%, 건식 34% → 37.8% (워크드 예시 A)', () => {
    expect(toDmbPct(11, 78)).toBeCloseTo(50, 1);
    expect(toDmbPct(34, 10)).toBeCloseTo(37.8, 1);
  });

  it('인 per_1000kcal: P 1.2% · 4000kcal/kg → 3.0 g/1000kcal (예시 B)', () => {
    // kcal_per_100g = 400 ↔ 4000 kcal/kg
    expect(phosphorusGramsPer1000kcal(1.2, 400)).toBeCloseTo(3.0, 2);
  });

  it('탄수(NFE) 결측 입력은 null 반환 (impute 금지)', () => {
    expect(
      carbGramsPer1000kcal({
        moisture: null,
        protein: 30,
        fat: 12,
        ash: 7,
        fiber: 3,
        kcalPer100g: 380,
      }),
    ).toBeNull();
  });
});

describe('toRecInput 정규화', () => {
  it('출생년도 → 연령대, 건강옵션 → 질환 모드 매핑', () => {
    const got = toRecInput(
      baseCat({ birth_year: THIS_YEAR - 12, health_conditions: ['신부전 1-2기'] }),
    );
    expect(got?.ageGroup).toBe('11+');
    expect(got?.diseases).toEqual(['ckd_12']);
  });

  it('필수 필드(goal) 누락 시 null', () => {
    expect(toRecInput(baseCat({ goal: undefined }))).toBeNull();
  });

  it("'질병 없음'은 질환 모드로 매핑되지 않음", () => {
    const got = toRecInput(baseCat({ health_conditions: ['질병 없음'] }));
    expect(got?.diseases).toEqual([]);
  });
});

describe('hard 게이트 (filter)', () => {
  it('알레르겐 포함 제품은 절대 탈락 (§4-1)', () => {
    const res = recommend(input({ avoid: ['닭'] }), SEED_FOODS);
    const allPicked = res.top.map((t) => t.food.ingredient_keywords.join());
    expect(allPicked.every((k) => !k.includes('닭'))).toBe(true);
    expect(res.excluded.some((e) => e.reasons.some((r) => r.code === 'allergen'))).toBe(true);
  });

  it('반습식 간식·프로필렌글리콜 제품은 항상 탈락', () => {
    const res = recommend(input(), SEED_FOODS);
    const ids = res.top.map((t) => t.food.id);
    expect(ids).not.toContain('treat-soft-99');
  });

  it('CKD: 무기 인산염 첨가물 제품 탈락', () => {
    const res = recommend(input({ diseases: ['ckd_12'] }), SEED_FOODS);
    expect(res.excluded.some((e) => e.food.id === 'budget-dry-99')).toBe(true);
    expect(res.top.some((t) => t.food.id === 'budget-dry-99')).toBe(false);
  });

  it('옥살레이트: 산성화제 제품 탈락 (struvite용은 제외됨)', () => {
    const res = recommend(input({ diseases: ['oxalate'] }), SEED_FOODS);
    expect(res.top.some((t) => t.food.id === 'urinary-struvite-01')).toBe(false);
  });

  it('당뇨: 첨가 단순당 제품 탈락', () => {
    const res = recommend(input({ diseases: ['diabetes'] }), SEED_FOODS);
    expect(res.excluded.some((e) => e.food.id === 'budget-dry-99')).toBe(true);
  });

  it('사용자 제외 사료는 user_excluded로 탈락하고 TOP에 없음', () => {
    const target = 'adult-daily-01';
    const res = recommend(input({ excludeFoodIds: [target] }), SEED_FOODS);
    expect(res.top.some((t) => t.food.id === target)).toBe(false);
    expect(
      res.excluded.some(
        (e) => e.food.id === target && e.reasons.some((r) => r.code === 'user_excluded'),
      ),
    ).toBe(true);
  });
});

describe('soft 점수 (scorer) — 모드별 1차 레버', () => {
  it('CKD는 저인 신장식을 최상위로', () => {
    const res = recommend(input({ diseases: ['ckd_34'], goal: '질환관리' }), SEED_FOODS);
    expect(res.top.length).toBeGreaterThanOrEqual(1);
    expect(res.top[0].food.tags).toContain('renal');
  });

  it('요로는 고수분 습식을 최상위로', () => {
    const res = recommend(input({ diseases: ['struvite'], goal: '질환관리' }), SEED_FOODS);
    expect(res.top[0].food.category).toBe('습식');
  });

  it('감량 목표는 저칼로리 제품을 우선', () => {
    const res = recommend(input({ goal: '체중관리 - 감량' }), SEED_FOODS);
    const top = res.top[0].food;
    expect(top.kcal_per_100g).toBeLessThan(320);
  });

  it('IBD는 가수분해/신규 단백을 우선', () => {
    const res = recommend(input({ diseases: ['ibd'], goal: '질환관리' }), SEED_FOODS);
    const tags = res.top.flatMap((t) => t.food.tags);
    expect(tags.some((t) => t === 'hydrolyzed' || t === 'novel_protein')).toBe(true);
  });
});

describe('selector — 충돌·우선순위·고지', () => {
  it('동반질환 시 예후 우선순위 높은 CKD가 primary', () => {
    const res = recommend(input({ diseases: ['ibd', 'ckd_34'] }), SEED_FOODS);
    expect(res.primaryMode).toBe('ckd_34');
  });

  it('게이트 3 질환은 수의사 상담 고지를 포함', () => {
    const res = recommend(input({ diseases: ['diabetes'] }), SEED_FOODS);
    expect(res.safetyGate).toBe(3);
    expect(res.notices.length).toBeGreaterThan(0);
  });

  it('우선순위 박스는 알레르겐을 최상단(weight=1)에 둔다', () => {
    const res = recommend(input({ avoid: ['생선'] }), SEED_FOODS);
    expect(res.priorityOrder[0].key).toBe('allergen');
  });

  it('모든 모드에서 TOP 후보가 비어 있지 않다', () => {
    const modes: RecInput['diseases'][] = [
      [],
      ['ckd_12'],
      ['struvite'],
      ['oxalate'],
      ['diabetes'],
      ['ibd'],
      ['pancreatitis'],
    ];
    for (const diseases of modes) {
      const res = recommend(input({ diseases, goal: diseases.length ? '질환관리' : '중노령 전환' }), SEED_FOODS);
      expect(res.top.length, `mode=${diseases.join(',') || 'none'}`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('recommendFromProfile 통합', () => {
  it('완성된 프로필로 결과를 생성한다', () => {
    const res = recommendFromProfile(baseCat({ health_conditions: ['신부전 1-2기'], goal: '질환관리' }), SEED_FOODS);
    expect(res).not.toBeNull();
    expect(res?.top.length).toBeGreaterThanOrEqual(1);
    expect(res?.priorityOrder.length).toBeGreaterThan(0);
  });

  it('미완성 프로필은 null', () => {
    expect(recommendFromProfile(baseCat({ birth_year: undefined }), SEED_FOODS)).toBeNull();
  });
});

describe('인 보증 최소값 방어(2026-10-28, nutrition.plausiblePhosphorusPct)', () => {
  it('건식 인 0.05% as-fed는 CKD에서 "인 데이터 없음 — 신뢰도 낮음"으로 처리되고 3-4기에선 보류된다', () => {
    const base = SEED_FOODS.find((f) => f.category === '건식' && f.kr_available)!;
    const gaMin = { ...base, id: 'ga-min', product_name: 'GA-min renal', phosphorus_pct: 0.05, moisture_pct: 10 };
    const r12 = recommend(input({ diseases: ['ckd_12'], goal: '질환관리' }), [...SEED_FOODS, gaMin]);
    const scored = [...r12.top, ...r12.excluded.map(() => null)].filter(Boolean);
    void scored;
    const all = r12.top.find((t) => t.food.id === 'ga-min');
    if (all) expect(all.lowConfidence).toBe(true);
    const r34 = recommend(input({ diseases: ['ckd_34'], goal: '질환관리' }), [...SEED_FOODS, gaMin]);
    expect(r34.top.some((t) => t.food.id === 'ga-min')).toBe(false);
  });
});

describe('키튼 전용 사료 게이트(2026-10-28 실데이터 점검)', () => {
  it("ETL이 age_fit=[] + '키튼' 태그로 내보낸 사료는 성묘 추천에서 탈락한다", () => {
    const base = SEED_FOODS.find((f) => f.category === '건식' && f.kr_available)!;
    const kitten = { ...base, id: 'kit', product_name: '키튼 스타터', age_fit: [] as typeof base.age_fit, tags: ['주식', '키튼'] };
    const legacy = { ...base, id: 'legacy', product_name: '태그 없는 빈 age_fit', age_fit: [] as typeof base.age_fit, tags: ['주식'] };
    const r = recommend(input({ goal: '중노령 전환' }), [...SEED_FOODS, kitten, legacy]);
    const ex = r.excluded.find((e) => e.food.id === 'kit');
    expect(ex?.reasons.map((x) => x.code)).toContain('life_stage');
    expect(ex?.reasons.map((x) => x.label)).toContain('키튼 전용 사료 (성묘 부적합)');
    expect(r.excluded.some((e) => e.food.id === 'legacy' && e.reasons.some((x) => x.code === 'life_stage'))).toBe(false);
  });
});
