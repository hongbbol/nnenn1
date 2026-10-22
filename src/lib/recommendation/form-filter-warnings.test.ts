import { describe, expect, it } from 'vitest';
import { formFilterWarnings } from './form-filter-warnings';

describe("추천 범위 '건식만' 경고 (온보딩 확인 창·결과 고지 공용)", () => {
  it('전체/습식만은 경고 없음', () => {
    expect(formFilterWarnings({ formFilter: '전체', diseases: ['diabetes'], goal: '질환관리' })).toEqual([]);
    expect(formFilterWarnings({ formFilter: '습식만', diseases: ['struvite'], goal: '질환관리' })).toEqual([]);
  });
  it('건식만 + 요로/CKD 3-4기/당뇨/감량은 각각 경고', () => {
    expect(formFilterWarnings({ formFilter: '건식만', diseases: ['struvite'], goal: '질환관리' }).join()).toContain('요로');
    expect(formFilterWarnings({ formFilter: '건식만', diseases: ['ckd_34'], goal: '질환관리' }).join()).toContain('수분 관리');
    expect(formFilterWarnings({ formFilter: '건식만', diseases: ['ckd_12'], goal: '질환관리' }).join()).toContain('음수량');
    expect(formFilterWarnings({ formFilter: '건식만', diseases: ['diabetes'], goal: '질환관리' }).join()).toContain('탄수화물');
    expect(formFilterWarnings({ formFilter: '건식만', diseases: [], goal: '체중관리 - 감량' }).join()).toContain('급여량');
  });
  it('건식만이라도 원료 구동 모드(IBD)·일반 목표는 경고 없음', () => {
    expect(formFilterWarnings({ formFilter: '건식만', diseases: ['ibd'], goal: '질환관리' })).toEqual([]);
    expect(formFilterWarnings({ formFilter: '건식만', diseases: [], goal: '중노령 전환' })).toEqual([]);
  });
});
