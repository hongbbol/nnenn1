/**
 * 실데이터 회귀 — ETL 시드(scripts/etl/foods.seed.json, nnenn2 전량)로 엔진을 돌려 행동 불변식을 지킨다.
 *
 * 2026-10-20 전체 검토에서 "픽스처(SEED_FOODS)로만 통과하고 실데이터에서는 필터가 0건·제형 선호 무시·
 * 같은 브랜드 형제 제품 TOP 2·감량=항상 습식" 결함이 발견돼 신설. 데이터 배치마다 시드가 바뀌므로
 * 특정 제품명이 아니라 **규칙이 지켜지는가**만 검사한다. 시드 파일이 없으면 skip.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Food } from '@/lib/domain/types';
import { recommend } from './engine';
import { kcalPer100gDm } from './nutrition';
import type { DiseaseMode, RecInput, RecResult } from './types';

const SEED_PATH = join(__dirname, '../../../scripts/etl/foods.seed.json');
const hasSeed = existsSync(SEED_PATH);

function loadFoods(): Food[] {
  const raw = JSON.parse(readFileSync(SEED_PATH, 'utf8')) as Array<Record<string, unknown>>;
  return raw.map((r) => ({ ...(r as unknown as Food), id: r.source_sku_id as string }));
}

const base = (): Pick<RecInput, 'name' | 'excludeFoodIds' | 'avoid'> => ({ name: '회귀', excludeFoodIds: [], avoid: [] });
const MODES: DiseaseMode[] = ['ckd_early', 'ckd_12', 'ckd_34', 'diabetes', 'struvite', 'oxalate', 'ibd', 'pancreatitis'];

type Scenario = { name: string; input: RecInput };
function scenarios(): Scenario[] {
  const out: Scenario[] = [];
  for (const ageGroup of ['1+', '7+', '11+', '15+'] as const)
    for (const goal of ['중노령 전환', '체중관리 - 감량', '체중관리 - 증량'] as const)
      for (const dietPref of ['건식', '습식'] as const)
        out.push({ name: `${ageGroup}/${goal}/${dietPref}`, input: { ...base(), ageGroup, goal, diseases: [], dietPref } });
  for (const d of MODES)
    for (const dietPref of ['건식', '습식'] as const)
      out.push({ name: `11+/${d}/${dietPref}`, input: { ...base(), ageGroup: '11+', goal: '질환관리', diseases: [d], dietPref } });
  out.push({ name: '11+/ckd_12+diabetes', input: { ...base(), ageGroup: '11+', goal: '질환관리', diseases: ['ckd_12', 'diabetes'], dietPref: '건식' } });
  out.push({ name: '11+/ckd_34+struvite+ibd', input: { ...base(), ageGroup: '11+', goal: '질환관리', diseases: ['ckd_34', 'struvite', 'ibd'], dietPref: '건식' } });
  out.push({ name: '7+/pancreatitis+ibd', input: { ...base(), ageGroup: '7+', goal: '질환관리', diseases: ['pancreatitis', 'ibd'], dietPref: '습식' } });
  return out;
}

const hasKw = (f: Food, kw: string) => f.ingredient_keywords.includes(kw);

describe.skipIf(!hasSeed)('실데이터 회귀 (scripts/etl/foods.seed.json)', () => {
  const foods = hasSeed ? loadFoods() : [];
  const results = new Map<string, RecResult>();
  for (const s of scenarios()) results.set(s.name, recommend(s.input, foods));
  const all = [...results.entries()];

  it('모든 시나리오에서 TOP 2가 채워지고 전원 한국 구매 가능·주식·활성', () => {
    for (const [name, r] of all) {
      expect(r.top.length, name).toBe(2);
      for (const t of r.top) {
        expect(t.food.kr_available, `${name}: ${t.food.product_name}`).toBe(true);
        expect(t.food.active, name).toBe(true);
        expect(t.food.tags, name).toContain('주식');
      }
    }
  });

  it('질환 없는 시나리오는 1위가 "주로 먹는 식단" 제형과 같다 (전환 용이)', () => {
    for (const [name, r] of all) {
      if (r.input.diseases.length > 0) continue;
      expect(r.top[0].food.category, name).toBe(r.input.dietPref);
    }
  });

  it('TOP 2는 같은 브랜드 형제 제품이 아니다 (dev-plan §4.5 다양성)', () => {
    for (const [name, r] of all) {
      expect(r.top[0].food.brand, name).not.toBe(r.top[1].food.brand);
    }
  });

  it('하드 게이트가 실데이터 토큰에서 실제로 작동한다 (CKD 인산염·옥살레이트 산성화제/비타민C/크랜베리·당뇨 첨가당·공통 독성)', () => {
    for (const [name, r] of all) {
      const ds = r.input.diseases;
      for (const t of r.top) {
        const f = t.food;
        expect(hasKw(f, 'allium') || hasKw(f, 'propylene_glycol') || hasKw(f, 'xylitol'), `${name}: 독성 ${f.product_name}`).toBe(false);
        if (ds.some((d) => d.startsWith('ckd'))) expect(hasKw(f, 'inorganic_phosphate'), `${name}: 인산염 ${f.product_name}`).toBe(false);
        if (ds.includes('oxalate')) {
          expect(hasKw(f, 'acidifier') || hasKw(f, 'vitamin_c') || hasKw(f, 'cranberry'), `${name}: 옥살레이트 금기 ${f.product_name}`).toBe(false);
        }
        if (ds.includes('diabetes')) expect(hasKw(f, 'added_sugar'), `${name}: 첨가당 ${f.product_name}`).toBe(false);
      }
    }
    // 토큰이 실제로 걸러낸 건수 — 0이면 ETL 토큰 주입이 깨진 것.
    const ox = results.get('11+/oxalate/건식')!;
    const codes = (r: RecResult) => new Set(r.excluded.flatMap((e) => e.reasons.map((x) => x.code)));
    expect(codes(ox).has('oxalate_acidifier')).toBe(true);
    expect(codes(results.get('11+/ckd_12/건식')!).has('ckd_phosphate_additive')).toBe(true);
    expect(codes(results.get('11+/diabetes/건식')!).has('diabetes_sugar')).toBe(true);
  });

  it('CKD 3-4기는 인 데이터 결측 후보를 상위에 노출하지 않고 보류 고지를 낸다', () => {
    for (const name of ['11+/ckd_34/건식', '11+/ckd_34/습식']) {
      const r = results.get(name)!;
      for (const t of r.top) expect(t.lowConfidence, `${name}: ${t.food.product_name}`).toBe(false);
      expect(r.notices.some((n) => n.includes('보류')), name).toBe(true);
    }
  });

  it('감량 목표는 건물(DM) 기준 저칼로리를 고르며 습식 편향이 없다', () => {
    for (const [name, r] of all) {
      if (r.input.goal !== '체중관리 - 감량' || r.input.diseases.length) continue;
      const f = r.top[0].food;
      const dm = kcalPer100gDm(f.kcal_per_100g, f.moisture_pct, f.category);
      expect(dm, name).not.toBeNull();
      expect(dm!.value, `${name}: ${f.product_name}`).toBeLessThanOrEqual(455);
    }
    // 건식 선호 감량에서 1위가 건식 — as-fed kcal 비교였다면 구조적으로 습식이 됐다.
    expect(results.get('7+/체중관리 - 감량/건식')!.top[0].food.category).toBe('건식');
  });

  it('특정 제품 한 개가 TOP 2를 독식하지 않는다 (시나리오의 40% 이하)', () => {
    const count = new Map<string, number>();
    for (const [, r] of all) for (const t of r.top) count.set(t.food.id, (count.get(t.food.id) ?? 0) + 1);
    const max = Math.max(...count.values());
    expect(max).toBeLessThanOrEqual(Math.ceil(all.length * 0.4));
  });

  it('췌장염: 저지방이 아니라 소화율·칼로리 — 1위는 소화기 목적 처방식, ACVIM 고지 포함 (§3-H 2026-10-20)', () => {
    for (const name of ['11+/pancreatitis/건식', '11+/pancreatitis/습식']) {
      const r = results.get(name)!;
      const f = r.top[0].food;
      expect(hasKw(f, 'hydrolyzed') || f.condition_fit.includes('IBD'), `${name}: ${f.product_name}`).toBe(true);
      expect(r.notices.some((n) => n.includes('ACVIM')), name).toBe(true);
      expect(r.priorityOrder.some((p) => p.key === 'energy'), name).toBe(true);
    }
  });

  it('동반질환은 보조 반영 고지·우선순위 박스 항목을 낸다 (§4-4)', () => {
    const r = results.get('11+/ckd_12+diabetes')!;
    expect(r.primaryMode).toBe('ckd_12');
    expect(r.notices.some((n) => n.includes('보조로 반영'))).toBe(true);
    expect(r.priorityOrder.some((p) => p.key === 'secondary_diabetes')).toBe(true);
  });

  it('생식·동결건조 제형이 TOP에 오르면 H5N1·병원체 경고가 붙는다 (부록 A-3)', () => {
    const rawRe = /raw|freeze|동결건조|생식|에어드라이|air[- ]?dried/i;
    for (const [name, r] of all) {
      for (const t of r.top) {
        if (rawRe.test(`${t.food.form ?? ''} ${t.food.product_name}`)) {
          expect(t.reasons.some((x) => x.label.includes('H5N1')), `${name}: ${t.food.product_name}`).toBe(true);
        }
      }
    }
  });
});
