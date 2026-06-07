/**
 * 시나리오 매트릭스 — 규칙 레지스트리 "의도"와 엔진 출력의 일치 검증.
 * 각 프로필을 엔진에 넣고 (1순위 픽 · 탈락 사유)가 임상 의도와 맞는지 단언한다.
 * 실행: npx vitest run src/lib/recommendation/scenarios.test.ts
 */
import { describe, expect, it } from 'vitest';
import { recommend } from './engine';
import { SEED_FOODS } from './foods-data';
import type { DiseaseMode, RecInput } from './types';

function input(over: Partial<RecInput> = {}): RecInput {
  return {
    name: '테스트',
    ageGroup: '1+',
    goal: '중노령 전환',
    diseases: [],
    avoid: [],
    dietPref: '건식',
    ...over,
  };
}

const ids = (r: ReturnType<typeof recommend>) => r.top.map((t) => t.food.id);
const excludedIds = (r: ReturnType<typeof recommend>) => r.excluded.map((e) => e.food.id);
const hasExclusion = (r: ReturnType<typeof recommend>, code: string) =>
  r.excluded.some((e) => e.reasons.some((x) => x.code === code));

// 사람이 읽을 보고서 출력
function report(title: string, r: ReturnType<typeof recommend>) {
  const top = r.top.map((t) => `${t.food.product_name}(${t.score})`).join(' , ');
  // eslint-disable-next-line no-console
  console.log(
    `\n■ ${title}\n  primary=${r.primaryMode ?? '—'} gate=${r.safetyGate ?? '—'}` +
      `\n  TOP: ${top || '(없음)'}` +
      `\n  탈락: ${r.excluded.length}종` +
      (r.notices.length ? `\n  고지: ${r.notices.length}건` : ''),
  );
}

describe('연령·목표 모드 (질환 없음)', () => {
  it('성묘 건강 — 일반/노령 고단백, 간식·반습식 제외', () => {
    const r = recommend(input({ ageGroup: '1+', goal: '중노령 전환' }), SEED_FOODS);
    report('성묘 건강 / 중노령 전환', r);
    expect(ids(r)).not.toContain('treat-soft-99'); // 간식 탈락
    expect(r.top.length).toBeGreaterThanOrEqual(2);
  });

  it('고령(11+) 건강 — 저인 노령식 가점이 상위', () => {
    const r = recommend(input({ ageGroup: '11+', goal: '중노령 전환' }), SEED_FOODS);
    report('고령 11+ / 중노령 전환', r);
    expect(r.top[0].food.tags).toContain('low_phosphorus');
  });

  it('감량 — 저칼로리 우선 (kcal < 320)', () => {
    const r = recommend(input({ goal: '체중관리 - 감량' }), SEED_FOODS);
    report('감량', r);
    expect(r.top[0].food.kcal_per_100g!).toBeLessThan(320);
  });

  it('증량 — 고에너지 우선 (kcal > 420)', () => {
    const r = recommend(input({ goal: '체중관리 - 증량' }), SEED_FOODS);
    report('증량', r);
    expect(r.top[0].food.kcal_per_100g!).toBeGreaterThan(420);
  });
});

