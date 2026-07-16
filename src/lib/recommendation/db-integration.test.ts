/**
 * DB 통합 검증 — 원격 Supabase foods(nnenn2 ETL 1333 SKU)로 실제 추천이 도는지 (2026-06-24).
 *
 * 프로덕션 경로(getRecommendationFoods → recommendFromProfile)와 동일한 fetch+매핑을
 * 재현한다(queries.ts는 'server-only'라 테스트에서 직접 import 불가 → 매핑 복제).
 * .env.local(원격 키)이 없거나 네트워크가 없으면 skip — CI 안전.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Food, GuestCat } from '@/lib/domain/types';
import { recommendFromProfile } from './engine';
import { SEED_FOODS } from './foods-data';

const ENV_PATH = join(__dirname, '../../../.env.local');
const hasEnv = existsSync(ENV_PATH);

function loadEnv(): Record<string, string> {
  return Object.fromEntries(
    readFileSync(ENV_PATH, 'utf8')
      .split('\n')
      .filter((l) => l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  );
}

/** queries.ts getRecommendationFoods와 동일한 매핑(서버 전용 모듈이라 복제). */
async function fetchFoods(): Promise<Food[]> {
  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const PAGE = 1000;
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('foods')
      .select('*')
      .eq('active', true)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    rows.push(...(data as Record<string, unknown>[]));
    if (data.length < PAGE) break;
  }
  return rows.map((r) => ({
    id: r.id as string,
    brand: (r.brand as string) ?? '',
    product_name: (r.product_name as string) ?? '',
    category: (r.category as Food['category']) ?? '건식',
    age_fit: (r.age_fit as Food['age_fit']) ?? [],
    condition_fit: (r.condition_fit as string[]) ?? [],
    protein_pct: (r.protein_pct as number | null) ?? null,
    fat_pct: (r.fat_pct as number | null) ?? null,
    fiber_pct: (r.fiber_pct as number | null) ?? null,
    ash_pct: (r.ash_pct as number | null) ?? null,
    moisture_pct: (r.moisture_pct as number | null) ?? null,
    phosphorus_pct: (r.phosphorus_pct as number | null) ?? null,
    sodium_pct: (r.sodium_pct as number | null) ?? null,
    potassium_pct: (r.potassium_pct as number | null) ?? null,
    chloride_pct: (r.chloride_pct as number | null) ?? null,
    taurine_pct: (r.taurine_pct as number | null) ?? null,
    epa_dha_pct: (r.epa_dha_pct as number | null) ?? null,
    omega3_pct: (r.omega3_pct as number | null) ?? null,
    kcal_per_100g: (r.kcal_per_100g as number | null) ?? null,
    ingredient_summary: (r.ingredient_summary as string | null) ?? null,
    ingredient_keywords: (r.ingredient_keywords as string[]) ?? [],
    form: (r.form as string | null) ?? null,
    rec_daily_g: (r.rec_daily_g as number | null) ?? null,
    tags: (r.tags as string[]) ?? [],
    image_url: (r.image_url as string | null) ?? null,
    affiliate_links: (r.affiliate_links as Record<string, string> | null) ?? null,
    price_per_kg_krw: (r.price_per_kg_krw as number | null) ?? null,
    active: (r.active as boolean) ?? true,
    kr_available: (r.kr_available as boolean | undefined) ?? true,
  }));
}

const THIS_YEAR = new Date().getFullYear();
function cat(over: Partial<GuestCat>): GuestCat {
  return {
    name: '테스트냥',
    birth_year: THIS_YEAR - 5,
    weight_kg: 4.2,
    neutered_status: '완료',
    diet_type: '건식',
    health_conditions: [],
    avoid_ingredients: [],
    goal: '질환관리',
    ...over,
  };
}

const SEED_IDS = new Set(SEED_FOODS.map((f) => f.id));

describe.skipIf(!hasEnv)('원격 DB foods 통합 추천 (실데이터 1333 SKU)', () => {
  it('CKD 1-2기 노령묘 — 실브랜드 상위 추천 + 전원 한국 구매 가능', async () => {
    const foods = await fetchFoods();
    expect(foods.length).toBeGreaterThan(1300);

    const result = recommendFromProfile(
      cat({ birth_year: THIS_YEAR - 12, health_conditions: ['신부전 1-2기'] }),
      foods,
    );
    expect(result).not.toBeNull();
    expect(result!.primaryMode).toBe('ckd_12');
    expect(result!.top.length).toBeGreaterThan(0);
    for (const t of result!.top) {
      expect(SEED_IDS.has(t.food.id)).toBe(false); // 시드가 아닌 실데이터
      expect(t.food.kr_available).toBe(true); // KR 하드 게이트 통과분만
    }
    // 미유통 사료가 실제로 게이트에서 잘렸는지.
    expect(result!.excluded.some((e) => e.reasons.some((r) => r.code === 'kr_unavailable'))).toBe(
      true,
    );
    console.log(
      'CKD TOP:',
      result!.top.slice(0, 5).map((t) => `${t.food.brand} ${t.food.product_name}(${t.score})`),
    );
  }, 30_000);

  it('결석-스트루바이트 — 실브랜드 추천, 전원 KR 가능', async () => {
    const foods = await fetchFoods();
    const result = recommendFromProfile(
      cat({ health_conditions: ['결석-스트루바이트'] }),
      foods,
    );
    expect(result).not.toBeNull();
    expect(result!.top.length).toBeGreaterThan(0);
    result!.top.forEach((t) => expect(t.food.kr_available).toBe(true));
    console.log(
      '스트루바이트 TOP:',
      result!.top.slice(0, 5).map((t) => `${t.food.brand} ${t.food.product_name}(${t.score})`),
    );
  }, 30_000);

  it('건강 성묘(질환 없음) — 실브랜드 추천', async () => {
    const foods = await fetchFoods();
    const result = recommendFromProfile(cat({ goal: '중노령 전환' }), foods);
    expect(result).not.toBeNull();
    expect(result!.top.length).toBeGreaterThan(0);
    result!.top.forEach((t) => {
      expect(SEED_IDS.has(t.food.id)).toBe(false);
      expect(t.food.kr_available).toBe(true);
    });
    console.log(
      '건강성묘 TOP:',
      result!.top.slice(0, 5).map((t) => `${t.food.brand} ${t.food.product_name}(${t.score})`),
    );
  }, 30_000);
});
