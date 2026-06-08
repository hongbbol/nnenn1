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

  // 회귀: '피하고 싶은 성분' UI 제거 — 레거시 avoid_ingredients(stale)는 추천에 반영 안 됨.
  // (filter.ts 알레르겐 로직 자체는 보존 — 추후 '알러지' 질환 옵션에서 재사용)
  it('레거시 avoid_ingredients는 추천에 반영되지 않음 (avoid 항상 빈 배열)', () => {
    const got = toRecInput(baseCat({ avoid_ingredients: ['닭', '생선'] }));
    expect(got?.avoid).toEqual([]);

    // 닭 알레르겐이 있어도 allergen 사유로 탈락하는 제품이 없어야 한다.
    const res = recommendFromProfile(
      baseCat({ avoid_ingredients: ['닭'], goal: '중노령 전환' }),
      SEED_FOODS,
    );
    expect(res).not.toBeNull();
    expect(res!.excluded.some((e) => e.reasons.some((r) => r.code === 'allergen'))).toBe(false);
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
