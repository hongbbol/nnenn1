# foods 공개 읽기 차단 — 적용 순서 (2026-10-27)

PR: https://github.com/hongbbol/nnenn1/pull/101

## 왜 하는가
anon 키(사이트에 포함됨)로 `foods` 테이블 전체를 한 번에 내려받을 수 있었다.
PR 배포 + 아래 SQL 적용으로 서버만 읽을 수 있게 바꾼다.

## 순서 (세 단계, 모두 합쳐 5분)

### 1. PR 머지 → Vercel 배포 완료 기다리기
Vercel 대시보드에서 `wangrut` 프로젝트의 최신 배포가 **Ready**가 되면 2번으로.

### 2. Supabase 대시보드 → SQL Editor 에 아래를 붙여넣고 Run
```sql
drop policy if exists "foods_public_read" on public.foods;
revoke select on table public.foods from anon, authenticated;
```
(파일: `supabase/migrations/20261027000001_foods_drop_public_read.sql`)

### 3. 끝났다고 알려주기
Claude가 두 가지를 확인한다.
- anon 키로 foods 읽기 → 거부(401/403)되는지
- 실제 사이트 게스트 추천이 여전히 실브랜드(로얄캐닌·힐스 등)로 나오는지
  → 시드 샘플 사료만 나오면 Vercel에 `SUPABASE_SERVICE_ROLE_KEY`가 없는 것.
    Vercel → 프로젝트 → Settings → Environment Variables 에 추가 후 Redeploy.

## 순서가 바뀌어도 사이트가 죽지는 않는다
코드에 폴백을 넣어 두어, SQL을 먼저 실행해도 추천이 "샘플 사료"로 잠시 떨어질 뿐 오류 화면은 나지 않는다.
그래도 1 → 2 순서가 깔끔하다.
