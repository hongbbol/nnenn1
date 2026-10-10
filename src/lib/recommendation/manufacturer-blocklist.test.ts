/**
 * 제조원 차단 레지스트리(ㅂㄷㅁㅌ) 게이트 — 차단 제조원·브랜드 사료가 추천에 나오지 않음을 보장한다.
 *
 * 정본 = scripts/etl/manufacturer_blocklist.json (ETL build_foods_json.py도 같은 파일로 빌드를 막는다).
 * 매칭 규칙은 scripts/etl/manufacturer_blocklist.py와 같다:
 *   브랜드명 = 정규화 완전 일치(러시아 'Sirius' ≠ 'Sirius Will') · 상품명 = 4글자 이상 한글 브랜드명 부분 일치
 *   + 제조사 별칭·사업자번호·공장 주소 키워드 부분 일치.
 * 원격 DB 검사는 .env.local이 없으면 skip — CI 안전.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Food, GuestCat } from '@/lib/domain/types';
import { recommendFromProfile } from './engine';
import { SEED_FOODS } from './foods-data';

const ROOT = join(__dirname, '../../..');
const REGISTRY = JSON.parse(
  readFileSync(join(ROOT, 'scripts/etl/manufacturer_blocklist.json'), 'utf8'),
) as {
  manufacturers: { name: string; aliases: string[]; biz_no: string }[];
  address_keywords: string[];
  brands: { en: string[]; ko: string[] }[];
};

const norm = (s: unknown) =>
  String(s ?? '')
    .replace(/[\s\-_.'’·,()/&]+/g, '')
    .toLowerCase();

const BRAND_EXACT = new Set(REGISTRY.brands.flatMap((b) => [...b.en, ...b.ko]).map(norm));
const BRAND_SUB = REGISTRY.brands
  .flatMap((b) => b.ko)
  .map(norm)
  .filter((k) => k.length >= 4);
const MFR_KEYS = [
  ...REGISTRY.manufacturers.flatMap((m) => [...m.aliases, m.biz_no]),
  ...REGISTRY.address_keywords,
]
  .map(norm)
  .filter(Boolean);

/** 차단 사유(없으면 null). */
function blockedReason(brand: string, productName: string): string | null {
  if (BRAND_EXACT.has(norm(brand))) return `차단 브랜드 '${brand}'`;
  const np = norm(productName);
  const sub = BRAND_SUB.find((k) => np.includes(k));
  if (sub) return `상품명에 차단 브랜드 — ${productName}`;
  const mk = MFR_KEYS.find((k) => np.includes(k));
  if (mk) return `상품명에 차단 제조원 — ${productName}`;
  return null;
}

interface SeedRow extends Omit<Food, 'id'> {
  source_sku_id: string;
}
const SEED: SeedRow[] = JSON.parse(
  readFileSync(join(ROOT, 'scripts/etl/foods.seed.json'), 'utf8'),
);
const SEED_AS_FOODS = SEED.map((r) => ({ ...r, id: r.source_sku_id }) as unknown as Food);

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

describe('제조원 차단 레지스트리 — 매처', () => {
  it('브랜드명은 완전 일치만 차단한다(러시아 Sirius 오탐 방지)', () => {
    expect(blockedReason('Sirius', 'Sirius Adult Cat')).toBeNull();
    expect(blockedReason('Sirius Will', '')).not.toBeNull();
    expect(blockedReason('Natural Core', '')).not.toBeNull();
    expect(blockedReason('네츄럴코어', '')).not.toBeNull();
  });

  it('상품명의 긴 한글 브랜드명·제조원 키워드를 잡는다', () => {
    expect(blockedReason('X', '이레본 보노네이처 캣 연어 6kg')).not.toBeNull();
    expect(blockedReason('X', '㈜하이원 아임베키 라이트')).not.toBeNull();
    expect(blockedReason('Royal Canin', '로얄캐닌 인도어 4kg')).toBeNull();
    expect(blockedReason('Amiore', '아미오레 캣 연어')).toBeNull(); // 3글자 '아미오'는 상품명 부분 일치 안 함
  });
});

describe('제조원 차단 레지스트리 — 데이터·추천 게이트', () => {
  it('ETL 시드(foods.seed.json)에 차단 대상 0건', () => {
    const hits = SEED.map((r) => [r.source_sku_id, blockedReason(r.brand, r.product_name)])
      .filter(([, why]) => why);
    expect(hits).toEqual([]);
  });

  it('앱 내장 SEED_FOODS에 차단 대상 0건', () => {
    const hits = SEED_FOODS.filter((f) => blockedReason(f.brand, f.product_name));
    expect(hits).toEqual([]);
  });

  it('여러 프로필 추천 결과 TOP에 차단 대상 0건', () => {
    const profiles: GuestCat[] = [
      cat(),
      cat({ birth_year: THIS_YEAR - 12, health_conditions: ['신부전 1-2기'] }),
      cat({ health_conditions: ['결석-스트루바이트'] }),
      cat({ diet_type: '습식' }),
      cat({ birth_year: THIS_YEAR - 14 }),
    ];
    let checked = 0;
    for (const p of profiles) {
      const r = recommendFromProfile(p, SEED_AS_FOODS);
      if (!r) continue;
      for (const t of r.top) {
        expect(blockedReason(t.food.brand, t.food.product_name)).toBeNull();
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

const ENV_PATH = join(ROOT, '.env.local');
describe.skipIf(!existsSync(ENV_PATH))('제조원 차단 레지스트리 — 원격 DB foods', () => {
  it('active foods에 차단 대상 0건', async () => {
    const env = Object.fromEntries(
      readFileSync(ENV_PATH, 'utf8')
        .split('\n')
        .filter((l) => l.includes('='))
        .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
    );
    const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const rows: { source_sku_id: string; brand: string; product_name: string }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb
        .from('foods')
        .select('source_sku_id,brand,product_name')
        .eq('active', true)
        .order('id', { ascending: true })
        .range(from, from + 999);
      if (error || !data) return; // 네트워크/일시정지(504 등) — 시드 검사가 정본
      rows.push(...data);
      if (data.length < 1000) break;
    }
    const hits = rows.filter((r) => blockedReason(r.brand, r.product_name));
    expect(hits).toEqual([]);
  }, 30_000);
});
