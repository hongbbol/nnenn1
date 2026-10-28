import { describe, expect, it } from 'vitest';
import type { Food } from '@/lib/domain/types';
import type { RecInput, RecResult } from './types';
import {
  buildDelta,
  buildDeltas,
  compareIntervals,
  halfUlp,
  metricInterval,
  phraseDiff,
} from './delta';

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
    sodium_pct: null,
    potassium_pct: null,
    chloride_pct: null,
    taurine_pct: null,
    epa_dha_pct: null,
    omega3_pct: null,
    magnesium_pct: null,
    calcium_pct: null,
    kcal_per_100g: 380,
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

function wet(over: Partial<Food> & { id: string }): Food {
  return food({
    category: '습식',
    protein_pct: 10,
    fat_pct: 5,
    fiber_pct: 0.5,
    ash_pct: 2,
    moisture_pct: 80,
    phosphorus_pct: 0.25,
    kcal_per_100g: 90,
    ...over,
  });
}

function result(over: Partial<RecResult> = {}, inputOver: Partial<RecInput> = {}): RecResult {
  const input: RecInput = {
    name: '보리',
    ageGroup: '1+',
    goal: '질환관리',
    diseases: [],
    avoid: [],
    excludeFoodIds: [],
    currentFoodId: 'cur',
    dietPref: '건식',
    formFilter: '전체',
    ...inputOver,
  };
  return {
    input,
    primaryMode: null,
    safetyGate: null,
    emergency: false,
    priorityOrder: [],
    top: [],
    excluded: [],
    notices: [],
    ...over,
  };
}

const text = (d: ReturnType<typeof buildDelta>) => (d.kind === 'lines' ? d.lines.map((l) => l.text) : []);
const tones = (d: ReturnType<typeof buildDelta>) => (d.kind === 'lines' ? d.lines.map((l) => l.tone) : []);

describe('구간 계산 — 라벨 반올림 반폭', () => {
  it('소수 자리수에 따라 반폭이 정해진다', () => {
    expect(halfUlp(0.2)).toBeCloseTo(0.05);
    expect(halfUlp(0.25)).toBeCloseTo(0.005);
    expect(halfUlp(30)).toBeCloseTo(0.5);
  });

  it('습식 소수 1자리 인 0.2%는 0.25%와 구간이 겹쳐 "비슷"', () => {
    const cur = metricInterval(wet({ id: 'cur', phosphorus_pct: 0.2 }), 'phosphorus')!;
    const cand = metricInterval(wet({ id: 'c', phosphorus_pct: 0.25 }), 'phosphorus')!;
    // 0.2% → 1.67~2.78 g/1000kcal, 0.25% → 2.72~2.83: 겹침.
    expect(compareIntervals(cur, cand, 0.2)).toEqual({ kind: 'similar' });
  });

  it('습식 kcal/100g > 200이면 열량 환산 지표를 계산하지 않는다(단위 오류·오분류 방어)', () => {
    expect(metricInterval(wet({ id: 'x', kcal_per_100g: 582 }), 'phosphorus')).toBeNull();
    expect(metricInterval(wet({ id: 'x', kcal_per_100g: 120 }), 'phosphorus')).not.toBeNull();
  });

  it('회분 결측 습식은 탄수 구간이 넓어져 작은 차이는 "비슷"으로 흡수된다', () => {
    const a = metricInterval(wet({ id: 'a', ash_pct: 2 }), 'carb')!;
    const b = metricInterval(wet({ id: 'b', ash_pct: null }), 'carb')!;
    expect(b.hi - b.lo).toBeGreaterThan(a.hi - a.lo);
  });
});

describe('문구 — 숫자 규칙', () => {
  it('5% 단위 반올림·배수·분의 1', () => {
    expect(phraseDiff({ kind: 'diff', rel: -0.333, pct: 35, ratio: 0.667 })).toBe('약 35% 적어요');
    expect(phraseDiff({ kind: 'diff', rel: 0.22, pct: 20, ratio: 1.22 })).toBe('약 20% 많아요');
    expect(phraseDiff({ kind: 'diff', rel: 1.3, pct: 130, ratio: 2.3 })).toBe('약 2.5배예요');
    expect(phraseDiff({ kind: 'diff', rel: 33, pct: 3300, ratio: 34 })).toBe('약 34배예요');
    expect(phraseDiff({ kind: 'diff', rel: -0.5, pct: 50, ratio: 0.5 })).toBe('절반 수준이에요');
    expect(phraseDiff({ kind: 'diff', rel: -0.9, pct: 90, ratio: 0.1 })).toBe('10분의 1 수준이에요');
  });
});

