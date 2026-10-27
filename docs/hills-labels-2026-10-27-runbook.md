# 힐스 라벨 정리 3건 — 적용 순서 (2026-10-27)

nnenn2 커밋: `data(hills): 라벨 정리 3건` · nnenn1 PR: 아래 링크 참고

## 바뀌는 것 (사용자 화면)
| SKU | 전 | 후 |
|---|---|---|
| S1425 | 힐스 프리스크립션 다이어트 GI바이옴 치킨&채소 스튜 반려묘용 **건사료** | GI바이옴 치킨&채소 스튜 반려묘용 **습식사료** (KR 공식 h1 그대로) |
| S1434 | k/d 반려묘용 건식사료(오션피쉬) — S1433과 **두 번** 노출 | 숨김(`active=false`, `exclusion_reason=duplicate_listing`) — S1433만 노출 |
| S2039 | c/d 멀티케어 반려묘용 건사료(치킨) — KR 공식 보리 포뮬러 (통옥수수 포뮬러는 S0007) | c/d 멀티케어 반려묘용 건사료(치킨, **보리 포뮬러**) |
| S0007 | 처방식 c/d 멀티케어 치킨 드라이 | 처방식 c/d 멀티케어 치킨 드라이(**통옥수수 포뮬러**) |

## 순서 (세 단계)

### 1. Supabase 대시보드 → SQL Editor 에 아래를 붙여넣고 Run
`duplicate_listing` 값을 허용하도록 check 제약을 넓힌다. **업서트보다 먼저** 해야 S1434 행이 거부되지 않는다.
```sql
alter table public.foods drop constraint if exists foods_exclusion_reason_check;
alter table public.foods
  add constraint foods_exclusion_reason_check
  check (exclusion_reason is null
         or exclusion_reason in ('china_made', 'china_hq_presumed', 'duplicate_listing'));
```
(파일: `supabase/migrations/20261027000002_foods_exclusion_reason_duplicate.sql`)

### 2. PR 머지
시드 JSON(`scripts/etl/foods.seed.json`)과 ETL 규칙이 main에 들어간다. 화면 코드는 바뀌지 않으므로 배포를 기다릴 필요는 없다.

### 3. 업서트 (Claude가 실행, 사장님 "해줘" 한마디면 됨)
```bash
node scripts/etl/seed-foods.mjs
```
그 뒤 Claude가 확인: 크롬에서 "힐스" 검색 → k/d 오션피쉬 1개만, GI바이옴 스튜가 습식사료로, c/d 두 포뮬러가 구분되어 보이는지.

## 참고
- 로컬 `vitest`의 `made-in-exclusion.test.ts` 원격 DB 검사는 **3번 업서트 전까지 실패하는 게 정상**이다(S1434가 아직 active). CI에는 DB 키가 없어 skip.
- 순서를 거꾸로(업서트 먼저) 하면 S1434 한 행만 check 위반으로 실패하고 나머지는 들어간다 — 그래도 1번 뒤 다시 실행하면 된다.
