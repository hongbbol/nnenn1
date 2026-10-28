/**
 * '지금 사료 대비 변화' — 추천 후보 vs 현재 급여 사료의 차이를 쉬운 문장으로(2026-10-28).
 *
 * 설계 원칙
 * - 단위는 스코어러와 같은 **ME 기준(g/1000kcal)**. as-fed %로 건식·습식을 비교하면 수분 때문에
 *   방향이 뒤집힌다(습식 인 0.25% vs 건식 1.0%가 열량 기준으로는 비슷할 수 있다).
 * - 점(point)이 아니라 **구간(interval)** 비교. 라벨 반올림(소수 1자리 "0.2%"는 0.15~0.25)을
 *   반영해 두 구간이 겹치면 숫자 없이 "비슷해요". 습식 인 수치의 약 30%가 이 구간이라 필수.
 * - "비슷" 밴드는 건식끼리 ±10%, 습식이 끼면 ±20%. 숫자는 5% 단위 반올림(정밀한 척 금지).
 * - 점수·순위에는 절대 쓰지 않는다(표시 전용). 현재 사료 자체는 RecInput.currentFoodId 스냅샷.
 * - "바꿀 이유가 크지 않아요"류 문장은 **영양 수치에 한정**하고 처방식은 수의사 판단이 우선임을 적는다.
 * - 질환이 없으면 기준을 세우지 않고 두 사료의 장단점만 중립 톤으로 나열한다(2026-10-28 사용자 결정).
 */
import type { Food } from '@/lib/domain/types';
import type { NeuteredStatus } from '@/lib/domain/constants';
import type { DiseaseMode, RecResult, ScoreReason } from './types';
import { ASH_DEFAULT_PCT, kcalPer100gDm, nfePct, plausiblePhosphorusPct } from './nutrition';
import { KEYWORDS, matchesAny } from './rules';

export type DeltaTone = ScoreReason['tone'];
export type DeltaLine = { tone: DeltaTone; text: string };

export type DeltaSummary =
  /** 후보가 현재 사료 그 자체(현재 사료가 TOP에 들어온 경우). */
  | { kind: 'same'; rank: number }
  /** 비교 문장. note는 카드 하단 작은 글씨(라벨 기준·같은 열량 가정). */
  | { kind: 'lines'; lines: DeltaLine[]; note: string };

export type DeltaContext = {
  /** 하루 물 섭취량 환산용(선택). 없으면 배수/퍼센트만 말한다. */
  weightKg?: number | null;
  neutered?: NeuteredStatus | null;
};

/** 카드 하단 고지 — 모든 Δ에 공통. */
export const DELTA_NOTE = '제조사 라벨 기준 · 같은 열량을 먹는다고 가정해 비교했어요';

/** 습식 kcal/100g 상한 — 이보다 크면 단위 오류·동결건조 오분류로 보고 열량 환산 비교를 보류. */
export const WET_KCAL_MAX_PER_100G = 200;

/** "비슷" 밴드 — 상대 차이가 이 안이면 숫자 없이 비슷하다고 말한다. */
export const SIMILAR_BAND = { dry: 0.1, wet: 0.2 } as const;

// ─── 구간 계산 ─────────────────────────────────────────────────

type Interval = { lo: number; mid: number; hi: number };

/** 라벨 표기 반올림 반폭 — 소수 d자리 → 0.5×10^-d (정수 "30" → 0.5). */
export function halfUlp(v: number): number {
  const s = String(v);
  if (/e/i.test(s)) return 0;
  const i = s.indexOf('.');
  const d = i < 0 ? 0 : s.length - i - 1;
  return 0.5 * Math.pow(10, -d);
}

function usableKcal(food: Food): number | null {
  const k = food.kcal_per_100g;
  if (k == null || k <= 0) return null;
  if (food.category === '습식' && k > WET_KCAL_MAX_PER_100G) return null;
  return k;
}

/** as-fed % (± 반올림 반폭) → g/1000kcal 구간. */
function pctInterval(v: number | null, kcal: number | null): Interval | null {
  if (v == null || kcal == null) return null;
  const h = halfUlp(v);
  return {
    lo: (Math.max(0, v - h) * 1000) / kcal,
    mid: (v * 1000) / kcal,
    hi: ((v + h) * 1000) / kcal,
  };
}

