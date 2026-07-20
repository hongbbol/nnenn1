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
- `food_role`: completeness → 주식(Complete) / 보조식(Supplemental·Complementary) / 간식(Treat).
- `age_fit`: life_stage → nnenn1 버킷(1+/7+/11+/15+). 키튼은 `[]` + `키튼` 태그로 보존.
- `condition_fit`: 처방식만, **SKU 이름+life_stage**로 한정 매핑(Line.positioning은 라인 전체 범위라 미사용).
- `ingredient_keywords`: `INGREDIENT_SYNONYMS` 정규화. 곡물은 명시 토큰만(한글 '밀'=meal 음역 오탐 방지).
- DM(건물기준)만 있는 건식은 수분 8% 가정으로 as-fed 환산 → `영양추정(DM환산)` 태그.
- `kr_available`: `02_Brands.kr_distributed=Yes` **AND** `03_Lines.kr_line_available=Yes`만 true
  (엔진 하드 게이트 — 한국 미유통 제외). 브랜드 Yes인데 라인 미확정(Unknown/공란)은 경고 출력 + false 처리.
- 미네랄·지방산 레버(2026-06-24 추가): `sodium_pct`/`potassium_pct`/`chloride_pct`/`taurine_pct`/`epa_dha_pct`
  — nnenn2 06_Nutrition as-fed(+건식 DM 환산 fallback). `epa_dha_pct` 없고 EPA·DHA 개별값 둘 다 있으면 합산.
- 데이터 부재 필드(`price_per_kg_krw`/`image_url`/`affiliate_links`)는 `null`.
