#!/usr/bin/env node
/**
 * foods.seed.json → Supabase `public.foods` 멱등 업서트.
 *
 * - source_sku_id(UNIQUE) 기준 onConflict 업서트 → 재실행해도 행 수 불변.
 * - service_role 키 사용(RLS 우회). 절대 클라이언트에 노출 금지.
 *
 * 사용법:
 *   node scripts/etl/seed-foods.mjs
 * 환경변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   (없으면 가까운 .env.local을 자동 탐색해 로드)
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env.local 자동 탐색 (스크립트 위치에서 상위로 올라가며) — process.env 우선
function loadEnvLocal() {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const p = join(dir, '.env.local');
    if (existsSync(p)) {
      for (const line of readFileSync(p, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && process.env[m[1]] === undefined) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        }
      }
      return p;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const envPath = loadEnvLocal();
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.' +
    (envPath ? ` (.env.local: ${envPath})` : ' (.env.local 못 찾음)'));
  process.exit(1);
}

const rows = JSON.parse(readFileSync(join(__dirname, 'foods.seed.json'), 'utf8'));
const supabase = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CHUNK = 100;
let upserted = 0;
for (let i = 0; i < rows.length; i += CHUNK) {
  const batch = rows.slice(i, i + CHUNK);
  const { data, error } = await supabase
    .from('foods')
    .upsert(batch, { onConflict: 'source_sku_id', ignoreDuplicates: false })
    .select('id');
  if (error) {
    console.error('❌ upsert 실패:', error.message);
    process.exit(1);
  }
  upserted += data.length;
}

const { count, error: cErr } = await supabase
  .from('foods')
  .select('*', { count: 'exact', head: true });
if (cErr) {
  console.error('⚠️ 카운트 조회 실패:', cErr.message);
}

console.log(`✅ upsert 완료: ${upserted}건 처리, 테이블 총 ${count ?? '?'}행`);