/** 탄수(NFE) 구간 — 5개 값의 반올림 오차가 누적되고, 회분·섬유 결측은 기본값 불확실성을 더한다. */
function carbInterval(food: Food, kcal: number | null): Interval | null {
  if (kcal == null) return null;
  const nfe = nfePct({
    moisture: food.moisture_pct,
    protein: food.protein_pct,
    fat: food.fat_pct,
    ash: food.ash_pct,
    fiber: food.fiber_pct,
    category: food.category,
  });
  if (nfe == null) return null;
  const ashUnc = food.ash_pct == null ? ASH_DEFAULT_PCT[food.category] * 0.5 : halfUlp(food.ash_pct);
  const fiberUnc = food.fiber_pct == null ? 1 : halfUlp(food.fiber_pct);
  const unc =
    halfUlp(food.moisture_pct!) + halfUlp(food.protein_pct!) + halfUlp(food.fat_pct!) + ashUnc + fiberUnc;
  return {
    lo: (Math.max(0, nfe - unc) * 1000) / kcal,
    mid: (nfe * 1000) / kcal,
    hi: ((nfe + unc) * 1000) / kcal,
  };
}

/** 열량 밀도(kcal/100g 건물 기준) 구간 — 수분 결측(제형 가정)이면 ±15%, 아니면 ±2%. */
function energyInterval(food: Food, kcal: number | null): Interval | null {
  if (kcal == null) return null;
  const dm = kcalPer100gDm(kcal, food.moisture_pct, food.category);
  if (dm == null) return null;
  const rel = dm.assumedMoisture ? 0.15 : 0.02;
  return { lo: dm.value * (1 - rel), mid: dm.value, hi: dm.value * (1 + rel) };
}

export type MetricKey =
  | 'phosphorus'
  | 'protein'
  | 'fat'
  | 'sodium'
  | 'magnesium'
  | 'carb'
  | 'water'
  | 'energy';

/** 지표별 ME 기준 구간. 계산 불가(결측·kcal 비정상)는 null. */
export function metricInterval(food: Food, key: MetricKey): Interval | null {
  const kcal = usableKcal(food);
  switch (key) {
    case 'phosphorus':
      // 보증 최소값 등 타당성 하한 미달 인은 결측 취급(nutrition.plausiblePhosphorusPct).
      return pctInterval(plausiblePhosphorusPct(food), kcal);
    case 'protein':
      return pctInterval(food.protein_pct, kcal);
    case 'fat':
      return pctInterval(food.fat_pct, kcal);
    case 'sodium':
      return pctInterval(food.sodium_pct, kcal);
    case 'magnesium':
      return pctInterval(food.magnesium_pct, kcal);
    case 'carb':
      return carbInterval(food, kcal);
    case 'water':
      // 수분 g/1000kcal = 사료로 먹는 물(ml)/1000kcal.
      return pctInterval(food.moisture_pct, kcal);
    case 'energy':
      return energyInterval(food, kcal);
  }
}

// ─── 비교 ─────────────────────────────────────────────────────

export type Comparison =
  | { kind: 'similar' }
  | { kind: 'diff'; rel: number; pct: number; ratio: number };

function round5(x: number): number {
  return Math.max(5, Math.round(x / 5) * 5);
}

/**
 * 현재(cur) 대비 후보(cand). 구간이 겹치거나 상대 차이가 밴드 안이면 similar.
 * cur가 0에 가까우면(탄수 0 등) 배수가 무의미해 null(해당 지표 생략).
 */
export function compareIntervals(cur: Interval, cand: Interval, band: number): Comparison | null {
  if (cur.mid < 1e-6) return cand.mid < 1e-6 ? { kind: 'similar' } : null;
  const overlap = cand.lo <= cur.hi && cur.lo <= cand.hi;
  const rel = (cand.mid - cur.mid) / cur.mid;
  if (overlap || Math.abs(rel) < band) return { kind: 'similar' };
  return { kind: 'diff', rel, pct: round5(Math.abs(rel) * 100), ratio: cand.mid / cur.mid };
}

