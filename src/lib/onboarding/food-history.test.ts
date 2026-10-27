import { describe, expect, it } from 'vitest';
import type { FoodOption } from '@/lib/recommendation/food-options';
import { buildFoodHistoryChips } from './food-history';

const opt = (id: string, productName: string, brand = 'Royal Canin'): FoodOption => ({
  id,
  brand,
  productName,
  category: '건식',
});
const options = new Map(
  [opt('rc-renal', '캣 레날'), opt('rc-urinary', '유리너리 SO'), opt('hills-kd', 'k/d 오션피쉬', "Hill's Pet Nutrition"), opt('old', '단종')].map(
    (o) => [o.id, o] as const,
  ),
);

describe('buildFoodHistoryChips', () => {
  it('기록이 없으면 빈 칩', () => {
    expect(buildFoodHistoryChips({ savedCurrent: null, recommendations: [], optionsById: options })).toEqual({
      currentFoods: [],
      excludeCandidates: [],
    });
  });

  it('현재 사료 칩: 추천 스냅샷(최신순) → 저장 프로필, id는 라벨로·텍스트는 그대로·중복 제거', () => {
    const r = buildFoodHistoryChips({
      savedCurrent: { foodId: 'rc-renal', text: null },
      recommendations: [
        { topFoodIds: [], currentFoodId: 'hills-kd', currentFoodText: null },
        { topFoodIds: [], currentFoodId: null, currentFoodText: '동네 마트 사료' },
        { topFoodIds: [], currentFoodId: 'rc-renal', currentFoodText: null },
        { topFoodIds: [], currentFoodId: null, currentFoodText: ' 동네 마트 사료 ' },
      ],
      optionsById: options,
    });
    expect(r.currentFoods).toEqual([
      { label: "Hill's Pet Nutrition k/d 오션피쉬", foodId: 'hills-kd' },
      { label: '동네 마트 사료', foodId: null },
      { label: 'Royal Canin 캣 레날', foodId: 'rc-renal' },
    ]);
  });

  it('제외 후보: 추천 TOP(최신 추천부터) → 입력했던 현재 사료(id만), 중복 제거, 텍스트 입력은 제외 불가', () => {
    const r = buildFoodHistoryChips({
      savedCurrent: { foodId: null, text: '동네 마트 사료' },
      recommendations: [
        { topFoodIds: ['rc-urinary', 'hills-kd'], currentFoodId: 'rc-renal', currentFoodText: null },
        { topFoodIds: ['hills-kd', 'rc-renal'] },
      ],
      optionsById: options,
    });
    expect(r.excludeCandidates.map((o) => o.id)).toEqual(['rc-urinary', 'hills-kd', 'rc-renal']);
  });

  it('옵션에 없는 id(비활성·삭제)는 두 칩 모두에서 빠진다', () => {
    const r = buildFoodHistoryChips({
      savedCurrent: { foodId: 'gone', text: null },
      recommendations: [{ topFoodIds: ['gone', 'rc-renal'], currentFoodId: 'gone' }],
      optionsById: options,
    });
    expect(r.currentFoods).toEqual([]);
    expect(r.excludeCandidates.map((o) => o.id)).toEqual(['rc-renal']);
  });

  it('limit으로 자른다', () => {
    const many = Array.from({ length: 12 }, (_, i) => opt(`f${i}`, `사료 ${i}`));
    const r = buildFoodHistoryChips(
      {
        savedCurrent: null,
        recommendations: [{ topFoodIds: many.map((o) => o.id) }],
        optionsById: new Map(many.map((o) => [o.id, o])),
      },
      5,
    );
    expect(r.excludeCandidates).toHaveLength(5);
  });
});
