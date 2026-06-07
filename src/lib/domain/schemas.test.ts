import { describe, expect, it } from 'vitest';
import {
  basicsSchema,
  dietSchema,
  goalSchema,
  healthSchema,
  profileSchema,
} from './schemas';

const currentYear = new Date().getFullYear();

describe('basicsSchema', () => {
  const valid = {
    name: '보리',
    birth_year: 2017,
    birth_month: 3,
    birth_day: 15,
    weight_kg: 4.7,
    neutered_status: '완료',
  };

  it('accepts valid', () => {
    expect(basicsSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts boundary weights 0.5 and 15', () => {
    expect(basicsSchema.safeParse({ ...valid, weight_kg: 0.5 }).success).toBe(true);
    expect(basicsSchema.safeParse({ ...valid, weight_kg: 15 }).success).toBe(true);
  });

  it('accepts boundary birth_year 2000 and currentYear', () => {
    expect(basicsSchema.safeParse({ ...valid, birth_year: 2000 }).success).toBe(true);
    expect(basicsSchema.safeParse({ ...valid, birth_year: currentYear }).success).toBe(true);
  });

  it('rejects NaN weight_kg (guards against unparseable input)', () => {
    expect(basicsSchema.safeParse({ ...valid, weight_kg: NaN }).success).toBe(false);
  });

  it('rejects whitespace-only name', () => {
    expect(basicsSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
  });

  it('coerces string birth_year + weight_kg', () => {
    expect(
      basicsSchema.safeParse({ ...valid, birth_year: '2017', weight_kg: '4.7' }).success,
    ).toBe(true);
  });

  it('rejects empty name', () => {
    expect(basicsSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects birth_year before 2000', () => {
    expect(basicsSchema.safeParse({ ...valid, birth_year: 1999 }).success).toBe(false);
  });

  it('rejects future birth_year', () => {
    expect(basicsSchema.safeParse({ ...valid, birth_year: currentYear + 1 }).success).toBe(false);
  });

  it('rejects weight < 0.5kg or > 15kg', () => {
    expect(basicsSchema.safeParse({ ...valid, weight_kg: 0.4 }).success).toBe(false);
    expect(basicsSchema.safeParse({ ...valid, weight_kg: 16 }).success).toBe(false);
  });

  it('rejects unknown neutered_status', () => {
    expect(basicsSchema.safeParse({ ...valid, neutered_status: 'yes' }).success).toBe(false);
  });

  it('rejects empty string birth_year (coerces to 0)', () => {
    expect(basicsSchema.safeParse({ ...valid, birth_year: '' }).success).toBe(false);
  });

  it('accepts string birth_month + birth_day (coerce)', () => {
    expect(
      basicsSchema.safeParse({ ...valid, birth_month: '12', birth_day: '1' }).success,
    ).toBe(true);
  });

  it('rejects out-of-range month/day', () => {
    expect(basicsSchema.safeParse({ ...valid, birth_month: 0 }).success).toBe(false);
    expect(basicsSchema.safeParse({ ...valid, birth_month: 13 }).success).toBe(false);
    expect(basicsSchema.safeParse({ ...valid, birth_day: 0 }).success).toBe(false);
    expect(basicsSchema.safeParse({ ...valid, birth_day: 32 }).success).toBe(false);
  });

  it('rejects empty month/day', () => {
    expect(basicsSchema.safeParse({ ...valid, birth_month: '' }).success).toBe(false);
    expect(basicsSchema.safeParse({ ...valid, birth_day: '' }).success).toBe(false);
  });

  it('rejects a non-existent calendar date (Feb 30)', () => {
    expect(
      basicsSchema.safeParse({ ...valid, birth_month: 2, birth_day: 30 }).success,
    ).toBe(false);
  });

  it('rejects a future birth date within current year', () => {
    const d = new Date();
    const future = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    // 같은 해라면 미래 월/일은 거부되어야 함
    if (future.getFullYear() === d.getFullYear()) {
      expect(
        basicsSchema.safeParse({
          ...valid,
          birth_year: future.getFullYear(),
          birth_month: future.getMonth() + 1,
          birth_day: future.getDate(),
        }).success,
      ).toBe(false);
    }
  });
});

describe('dietSchema', () => {
  it('requires diet_type', () => {
    expect(dietSchema.safeParse({ avoid_ingredients: [] }).success).toBe(false);
  });

  it('accepts valid', () => {
    expect(
      dietSchema.safeParse({
        diet_type: '건식',
        current_food_text: '데일리 인도어',
        avoid_ingredients: ['닭', '생선'],
      }).success,
    ).toBe(true);
  });

  it('allows missing current_food_text', () => {
    expect(
      dietSchema.safeParse({ diet_type: '습식', avoid_ingredients: [] }).success,
    ).toBe(true);
  });
});

describe('healthSchema — dev-plan §3.3 biz rules', () => {
  it('empty list is valid', () => {
    expect(healthSchema.safeParse({ health_conditions: [] }).success).toBe(true);
  });

  it('single 질병 없음 is valid', () => {
    expect(healthSchema.safeParse({ health_conditions: ['질병 없음'] }).success).toBe(true);
  });

  it('REJECTS 질병 없음 combined with anything else (exclusive rule)', () => {
    const r = healthSchema.safeParse({
      health_conditions: ['질병 없음', '당뇨'],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toMatch(/질병 없음/);
    }
  });

  it('REJECTS two kidney stages (same group)', () => {
    const r = healthSchema.safeParse({
      health_conditions: ['신부전 초기', '신부전 1-2기'],
    });
    expect(r.success).toBe(false);
  });

  it('REJECTS both stone types', () => {
    const r = healthSchema.safeParse({
      health_conditions: ['결석-스트루바이트', '결석-옥살레이트'],
    });
    expect(r.success).toBe(false);
  });

  it('allows 1 kidney + 1 stone + IBD (different groups)', () => {
    const r = healthSchema.safeParse({
      health_conditions: ['신부전 1-2기', '결석-스트루바이트', 'IBD'],
    });
    expect(r.success).toBe(true);
  });

  it('rejects unknown ids', () => {
    const r = healthSchema.safeParse({ health_conditions: ['해킹옵션'] });
    expect(r.success).toBe(false);
  });
});

describe('goalSchema', () => {
  it('accepts each goal', () => {
    for (const g of ['질환관리', '중노령 전환', '체중관리 - 감량', '체중관리 - 증량']) {
      expect(goalSchema.safeParse({ goal: g }).success).toBe(true);
    }
  });

  it('rejects empty/unknown', () => {
    expect(goalSchema.safeParse({ goal: '' }).success).toBe(false);
    expect(goalSchema.safeParse({ goal: '아무거나' }).success).toBe(false);
  });
});

describe('profileSchema — full merge', () => {
  it('accepts a complete valid profile', () => {
    const r = profileSchema.safeParse({
      name: '낭낭이',
      birth_year: 2017,
      birth_month: 3,
      birth_day: 15,
      weight_kg: 4.7,
      neutered_status: '완료',
      diet_type: '건식',
      current_food_text: null,
      avoid_ingredients: [],
      health_conditions: ['신부전 초기'],
      goal: '질환관리',
    });
    expect(r.success).toBe(true);
  });

  it('propagates health_conditions biz-rule failures', () => {
    const r = profileSchema.safeParse({
      name: '낭낭이',
      birth_year: 2017,
      birth_month: 3,
      birth_day: 15,
      weight_kg: 4.7,
      neutered_status: '완료',
      diet_type: '건식',
      avoid_ingredients: [],
      health_conditions: ['질병 없음', 'IBD'],
      goal: '질환관리',
    });
    expect(r.success).toBe(false);
  });
});