function bandFor(a: Food, b: Food): number {
  return a.category === '습식' || b.category === '습식' ? SIMILAR_BAND.wet : SIMILAR_BAND.dry;
}

/** "약 35% 적어요" / "약 2배예요" / "절반 수준이에요". */
export function phraseDiff(c: Extract<Comparison, { kind: 'diff' }>): string {
  if (c.rel > 0) {
    if (c.ratio >= 1.9) {
      const r = c.ratio >= 3 ? Math.round(c.ratio) : Math.round(c.ratio * 2) / 2;
      return `약 ${Number.isInteger(r) ? r : r.toFixed(1)}배예요`;
    }
    return `약 ${c.pct}% 많아요`;
  }
  if (c.ratio <= 0.55) {
    const n = Math.round(1 / c.ratio);
    return n <= 2 ? '절반 수준이에요' : `${n}분의 1 수준이에요`;
  }
  return `약 ${c.pct}% 적어요`;
}

// ─── 지표 사양(모드별) ────────────────────────────────────────

type Direction = 'lower' | 'higher' | 'neutral';

type MetricSpec = {
  key: MetricKey;
  /** 문장 주어("인", "단백질"…). 전부 받침이 있어 조사는 '이/은'으로 고정. */
  name: string;
  good: Direction;
  /** 좋은 방향으로 바뀔 때 덧붙이는 이유. */
  whyBetter?: string;
  /** 나쁜 방향일 때. */
  whyWorse?: string;
  /** 비슷할 때(1차 지표에만 쓴다). */
  whySimilar?: string;
  /** neutral 지표가 바뀔 때(많아요/적어요 둘 다). */
  whyNeutral?: { up?: string; down?: string };
  /** 방향별 톤 덮어쓰기 — 예: 나트륨은 '낮을수록 좋다'가 아니라 '과량 회피'라 감소는 info(레지스트리 §3-A). */
  toneOverride?: { up?: DeltaTone; down?: DeltaTone };
};

const P_CKD: MetricSpec = {
  key: 'phosphorus',
  name: '인',
  good: 'lower',
  whyBetter: '신장 부담을 줄이는 가장 중요한 변화예요.',
  whyWorse: '신장에는 낮은 쪽이 유리해요.',
  whySimilar: '신장 부담은 지금과 같은 수준이에요.',
};
const PROTEIN_INFO: MetricSpec = {
  key: 'protein',
  name: '단백질',
  good: 'neutral',
  whyNeutral: { up: '근육 유지에는 유리해요.', down: '근육 유지를 위해 너무 낮지 않은지 봐야 해요.' },
};
const PROTEIN_HIGH: MetricSpec = {
  key: 'protein',
  name: '단백질',
  good: 'higher',
  whyBetter: '근육을 지키는 데 유리해요.',
  whyWorse: '근육 유지를 위해 너무 낮지 않은지 봐야 해요.',
};
/** CKD 나트륨 — 레지스트리 §3-A: 0.5–1 g/1000kcal '적정', 과량·초저 모두 회피(근거 약함). 감소를 '좋음'으로 단정하지 않는다. */
const SODIUM_LOW: MetricSpec = {
  key: 'sodium',
  name: '나트륨',
  good: 'lower',
  whyWorse: '심장·혈압 문제가 있으면 수의사와 확인하세요.',
  toneOverride: { down: 'info' },
};
const WATER_HIGH: MetricSpec = {
  key: 'water',
  name: '사료로 먹는 물',
  good: 'higher',
  whyBetter: '소변이 묽어져 결석 관리에 도움이 돼요.',
  whyWorse: '물을 덜 먹게 되니 음수량을 따로 챙겨야 해요.',
};
/** 스트루바이트 마그네슘 — 레지스트리 §3-B: 보조 레버(최근 연구는 소변 pH가 더 중요). 과장 금지. */
const MG_LOW: MetricSpec = {
  key: 'magnesium',
  name: '마그네슘',
  good: 'lower',
  whyBetter: '스트루바이트 관리에 보조적으로 유리해요(소변 pH가 더 중요해요).',
  whyWorse: '스트루바이트에는 낮은 쪽이 보조적으로 유리해요.',
};
const CARB_LOW: MetricSpec = {
  key: 'carb',
  name: '탄수화물',
  good: 'lower',
  whyBetter: '식후 혈당이 덜 출렁여요.',
  whyWorse: '혈당 관리에는 낮은 쪽이 유리해요.',
  whySimilar: '혈당에 미치는 영향은 지금과 비슷해요.',
};
const FAT_INFO: MetricSpec = {
  key: 'fat',
  name: '지방',
  good: 'neutral',
  whyNeutral: { up: '열량이 높아 잘 먹는 아이에겐 괜찮지만 체중을 봐야 해요.', down: undefined },
};
const ENERGY_LOW: MetricSpec = {
  key: 'energy',
  name: '열량(같은 양 기준)',
  good: 'lower',
  whyBetter: '감량에 유리해요(수분 뺀 기준).',
  whyWorse: '감량 중이라면 급여량을 더 줄여야 해요.',
  whySimilar: '감량 효과는 지금과 비슷해요.',
};
const ENERGY_HIGH: MetricSpec = {
  key: 'energy',
  name: '열량(같은 양 기준)',
  good: 'higher',
  whyBetter: '적게 먹어도 살이 붙는 데 도움이 돼요(수분 뺀 기준).',
  whyWorse: '증량 중이라면 더 많이 먹여야 해요.',
  whySimilar: '증량 효과는 지금과 비슷해요.',
};
const P_SENIOR: MetricSpec = {
  key: 'phosphorus',
  name: '인',
  good: 'lower',
  whyBetter: '노령묘는 낮은 쪽이 신장에 부담이 적어요.',
  whyWorse: '노령묘는 낮은 쪽이 신장에 부담이 적어요.',
};
const ENERGY_INFO: MetricSpec = {
  key: 'energy',
  name: '열량(같은 양 기준)',
  good: 'neutral',
  whyNeutral: { up: '급여량을 조금 줄여야 할 수 있어요.', down: '급여량을 조금 늘려야 할 수 있어요.' },
};
const WATER_INFO: MetricSpec = {
  key: 'water',
  name: '사료로 먹는 물',
  good: 'neutral',
  whyNeutral: { up: '음수량 보충에 도움이 돼요.', down: '물을 덜 먹게 되니 음수량을 따로 챙겨야 해요.' },
};