describe('CKD — 인 1차 지표', () => {
  const cur = food({ id: 'cur', phosphorus_pct: 1.2, kcal_per_100g: 400 }); // 3.0 g/1000kcal
  const r = (top: Food[]) =>
    result(
      { primaryMode: 'ckd_12', top: top.map((f) => ({ food: f, score: 80, reasons: [], lowConfidence: false })) },
      { diseases: ['ckd_12'] },
    );

  it('인이 35% 적으면 good 톤 + 신장 이유', () => {
    const cand = food({ id: 'c', phosphorus_pct: 0.8, kcal_per_100g: 400 }); // 2.0
    const d = buildDelta(cand, cur, r([cand]));
    expect(text(d)[0]).toBe('인이 약 35% 적어요. 신장 부담을 줄이는 가장 중요한 변화예요.');
    expect(tones(d)[0]).toBe('good');
  });

  it('인이 더 많으면 같은 톤 규칙으로 warn', () => {
    const cand = food({ id: 'c', phosphorus_pct: 1.6, kcal_per_100g: 400 }); // 4.0
    const d = buildDelta(cand, cur, r([cand]));
    expect(text(d)[0]).toBe('인이 약 35% 많아요. 신장에는 낮은 쪽이 유리해요.');
    expect(tones(d)[0]).toBe('warn');
  });

  it('건식끼리 ±10% 안이면 숫자 없이 비슷하다고 하고, 전부 비슷하면 수의사 판단 문장으로 닫는다', () => {
    const cand = food({ id: 'c', phosphorus_pct: 1.1, kcal_per_100g: 400 }); // -8%
    const d = buildDelta(cand, cur, r([cand]));
    const t = text(d);
    expect(t[0]).toBe('인은 지금 사료와 비슷해요. 신장 부담은 지금과 같은 수준이에요.');
    expect(t[t.length - 1]).toContain('처방식을 먹이고 있다면 수의사 판단이 우선이에요');
    expect(t.join(' ')).not.toMatch(/%/);
  });

  it('부수 지표(단백·나트륨)가 비슷하면 한 줄로 묶는다', () => {
    const cur2 = food({ id: 'cur', phosphorus_pct: 1.2, sodium_pct: 0.4, kcal_per_100g: 400 });
    const cand = food({ id: 'c', phosphorus_pct: 0.8, sodium_pct: 0.4, kcal_per_100g: 400 });
    const d = buildDelta(cand, cur2, r([cand]));
    expect(text(d)).toEqual([
      '인이 약 35% 적어요. 신장 부담을 줄이는 가장 중요한 변화예요.',
      '단백질·나트륨은 지금과 비슷해요.',
    ]);
  });

  it('나트륨이 높아지면 warn + 수의사 확인 문구', () => {
    const cur2 = food({ id: 'cur', phosphorus_pct: 1.2, sodium_pct: 0.3, kcal_per_100g: 400 });
    const cand = food({ id: 'c', phosphorus_pct: 0.8, sodium_pct: 0.5, kcal_per_100g: 400 });
    const d = buildDelta(cand, cur2, r([cand]));
    expect(text(d)[1]).toBe('나트륨이 약 65% 많아요. 심장·혈압 문제가 있으면 수의사와 확인하세요.');
    expect(tones(d)[1]).toBe('warn');
  });

  it('현재 사료가 TOP에 들어오면 same + 순위', () => {
    const cand = food({ id: 'c', phosphorus_pct: 0.8 });
    const d = buildDelta(cur, cur, r([cand, cur]));
    expect(d).toEqual({ kind: 'same', rank: 1 });
  });
});

