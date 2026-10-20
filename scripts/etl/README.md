# foods ETL (nnenn2 → Supabase)

GH 이슈 #16 트랙 B. nnenn2 리서치 데이터를 nnenn1 `public.foods` 테이블로 평탄화 업로드한다.

## 단계

1. **빌드** — xlsx 파싱 → 매핑 → 리뷰 가능한 JSON 생성
   ```bash
   python3 scripts/etl/build_foods_json.py [XLSX_PATH]
   # 기본 XLSX_PATH = ~/Desktop/nnenn2/cat_food_research.xlsx
   # 산출물: scripts/etl/foods.seed.json (git 추적, PR에서 데이터 리뷰)
   ```
   - 정규화 시트(`03_Lines`/`04_SKUs`/`05_Ingredients`/`06_Nutrition`/`07_FeedingGuide`)를
     SKU 1행 = `foods` 1행으로 평탄화.
   - 의존성: `openpyxl` (`pip install openpyxl`).

2. **업서트** — JSON → Supabase (멱등)
   ```bash
   node scripts/etl/seed-foods.mjs
   # env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env.local 자동 로드)
   ```
   - `source_sku_id`(UNIQUE) 기준 onConflict 업서트 → 재실행해도 행 수 불변.
   - `public.foods` 테이블이 먼저 존재해야 함 (`supabase/migrations/20260607000001_foods.sql`).

## 매핑 규칙 (요약)

- `category`(2026-07-20 로얄캐닌 34건 오분류 사고 후 재설계): 우선순위 ① 대용유
  문구(milk replacer/캣밀크/분유 등) → 습식 ② `moisture_pct` 있으면 확정(>50 습식/이하 건식)
  ③ 이름·form 키워드 — **영문은 단어 경계 매칭**('can'⊂'Canin/Canyon' 오탐 방지),
  혼합 form('dry/wet')은 판별 제외, '캔보' 브랜드 가드, 냉동 생식은 습식.
  form은 `04_SKUs.form`(SKU 단위, 있으면 최우선) → `03_Lines.form` 순.
- **빌드 가드(2026-07-20 신설)**: ① `derive_category` 회귀 셀프테스트(실사고 케이스,
  버그 수정 시마다 추가) ② 카테고리↔수분/kcal 불변식 감사 — 위반 시 시드 미생성·빌드 실패
  (정당한 예외는 `AUDIT_ALLOWLIST`에 사유와 함께 등록) ③ 기존 시드 대비 diff 요약 출력 —
  **신규 브랜드 배치에서 기존 SKU category 변경이 보이면 커밋 전 반드시 규명**.
- **제조원 차단 게이트(2026-10-07 신설)**: `manufacturer_blocklist.json`(정본)에 등록된 제조원(이레본·하이원·마미닥터)·
  공장 주소·차단 브랜드가 브랜드/상품명/모회사·수입원/manufacturer_claims/notes에 걸리면 **빌드 실패**
  (kr_available과 무관). 매처·셀프테스트 = `manufacturer_blocklist.py`, 같은 규칙의 vitest =
  `src/lib/recommendation/manufacturer-blocklist.test.ts`. nnenn2 `research_helpers`도 이 파일로 수집 단계에서 거부한다.
- **중국 제조 추천 제외(2026-10-20 신설)**: nnenn2 `04_SKUs.made_in_country`(제조국, `set_sku_origin`으로만 기록)가
  '중국'이면 `china_made`, 제조국 미확인인데 브랜드 본사(`02_Brands.hq_country`)가 China면 `china_hq_presumed`로
  판정 → **`active=false` + `exclusion_reason`**. 공개 RLS·`queries.ts`·`filter.ts`가 active만 다뤄 일반 사용자에게
  안 보이고, 관리자는 Supabase 대시보드(`exclusion_reason`)와 빌드 때마다 재생성되는
  **`scripts/etl/exclusion_report.md`**(제외 목록·근거·브랜드별 제조국 확인 현황)로 본다.
  컬럼은 `supabase/apply_foods_made_in.sql`을 대시보드에서 먼저 적용해야 업서트가 된다.
  테스트 = `src/lib/recommendation/made-in-exclusion.test.ts`.