/** 모드별 지표 순서. 첫 항목이 1차 지표(비슷해도 반드시 한 줄). */
function specsForMode(mode: DiseaseMode): MetricSpec[] {
  switch (mode) {
    case 'ckd_early':
    case 'ckd_12':
    case 'ckd_34':
      return [P_CKD, PROTEIN_INFO, SODIUM_LOW];
    case 'struvite':
      return [WATER_HIGH, MG_LOW, PROTEIN_INFO];
    case 'oxalate':
      return [WATER_HIGH, PROTEIN_INFO];
    case 'diabetes':
      return [CARB_LOW, PROTEIN_HIGH, WATER_INFO];
    case 'ibd':
    case 'pancreatitis':
      return [FAT_INFO, PROTEIN_INFO, WATER_INFO];
  }
}

/** 질환 없음 — 목표가 있으면 목표 지표, 없으면 장단점 중립 나열(기준 없음). */
function specsForHealthy(result: RecResult): { specs: MetricSpec[]; primary: boolean } {
  const { goal, ageGroup } = result.input;
  if (goal === '체중관리 - 감량') return { specs: [ENERGY_LOW, PROTEIN_HIGH, WATER_INFO], primary: true };
  if (goal === '체중관리 - 증량') return { specs: [ENERGY_HIGH, PROTEIN_HIGH, FAT_INFO], primary: true };
  const senior = ageGroup === '11+' || ageGroup === '15+';
  return {
    specs: [PROTEIN_INFO, senior ? P_SENIOR : { ...P_SENIOR, good: 'neutral', whyNeutral: {} }, FAT_INFO, WATER_INFO, ENERGY_INFO],
    primary: false,
  };
}

// ─── 문장 생성 ─────────────────────────────────────────────────

function toneFor(spec: MetricSpec, c: Extract<Comparison, { kind: 'diff' }>): DeltaTone {
  const override = c.rel > 0 ? spec.toneOverride?.up : spec.toneOverride?.down;
  if (override) return override;
  if (spec.good === 'neutral') return 'info';
  const better = spec.good === 'lower' ? c.rel < 0 : c.rel > 0;
  return better ? 'good' : 'warn';
}