describe('요로 — 물 섭취', () => {
  const cur = food({ id: 'cur', moisture_pct: 10, kcal_per_100g: 380 });
  const cand = wet({ id: 'c', moisture_pct: 80, kcal_per_100g: 90 });
  const r = result(
    { primaryMode: 'struvite', top: [{ food: cand, score: 80, reasons: [], lowConfidence: false }] },
    { diseases: ['struvite'] },
  );

  it('체중이 있으면 배수 대신 하루 ml로 말한다', () => {
    const d = buildDelta(cand, cur, r, { weightKg: 4.5, neutered: '완료' });
    // MER ≈ 259 kcal/일, 수분 26→889 g/1000kcal → +223 ml ≈ 220.
    expect(text(d)[0]).toBe('사료로 먹는 물이 하루 약 220 ml 늘어요. 소변이 묽어져 결석 관리에 도움이 돼요.');
    expect(tones(d)[0]).toBe('good');
  });

  it('체중이 없으면 배수로 말한다', () => {
    const d = buildDelta(cand, cur, r);
    expect(text(d)[0]).toMatch(/^사료로 먹는 물이 약 \d+배예요\./);
  });
});

describe('당뇨 — 탄수 1차·단백 2차', () => {
  it('탄수 10분의 1이면 혈당 이유, 단백 많으면 good', () => {
    const cur = food({ id: 'cur', protein_pct: 30, fat_pct: 12, fiber_pct: 3, ash_pct: 7, moisture_pct: 10, kcal_per_100g: 380 }); // NFE 38
    const cand = wet({ id: 'c', protein_pct: 12, fat_pct: 6, ash_pct: 2, fiber_pct: 0.5, moisture_pct: 78, kcal_per_100g: 100 }); // NFE 1.5
    const r = result(
      { primaryMode: 'diabetes', top: [{ food: cand, score: 80, reasons: [], lowConfidence: false }] },
      { diseases: ['diabetes'] },
    );
    const d = buildDelta(cand, cur, r);
    const t = text(d);
    expect(t[0]).toMatch(/^탄수화물이 \d+분의 1 수준이에요\. 식후 혈당이 덜 출렁여요\.$/);
    expect(t[1]).toBe('단백질이 약 50% 많아요. 근육을 지키는 데 유리해요.');
    expect(tones(d).slice(0, 2)).toEqual(['good', 'good']);
  });
});

describe('IBD — 단백 전략이 숫자보다 앞', () => {
  it('가수분해로 바뀌면 그 줄이 1번', () => {
    const cur = food({ id: 'cur' });
    const cand = food({ id: 'c', tags: ['hydrolyzed'], protein_pct: 34 });
    const r = result(
      { primaryMode: 'ibd', top: [{ food: cand, score: 80, reasons: [], lowConfidence: false }] },
      { diseases: ['ibd'] },
    );
    const d = buildDelta(cand, cur, r);
    expect(text(d)[0]).toBe('가수분해 단백으로 바뀌어요. 장이 반응할 항원이 줄어요.');
  });
});

describe('질환 없음 — 기준 없이 장단점만', () => {
  it('차이 큰 순으로 최대 3줄, 전부 info 톤', () => {
    const cur = food({ id: 'cur', protein_pct: 30, fat_pct: 12, moisture_pct: 10, kcal_per_100g: 380 });
    const cand = food({ id: 'c', protein_pct: 40, fat_pct: 20, moisture_pct: 10, kcal_per_100g: 420 });
    const r = result(
      { top: [{ food: cand, score: 80, reasons: [], lowConfidence: false }] },
      { goal: '중노령 전환', diseases: [] },
    );
    const d = buildDelta(cand, cur, r);
    expect(d.kind).toBe('lines');
    expect(text(d).length).toBeLessThanOrEqual(3);
    expect(tones(d).every((t) => t === 'info')).toBe(true);
    expect(text(d)[0]).toMatch(/^지방이 약 \d+% 많아요/); // 가장 큰 차이가 먼저
  });

  it('감량 목표는 열량(건물 기준)이 1차', () => {
    const cur = food({ id: 'cur', kcal_per_100g: 420, moisture_pct: 10 });
    const cand = food({ id: 'c', kcal_per_100g: 340, moisture_pct: 10 });
    const r = result(
      { top: [{ food: cand, score: 80, reasons: [], lowConfidence: false }] },
      { goal: '체중관리 - 감량', diseases: [] },
    );
    expect(text(buildDelta(cand, cur, r))[0]).toBe(
      '열량(같은 양 기준)이 약 20% 적어요. 감량에 유리해요(수분 뺀 기준).',
    );
  });
});