- `food_role`: completeness → 주식(Complete) / 보조식(Supplemental·Complementary) / 간식(Treat).
- `age_fit`: life_stage → nnenn1 버킷(1+/7+/11+/15+). 키튼은 `[]` + `키튼` 태그로 보존.
- `condition_fit`: 처방식만, **SKU 이름+life_stage**로 한정 매핑(Line.positioning은 라인 전체 범위라 미사용).
- 처방식 판정(`derive_is_therapeutic`)은 **부정문을 제외**한다(2026-07-26 신설). `positioning`의
  "요로 배려 기능식(처방식 아님)"(L1013 자나벨레 케어) 같은 OTC 기능식이 단순 '처방' 부분문자열
  매칭으로 수의사 처방식이 되어 `condition_fit`+'처방식' 태그가 붙던 버그 — 시트 데이터는 정확했고
  파생 로직만 틀렸으므로 **데이터 검증 게이트로는 잡히지 않는다**. 회귀 셀프테스트
  (`_THERAPEUTIC_SELFTEST_CASES`) + 빌드 diff의 '처방식 판정 변경' 항목으로 감시.
- `ingredient_keywords`: `INGREDIENT_SYNONYMS` 정규화. 곡물은 명시 토큰만(한글 '밀'=meal 음역 오탐 방지).
- **첨가물·원료 플래그(2026-10-20 신설, `derive_additive_flags`)**: 05_Ingredients 원료명을 규칙 레지스트리
  부록 A·§3-G 정규식으로 걸러 엔진(`rules.ts KEYWORDS`) 토큰을 `ingredient_keywords`에 추가한다 —
  `inorganic_phosphate`(Tier1, 칼슘염·아스코빌폴리인산 제외) · `calcium_phosphate`(Tier2, 표시용) · `acidifier`
  (염화암모늄·DL-메티오닌·인산, 킬레이트/셀레노메티오닌 제외) · `vitamin_c` · `cranberry` · `added_sugar`
  (사탕무 펄프·사탕수수 섬유 제외) · `propylene_glycol` · `allium` · `xylitol` · `carrageenan` · `hydrolyzed`
  (**처방식**이면서 상위 5번째 이내 가수분해 단백 — 간·효모 다이제스트 제외; 일반 EU 습식의
  'hydrolysed animal proteins'는 기호성 원료라 토큰 없음). 이전엔 단백·곡물 동의어만 있어 CKD 인산염·
  옥살레이트 산성화제·당뇨 첨가당·독성 하드 게이트가 실데이터 0건이었다. 회귀 셀프테스트
  `_ADDITIVE_SELFTEST_CASES`(실데이터 표기 기반) — 오탐·미탐 발견 시 케이스 추가.
- `magnesium_pct`(소수 3자리)·`calcium_pct`(2026-10-20): 06_Nutrition as-fed(+DM 환산). 요로 Mg 보조 레버·CKD Ca:P.
  컬럼은 `supabase/apply_foods_mg_ca.sql`을 대시보드에서 먼저 적용해야 업서트된다.
- `condition_fit` 규칙 변경(2026-10-20 사용자 확정): 췌장염은 **'pancrea/췌장' 명시 제품만**('low fat/저지방/hepatic' 제거 —
  규칙 레지스트리 §3-H: 고양이는 지방 제한 근거 없음) · 가수분해·하이포알러제닉·z/d 처방식은 **IBD** 묶음에 추가
  (온보딩에 알러지 옵션이 없어 IBD로 수용).
- DM(건물기준)만 있는 건식은 수분 8% 가정으로 as-fed 환산 → `영양추정(DM환산)` 태그.
- `kr_available`: `02_Brands.kr_distributed=Yes` **AND** `03_Lines.kr_line_available=Yes`만 true
  (엔진 하드 게이트 — 한국 미유통 제외). 브랜드 Yes인데 라인 미확정(Unknown/공란)은 경고 출력 + false 처리.
- 미네랄·지방산 레버(2026-06-24 추가): `sodium_pct`/`potassium_pct`/`chloride_pct`/`taurine_pct`/`epa_dha_pct`
  — nnenn2 06_Nutrition as-fed(+건식 DM 환산 fallback). `epa_dha_pct` 없고 EPA·DHA 개별값 둘 다 있으면 합산.
- 데이터 부재 필드(`price_per_kg_krw`/`image_url`/`affiliate_links`)는 `null`.