function whyFor(spec: MetricSpec, c: Extract<Comparison, { kind: 'diff' }>, tone: DeltaTone): string | undefined {
  if (spec.good === 'neutral') return c.rel > 0 ? spec.whyNeutral?.up : spec.whyNeutral?.down;
  if (tone === 'good') return spec.whyBetter;
  if (tone === 'warn') return spec.whyWorse;
  return undefined;
}

/** 하루 물 섭취 차이(ml) — 체중·중성화로 MER 추정(RER 70×kg^0.75 × 1.2 중성화 / 1.4 미중성화). */
function dailyWaterDiffMl(cur: Interval, cand: Interval, ctx: DeltaContext): number | null {
  const kg = ctx.weightKg;
  if (kg == null || kg <= 0) return null;
  const factor = ctx.neutered === '안 함' ? 1.4 : 1.2;
  const mer = 70 * Math.pow(kg, 0.75) * factor;
  return ((cand.mid - cur.mid) / 1000) * mer;
}

/**
 * 한 줄 문장. 물은 하루 ml가 있으면 배수 대신 그 숫자로 말한다
 * (건식→습식은 "34배" 같은 수치가 나와 정확하지만 읽기 어렵다).
 */
function lineFor(
  spec: MetricSpec,
  c: Extract<Comparison, { kind: 'diff' }>,
  dailyMl: number | null,
): DeltaLine {
  const tone = toneFor(spec, c);
  const why = whyFor(spec, c, tone);
  let head: string;
  if (spec.key === 'water' && dailyMl != null) {
    const r = Math.round(Math.abs(dailyMl) / 10) * 10;
    head = `${spec.name}이 하루 약 ${r} ml ${dailyMl > 0 ? '늘어요' : '줄어요'}.`;
  } else {
    head = `${spec.name}이 ${phraseDiff(c)}.`;
  }
  return { tone, text: why ? `${head} ${why}` : head };
}

const MAX_LINES = 3;