describe('질환 모드 — 1차 레버 검증', () => {
  it('CKD 초기 — 저인 신장식 상위, 인산염 첨가물 탈락', () => {
    const r = recommend(input({ diseases: ['ckd_early'], goal: '질환관리' }), SEED_FOODS);
    report('CKD 초기', r);
    expect(r.top[0].food.tags).toContain('low_phosphorus');
    expect(hasExclusion(r, 'ckd_phosphate_additive')).toBe(true);
    expect(r.safetyGate).toBe(3);
  });

  it('CKD 3-4기 — 더 엄격, 신장식 상위', () => {
    const r = recommend(input({ diseases: ['ckd_34'], goal: '질환관리' }), SEED_FOODS);
    report('CKD 3-4기', r);
    expect(r.top.every((t) => t.food.tags.includes('low_phosphorus') || t.food.condition_fit.includes('ckd'))).toBe(true);
  });

  it('스트루바이트 — 고수분 습식 1순위', () => {
    const r = recommend(input({ diseases: ['struvite'], goal: '질환관리' }), SEED_FOODS);
    report('스트루바이트', r);
    expect(r.top[0].food.category).toBe('습식');
  });

  it('옥살레이트 — 산성화제 제품 탈락, 옥살레이트 관리식은 상위 (회귀 방지)', () => {
    const r = recommend(input({ diseases: ['oxalate'], goal: '질환관리' }), SEED_FOODS);
    report('옥살레이트', r);
    // 산성화제(스트루바이트 SO)는 탈락
    expect(excludedIds(r)).toContain('urinary-struvite-01');
    // "비산성화" 서술이 '산성화'로 오탐되어 잘못 탈락하면 안 됨
    expect(excludedIds(r)).not.toContain('urinary-multi-02');
    expect(ids(r)).toContain('urinary-multi-02');
  });

  it('당뇨 — 저탄수 습식 상위, 단순당·반습식 탈락', () => {
    const r = recommend(input({ diseases: ['diabetes'], goal: '질환관리' }), SEED_FOODS);
    report('당뇨', r);
    expect(r.top[0].food.tags).toContain('low_carb');
    expect(hasExclusion(r, 'diabetes_sugar')).toBe(true);
    expect(ids(r)).not.toContain('treat-soft-99');
  });

  it('IBD — 가수분해/신규 단백 상위', () => {
    const r = recommend(input({ diseases: ['ibd'], goal: '질환관리' }), SEED_FOODS);
    report('IBD', r);
    const t = r.top.flatMap((x) => x.food.tags);
    expect(t.some((x) => x === 'hydrolyzed' || x === 'novel_protein')).toBe(true);
  });

  it('췌장염(만성) — 가수분해 고소화성 상위', () => {
    const r = recommend(input({ diseases: ['pancreatitis'], goal: '질환관리' }), SEED_FOODS);
    report('췌장염', r);
    expect(r.top[0].food.tags.some((x) => x === 'hydrolyzed' || x === 'digest')).toBe(true);
  });
});

describe('알레르겐 — 절대 배제 (§4-1 최우선 hard)', () => {
  it('닭 회피 — 1순위에 닭 없음', () => {
    const r = recommend(input({ avoid: ['닭'] }), SEED_FOODS);
    report('닭 회피', r);
    const chickenInTop = r.top.some((t) => t.food.ingredient_keywords.some((k) => k.includes('닭')));
    expect(chickenInTop).toBe(false);
    expect(hasExclusion(r, 'allergen')).toBe(true);
  });

  it('우선순위 박스 최상단이 알레르겐(weight=1)', () => {
    const r = recommend(input({ avoid: ['생선'] }), SEED_FOODS);
    expect(r.priorityOrder[0].key).toBe('allergen');
    expect(r.priorityOrder[0].weight).toBe(1);
  });
});

describe('동반질환 충돌 처리 (§4)', () => {
  it('CKD 3-4 + IBD — CKD가 primary (예후 우선)', () => {
    const r = recommend(input({ diseases: ['ibd', 'ckd_34'] }), SEED_FOODS);
    report('CKD 3-4 + IBD', r);
    expect(r.primaryMode).toBe('ckd_34');
  });

  it('당뇨 + 닭 알레르기 — 닭 없는 저탄수 습식 (칠면조)', () => {
    const r = recommend(input({ diseases: ['diabetes'], avoid: ['닭'], goal: '질환관리' }), SEED_FOODS);
    report('당뇨 + 닭 알레르기', r);
    expect(r.top[0].food.tags).toContain('low_carb');
    const chickenInTop = r.top.some((t) => t.food.ingredient_keywords.some((k) => k.includes('닭')));
    expect(chickenInTop).toBe(false);
  });

  it('3개 이상 중첩 — 조기 위임 고지', () => {
    const three: DiseaseMode[] = ['ckd_12', 'ibd', 'diabetes'];
    const r = recommend(input({ diseases: three }), SEED_FOODS);
    report('CKD+IBD+당뇨 (3중)', r);
    expect(r.notices.some((n) => n.includes('여러'))).toBe(true);
  });
});

describe('전 모드 커버리지 — TOP·신뢰도 점검', () => {
  it('모든 모드에서 TOP≥1, 점수 0~100 범위', () => {
    const modes: DiseaseMode[][] = [
      [], ['ckd_early'], ['ckd_12'], ['ckd_34'], ['struvite'], ['oxalate'],
      ['diabetes'], ['ibd'], ['pancreatitis'],
    ];
    for (const diseases of modes) {
      const r = recommend(input({ diseases, goal: diseases.length ? '질환관리' : '중노령 전환' }), SEED_FOODS);
      expect(r.top.length, `${diseases.join(',') || 'none'} TOP`).toBeGreaterThanOrEqual(1);
      for (const t of r.top) {
        expect(t.score).toBeGreaterThanOrEqual(0);
        expect(t.score).toBeLessThanOrEqual(100);
      }
    }
  });
});
