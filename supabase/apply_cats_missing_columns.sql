-- ============================================================================
-- 원격 cats 테이블 누락 컬럼 보정
-- ----------------------------------------------------------------------------
-- 증상: 온보딩 저장 시 "Could not find the 'birth_day' column of 'cats'".
-- 원인: 원격 cats가 옛 스키마로 생성돼 birth_month/birth_day 및 GENERATED 컬럼
--       age_group/age_label 이 누락됨.
-- 용도: Supabase 대시보드 > SQL Editor에 붙여넣고 Run. 멱등(여러 번 실행 가능).
-- ============================================================================

-- 출생 월/일 (온보딩 기본정보에서 수집)
alter table public.cats
  add column if not exists birth_month smallint
    check (birth_month between 1 and 12),
  add column if not exists birth_day smallint
    check (birth_day between 1 and 31);

-- 나이 그룹/라벨 (birth_year로 자동 계산되는 GENERATED 컬럼)
alter table public.cats
  add column if not exists age_group text generated always as (
    case
      when (extract(year from now()) - birth_year) >= 15 then '15+'
      when (extract(year from now()) - birth_year) >= 11 then '11+'
      when (extract(year from now()) - birth_year) >= 7  then '7+'
      else '1+'
    end
  ) stored;

alter table public.cats
  add column if not exists age_label text generated always as (
    case
      when (extract(year from now()) - birth_year) >= 15 then '초고령'
      when (extract(year from now()) - birth_year) >= 11 then '고령'
      when (extract(year from now()) - birth_year) >= 7  then '중년'
      else '성묘'
    end
  ) stored;

-- PostgREST 스키마 캐시 즉시 갱신(컬럼 추가 후 'schema cache' 오류 방지)
notify pgrst, 'reload schema';

-- ─── 확인(선택) ──────────────────────────────────────────────
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'cats'
  and column_name in ('birth_month', 'birth_day', 'age_group', 'age_label')
order by column_name;