/** 후보 하나에 대한 Δ. 현재 사료 그 자체면 'same'. */
export function buildDelta(
  candidate: Food,
  current: Food,
  result: RecResult,
  ctx: DeltaContext = {},
): DeltaSummary {
  const rank = result.top.findIndex((t) => t.food.id === candidate.id);
  if (candidate.id === current.id) return { kind: 'same', rank: rank < 0 ? 0 : rank };

  const mode = result.primaryMode;
  // IBD·췌장염은 숫자보다 단백 전략(가수분해·신규 단백) 변화가 1차 — 숫자 지표는 중립 나열.
  const strategyMode = mode === 'ibd' || mode === 'pancreatitis';
  const strategyLine = strategyMode ? proteinStrategyLine(candidate, current) : null;
  const { specs, primary } = mode
    ? { specs: specsForMode(mode), primary: !strategyMode }
    : specsForHealthy(result);
  const band = bandFor(current, candidate);

  const diffs: { line: DeltaLine; mag: number; idx: number }[] = [];
  const similar: string[] = [];
  let primaryLine: DeltaLine | null = null;
  let primarySimilar = false;
  let compared = 0;

  for (let idx = 0; idx < specs.length; idx++) {
    const spec = specs[idx];
    const cur = metricInterval(current, spec.key);
    const cand = metricInterval(candidate, spec.key);
    if (!cur || !cand) continue;
    let c = compareIntervals(cur, cand, band);
    if (!c) continue;
    compared++;
    // 물: 건식끼리 수분 8%→10% 같은 차이는 비율로는 +30%지만 하루 몇 ml라 의미가 없다.
    // 하루 ml를 알면 20 ml 미만, 모르면 1.5배 미만의 차이는 '비슷'으로 본다.
    if (spec.key === 'water' && c.kind === 'diff') {
      const ml = dailyWaterDiffMl(cur, cand, ctx);
      const trivial = ml != null ? Math.abs(ml) < 20 : c.ratio < 1.5 && c.ratio > 1 / 1.5;
      if (trivial) c = { kind: 'similar' };
    }
    if (c.kind === 'similar') {
      if (idx === 0 && primary) {
        primarySimilar = true;
        primaryLine = {
          tone: 'info',
          text: `${spec.name}은 지금 사료와 비슷해요. ${spec.whySimilar ?? ''}`.trim(),
        };
      } else {
        similar.push(spec.name);
      }
      continue;
    }
    let dailyMl: number | null = null;
    if (spec.key === 'water') {
      const ml = dailyWaterDiffMl(cur, cand, ctx);
      if (ml != null && Math.abs(ml) >= 20) dailyMl = ml;
    }
    const line = lineFor(spec, c, dailyMl);
    if (idx === 0 && primary) primaryLine = line;
    else diffs.push({ line, mag: Math.abs(c.rel), idx });
  }

  // 1차 지표 다음은 사양 순서(질환) 또는 차이 크기 순(건강묘 장단점·단백 전략 모드).
  diffs.sort((a, b) => (primary ? a.idx - b.idx : b.mag - a.mag));

  const lines: DeltaLine[] = [];
  if (strategyLine) lines.push(strategyLine);
  if (primaryLine) lines.push(primaryLine);
  for (const d of diffs) {
    if (lines.length >= MAX_LINES) break;
    lines.push(d.line);
  }
  if (similar.length > 0 && lines.length > 0 && lines.length < MAX_LINES && !primarySimilar) {
    lines.push({ tone: 'info', text: `${similar.join('·')}은 지금과 비슷해요.` });
  }

  if (compared === 0 && !strategyLine) {
    return {
      kind: 'lines',
      lines: [{ tone: 'info', text: '현재 사료의 영양 정보가 부족해 차이를 계산하지 못했어요.' }],
      note: DELTA_NOTE,
    };
  }
  if (diffs.length === 0 && !strategyLine && (primarySimilar || !primaryLine)) {
    // 전부 비슷함 — 영양 수치에 한정해 말하고, 처방식 판단은 수의사에게.
    return {
      kind: 'lines',
      lines: [
        ...(primaryLine ? [primaryLine] : []),
        {
          tone: 'info',
          text: '영양 수치만 보면 지금 사료와 거의 같아요. 처방식을 먹이고 있다면 수의사 판단이 우선이에요.',
        },
      ],
      note: DELTA_NOTE,
    };
  }
  return { kind: 'lines', lines, note: DELTA_NOTE };
}

/** 추천 결과의 TOP 전부에 대한 Δ. 현재 사료가 없으면 null(섹션 비표시). */
export function buildDeltas(
  result: RecResult,
  current: Food | null,
  ctx: DeltaContext = {},
): Map<string, DeltaSummary> | null {
  if (!current) return null;
  const out = new Map<string, DeltaSummary>();
  for (const t of result.top) out.set(t.food.id, buildDelta(t.food, current, result, ctx));
  return out;
}

/** IBD·췌장염 — 단백 전략(가수분해·신규 단백)이 바뀌는지. 숫자 지표보다 앞에 둔다. */
export function proteinStrategyLine(candidate: Food, current: Food): DeltaLine | null {
  const hay = (f: Food) => [...f.tags, ...f.ingredient_keywords].map((s) => s.toLowerCase());
  const hc = hay(candidate);
  const hn = hay(current);
  const candHydro = matchesAny(hc, KEYWORDS.hydrolyzed);
  const curHydro = matchesAny(hn, KEYWORDS.hydrolyzed);
  const candNovel = matchesAny(hc, KEYWORDS.novelProtein);
  const curNovel = matchesAny(hn, KEYWORDS.novelProtein);
  if (candHydro && !curHydro) {
    return { tone: 'good', text: '가수분해 단백으로 바뀌어요. 장이 반응할 항원이 줄어요.' };
  }
  if (!candHydro && curHydro) {
    return { tone: 'warn', text: '지금 사료와 달리 가수분해 단백이 아니에요. 바꾸기 전에 수의사와 상의하세요.' };
  }
  if (candNovel && !curNovel) {
    return { tone: 'good', text: '지금까지 안 먹어본 단백원이에요. 알레르기 반응을 피하는 데 도움이 돼요.' };
  }
  return null;
}
