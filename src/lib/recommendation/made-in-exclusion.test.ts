/**
 * 중국 제조 추천 제외 게이트(2026-10-20 사용자 결정) — ETL이 판정한 제외 SKU가 추천에 나오지 않음을 보장한다.
 *
 * 판정 = scripts/etl/build_foods_json.py derive_exclusion:
 *   china_made        = made_in_country '중국'
 *   china_hq_presumed = 제조국 미확인 + 브랜드 본사 China
 * 제외 행은 active=false(RLS·queries.ts·filter.ts 3중 차단) + exclusion_reason(관리자용).
 * 관리자 리포트 = scripts/etl/exclusion_report.md. 원격 DB 검사는 .env.local이 없으면 skip.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Food, GuestCat } from '@/lib/domain/types';
import { recommendFromProfile } from './engine';

const ROOT = join(__dirname, '../../..');

interface SeedRow extends Omit<Food, 'id'> {
  source_sku_id: string;
  made_in_country: string | null;
  manufacturer: string | null;
  exclusion_reason: 'china_made' | 'china_hq_presumed' | null;
}
const SEED: SeedRow[] = JSON.parse(
  readFileSync(join(ROOT, 'scripts/etl/foods.seed.json'), 'utf8'),
);
const EXCLUDED = new Set(SEED.filter((r) => r.exclusion_reason).map((r) => r.source_sku_id));

const THIS_YEAR = new Date().getFullYear();
function cat(over: Partial<GuestCat> = {}): GuestCat {
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

describe('중국 제조 추천 제외 — 시드', () => {
  it('중국 제조 SKU는 모두 china_made로 제외된다', () => {
    const leak = SEED.filter((r) => r.made_in_country === '중국' && r.exclusion_reason !== 'china_made');
    expect(leak.map((r) => r.source_sku_id)).toEqual([]);
  });

  it('제외 사유가 있으면 active=false, 없으면 active=true', () => {
    const bad = SEED.filter((r) => Boolean(r.exclusion_reason) === r.active);
    expect(bad.map((r) => r.source_sku_id)).toEqual([]);
  });

  it('관리자 리포트가 제외 SKU를 빠짐없이 싣는다', () => {
    const report = readFileSync(join(ROOT, 'scripts/etl/exclusion_report.md'), 'utf8');
    const missing = [...EXCLUDED].filter((id) => !report.includes(`| ${id} |`));
    expect(missing).toEqual([]);
  });

  it('여러 프로필 추천 TOP에 제외 SKU 0건(시드 전체를 넣어도 엔진이 거른다)', () => {
    const foods = SEED.map((r) => ({ ...r, id: r.source_sku_id }) as unknown as Food);
    const profiles = [
      cat(),
      cat({ birth_year: THIS_YEAR - 12, health_conditions: ['신부전 1-2기'] }),
      cat({ health_conditions: ['결석-스트루바이트'] }),
      cat({ diet_type: '습식' }),
      cat({ birth_year: THIS_YEAR - 14 }),
    ];
    let checked = 0;
    for (const p of profiles) {
      const r = recommendFromProfile(p, foods);
      if (!r) continue;
      for (const t of r.top) {
        expect(EXCLUDED.has(t.food.id)).toBe(false);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

const ENV_PATH = join(ROOT, '.env.local');
describe.skipIf(!existsSync(ENV_PATH))('중국 제조 추천 제외 — 원격 DB foods', () => {
  it('공개 조회(active)에 제외 SKU 0건', async () => {
    const env = Object.fromEntries(
      readFileSync(ENV_PATH, 'utf8')
        .split('\n')
        .filter((l) => l.includes('='))
        .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
    );
    const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const ids: string[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb
        .from('foods')
        .select('source_sku_id')
        .eq('active', true)
        .order('id', { ascending: true })
        .range(from, from + 999);
      if (error || !data) return; // 네트워크/일시정지 — 시드 검사가 정본
      ids.push(...data.map((d) => d.source_sku_id as string));
      if (data.length < 1000) break;
    }
    // 마이그레이션·업서트 전(DB가 시드보다 뒤처진 상태)에는 실패해야 정상 — 업서트 누락을 드러낸다.
    expect(ids.filter((id) => EXCLUDED.has(id))).toEqual([]);
  }, 30_000);
});