describe('buildDeltas', () => {
  it('현재 사료가 없으면 null, 있으면 TOP마다 하나', () => {
    const a = food({ id: 'a' });
    const b = food({ id: 'b' });
    const r = result({
      top: [a, b].map((f) => ({ food: f, score: 80, reasons: [], lowConfidence: false })),
    });
    expect(buildDeltas(r, null)).toBeNull();
    const m = buildDeltas(r, food({ id: 'cur' }))!;
    expect([...m.keys()]).toEqual(['a', 'b']);
  });

  it('현재 사료 영양 정보가 없으면 계산 불가 문장', () => {
    const cand = food({ id: 'c' });
    const cur = food({ id: 'cur', kcal_per_100g: null });
    const r = result({ top: [{ food: cand, score: 80, reasons: [], lowConfidence: false }] });
    expect(text(buildDelta(cand, cur, r))).toEqual(['현재 사료의 영양 정보가 부족해 차이를 계산하지 못했어요.']);
  });
});

describe('점검 후 추가 규칙(2026-10-28 실데이터 점검)', () => {
  it('물: 건식끼리 수분 8%→10%는 비율로 +30%지만 하루 20 ml 미만이라 "비슷"으로 묶는다', () => {
    const cur = food({ id: 'cur', moisture_pct: 8, kcal_per_100g: 366 });
    const cand = food({ id: 'c', moisture_pct: 10, kcal_per_100g: 349 });
    const r = result(
      { primaryMode: 'struvite', top: [{ food: cand, score: 80, reasons: [], lowConfidence: false }] },
      { diseases: ['struvite'] },
    );
    const t = text(buildDelta(cand, cur, r, { weightKg: 4.5, neutered: '완료' }));
    expect(t[0]).toBe('사료로 먹는 물은 지금 사료와 비슷해요.');
    expect(t.join(' ')).not.toMatch(/물이 약/);
  });

  it('나트륨 감소는 good이 아니라 info(레지스트리 §3-A 적정 범위·초저 회피), 증가는 warn', () => {
    const cur = food({ id: 'cur', phosphorus_pct: 1.2, sodium_pct: 1.8, kcal_per_100g: 400 });
    const down = food({ id: 'd', phosphorus_pct: 0.8, sodium_pct: 0.2, kcal_per_100g: 400 });
    const up = food({ id: 'u', phosphorus_pct: 0.8, sodium_pct: 3.0, kcal_per_100g: 400 });
    const r = result(
      { primaryMode: 'ckd_12', top: [down, up].map((f) => ({ food: f, score: 80, reasons: [], lowConfidence: false })) },
      { diseases: ['ckd_12'] },
    );
    const dd = buildDelta(down, cur, r);
    const du = buildDelta(up, cur, r);
    expect(tones(dd)[1]).toBe('info');
    expect(text(dd)[1]).toBe('나트륨이 9분의 1 수준이에요.');
    expect(tones(du)[1]).toBe('warn');
    expect(text(du)[1]).toContain('수의사와 확인');
  });
});

describe('인 라벨값 타당성 하한(건물 0.2%) — 보증 최소값 오도 방지(S1169 실증)', () => {
  it('건식 인 0.05%(as-fed)는 결측 취급, 습식 0.09%(DM 0.39%)는 유지', () => {
    const dryGaMin = food({ id: 'ga', phosphorus_pct: 0.05, moisture_pct: 10 });
    const wetRenal = wet({ id: 'w', phosphorus_pct: 0.09, moisture_pct: 77 });
    expect(metricInterval(dryGaMin, 'phosphorus')).toBeNull();
    expect(metricInterval(wetRenal, 'phosphorus')).not.toBeNull();
  });
});
