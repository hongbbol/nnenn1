import { describe, expect, it } from 'vitest';
import {
  AGE_GROUPS,
  AGE_LABELS,
  DIET_TYPES,
  GOALS,
  HEALTH_OPTIONS,
  NEUTERED_STATUS,
  ageGroupFromBirthYear,
} from './constants';

describe('HEALTH_OPTIONS shape', () => {
  it('every option has unique id', () => {
    const ids = HEALTH_OPTIONS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('exactly one option is exclusive — and it is 질병 없음', () => {
    const exclusive = HEALTH_OPTIONS.filter((o) => o.exclusive);
    expect(exclusive).toHaveLength(1);
    expect(exclusive[0]!.id).toBe('질병 없음');
  });

  it('kidney group has exactly the 3 신부전 stages', () => {
    const kidney = HEALTH_OPTIONS.filter((o) => o.group === 'kidney').map((o) => o.id);
    expect(kidney).toEqual(['신부전 초기', '신부전 1-2기', '신부전 3-4기']);
  });

  it('stone group has the 2 결석 types', () => {
    const stones = HEALTH_OPTIONS.filter((o) => o.group === 'stone').map((o) => o.id);
    expect(stones).toEqual(['결석-스트루바이트', '결석-옥살레이트']);
  });
});

describe('enums match dev-plan §3.3', () => {
  it('AGE_GROUPS', () => {
    expect(AGE_GROUPS).toEqual(['1+', '7+', '11+', '15+']);
  });
  it('AGE_LABELS covers every age group', () => {
    for (const g of AGE_GROUPS) {
      expect(AGE_LABELS[g]).toBeTruthy();
    }
  });
  it('DIET_TYPES', () => {
    expect(DIET_TYPES).toEqual(['건식', '습식', '혼합']);
  });
  it('NEUTERED_STATUS — text enum (not boolean)', () => {
    expect(NEUTERED_STATUS).toEqual(['완료', '안 함', '몰라요']);
  });
  it('GOALS', () => {
    expect(GOALS).toEqual([
      '질환관리',
      '중노령 전환',
      '체중관리 - 감량',
      '체중관리 - 증량',
    ]);
  });
});

describe('ageGroupFromBirthYear', () => {
  const thisYear = new Date().getFullYear();

  it('returns null for falsy input', () => {
    expect(ageGroupFromBirthYear(undefined)).toBeNull();
    expect(ageGroupFromBirthYear(null)).toBeNull();
    expect(ageGroupFromBirthYear(0)).toBeNull();
  });

  it('rejects out-of-range ages', () => {
    expect(ageGroupFromBirthYear(thisYear + 1)).toBeNull(); // future
    expect(ageGroupFromBirthYear(thisYear - 31)).toBeNull(); // >30
  });

  it('classifies <7 as 1+/성묘', () => {
    const r = ageGroupFromBirthYear(thisYear - 3)!;
    expect(r.group).toBe('1+');
    expect(r.label).toBe('성묘');
    expect(r.age).toBe(3);
  });

  it('classifies 7~10 as 7+/중년', () => {
    const r = ageGroupFromBirthYear(thisYear - 7)!;
    expect(r.group).toBe('7+');
    expect(r.label).toBe('중년');
  });

  it('classifies 11~14 as 11+/고령', () => {
    const r = ageGroupFromBirthYear(thisYear - 12)!;
    expect(r.group).toBe('11+');
    expect(r.label).toBe('고령');
  });

  it('classifies 15+ as 15+/초고령', () => {
    const r = ageGroupFromBirthYear(thisYear - 15)!;
    expect(r.group).toBe('15+');
    expect(r.label).toBe('초고령');
  });

  it('handles exactly age 0 (born this year)', () => {
    const r = ageGroupFromBirthYear(thisYear)!;
    expect(r.age).toBe(0);
    expect(r.group).toBe('1+');
  });
});
