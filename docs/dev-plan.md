# 완그릇 — 개발 계획서 (v2)

> 작성일: 2026-05-28 (v1) / 개정: 2026-05-28 (v2 — 기획서·디자인 정합성 점검 결과 전면 반영)
> 기반 자료: `docs/plan.md`, `docs/design/*`, 인터뷰 4라운드 결과, v1 점검 보고서
> 산출물 성격: **6~8주 MVP** 출시를 목표로 한 실행 계획. v1 대비 변경 요약은 부록 B 참조.

---

## 0. v1 → v2 주요 변경 (변경 요약)

| 영역 | v1 | v2 |
|---|---|---|
| 일정 | 4~6주 | **6~8주** (사진 업로드·시드·수의사 자문 일정 반영) |
| 폰트 | Noto Sans KR | **Pretendard** (디자인 코드 기준) |
| 중성화 | boolean | **'완료/안 함/몰라요' enum** |
| 게스트 RLS | 모두 select 가능 (보안 결함) | **게스트 추천은 서버 라우트 전용** |
| 사진 | 미고려 | **MVP에 hero 1장**, 6장 갤러리는 Phase 2 |
| 위저드 UX | stepped 가정 | **stepped 채택**, 나머지 2개 Phase 2 |
| 비교 요약문 | 미명시 | **템플릿 기반** (LLM은 Phase 2) |
| 영양소 importance | 정적 | **MVP 정적, Phase 2 동적** |
| 데모 모드 | 미반영 | **랜딩 "예시 결과 먼저 보기"** 추가 |
| 추천 우선순위 박스 | 미명시 | **컴포넌트 명시** |
| 월 비용 비교 | 미명시 | **MVP 포함** |
| 푸터 "광고·제휴 표기" | 미명시 | **별도 페이지** 추가 |
| Tailwind | 4 | **3.4로 다운그레이드** (안정성) |
| 신규 섹션 10 | — | **개발 리스크 & 완화 전략** |

---

## 1. 프로덕트 요약 & 범위

### 1.1 한 줄 정의
중·노령·질환 고양이 보호자가 내 아이 조건에 맞는 사료를 **이유와 함께** 추천받고, 현재 사료와 비교해 전환 판단까지 돕는 웹 서비스.

### 1.2 핵심 가치 가설
1. 보호자는 "내 아이에게 맞는지"를 판단하는 데 정보가 너무 흩어져 있어 어려움을 겪는다.
2. 정량 비교(영양소·비용)와 정성 설명(왜 적합한지)이 한 화면에 있으면 전환 결정의 마찰이 크게 줄어든다.
3. 결정한 결과를 저장·재방문할 수 있으면 보호자는 단발성 사용이 아닌 지속 사용자가 된다.

### 1.3 MVP 범위 (6~8주)
| 포함 | 제외 (Phase 2 후보) |
|---|---|
| 고양이 프로필 입력 (**단계별 위저드 4단계**) | 위저드 one-page / chat 변형 |
| 고양이 hero 사진 1장 업로드 | 6장 갤러리, 사진 편집 |
| 규칙 기반 사료 추천 TOP 2 | 다묘 가구 |
| 추천 우선순위 시각화 박스 | 추천 결과 변경 통지 UX |
| LLM 동적 설명 생성 (Claude Haiku) | LLM 기반 비교 요약문 |
| 현재 사료 vs 추천 사료 비교표 (정적 importance) | 동적 importance |
| 월 예상 비용 비교 | 정기 배송·결제 |
| 자연어 비교 요약 (템플릿) | — |
| 전환 가이드 (디자인 코드의 transition_plan 그대로) | — |
| 추천·비교·저장 이력 (로그인 시) | 사료 리뷰·평점 |
| 게스트 추천 + 데모 모드 ("예시 결과 먼저 보기") | — |
| Google + Kakao OAuth | 이메일·SMS 가입 |
| 제휴 링크 클릭 트래킹 + 카드 단위 광고 표기 | 제휴 수익 대시보드 |
| 약관·개인정보·**광고/제휴 표기**·면책 페이지 | — |
| 어드민은 Supabase Studio 직접 사용 | 어드민 UI |
| 한국어 단일 | 다국어 |

### 1.4 비목표(Non-goals)
- **의료 행위 대체**: 모든 화면에 "수의사 진료를 대체하지 않습니다" 고지 의무화
- **포괄적 사료 DB**: 초기 20~30개 큐레이션 셋이 목표. 망라가 아닌 신뢰 우선.
- **즉각적 결정 강요**: 추천 결과는 보조 정보. 사용자 페이스 존중.

---

## 2. 화면 플로우 & 정보 구조

### 2.1 라우트 맵 (Next.js App Router)
```
/                       # 랜딩 (게스트 가능, "예시 결과 먼저 보기" CTA 포함)
/demo                   # 데모 모드 진입점 — 미리 채워진 프로필로 /recommendations 점프
/onboarding             # 프로필 입력 위저드 (게스트 가능)
  /onboarding/basics    #   step 1 — 이름/사진/출생년도/체중/중성화
  /onboarding/diet      #   step 2 — 식단·현재 사료·피하는 성분
  /onboarding/health    #   step 3 — 건강 상태 (질환 세분화, exclusive/group 로직)
  /onboarding/goal      #   step 4 — 목표
/recommendations        # 추천 결과 — 추천 우선순위 박스 + TOP 2 카드 (게스트 가능)
/compare                # 현재 사료 vs 추천 사료 비교 + 월 비용 (게스트 가능, 저장은 로그인)
/saved                  # 저장 목록 (로그인 필수)
/cat                    # 내 아이 프로필 보기/수정 (로그인 필수, 비로그인 시 게스트 프로필 표시)
/auth/sign-in           # 로그인 (Google/Kakao)
/auth/callback          # OAuth 콜백
/legal/terms            # 이용약관
/legal/privacy          # 개인정보처리방침
/legal/affiliate        # 광고·제휴 표기 (신규)
/legal/medical-disclaimer  # 의료 면책 (신규)

# API Routes (Edge Runtime + SSE)
/api/recommendations    # 추천 엔진 호출
/api/explanations       # LLM 설명 스트리밍 (SSE)
/api/click/[productId]  # 제휴 링크 클릭 트래킹 → 리다이렉트
/api/upload/cat-photo   # 사진 업로드 (Supabase Storage signed URL 발급)
```

### 2.2 게스트 ↔ 로그인 전환
- **게스트 데이터 유지**: 프로필·추천 결과·hero 사진(임시 URL 또는 base64)을 `localStorage`에 임시 저장
- **로그인 트리거**: 저장/비교 이력 버튼 클릭 시 모달 ("로그인하시면 이력이 계속 기억돼요")
- **로그인 직후 마이그레이션**: 콜백 핸들러에서 `localStorage`의 게스트 프로필을 서버 upsert, 사진은 Storage로 업로드 후 클리어
- **데모 모드**: `localStorage`에 `wg.demo=true` 마킹 → 추천 결과 페이지에 "예시 데이터입니다" 배지

### 2.3 위저드 UX 결정
- **채택: 단계별(stepped)** — 디자인 코드의 `ProfileSteppedScreen` 그대로
- **사유**: 모바일 친화, 한 화면당 인지 부담 적음, 검증·복원 단순. one-page/chat은 코드는 있으나 MVP 출시 후 사용성 평가 후 도입 검토 (Phase 2).
- **3단계 vs 4단계 카피**: 4단계로 통일. 랜딩 카피 "세 단계만"은 "**네 단계만** 거치면" 또는 "**프로필 → 추천 → 비교**" 식 라이프사이클 3단계로 변경 (UX writer 결정 필요, 오픈 이슈 11.5).

### 2.4 단계별 위저드 디테일
- 슬라이드 전환 (디자인 컨셉)
- 상단 stepper 1/4 ~ 4/4
- Enter 키로 다음 step
- `canProceed` 함수로 step 단위 검증 (디자인 코드 로직 그대로)
- step 단위 자동 임시 저장 (`localStorage` 또는 로그인 시 DB upsert)
- **step 1 (basics)에 hero 사진 업로드 슬롯 추가** (선택, 건너뛰기 가능)

---

## 3. 도메인 모델 (Supabase 스키마)

### 3.1 ER 다이어그램 (논리)
```
auth.users (Supabase Auth)
   │ 1
   ▼ N
public.profiles ──┐
                  │
public.cats ──────┤── (1) hero_image_path → storage.objects (bucket: cat-photos)
   │              │
   ▼ N            │
public.recommendations
   │
   │ (refs)
   ▼
public.foods (admin via Supabase Studio)
```

### 3.2 테이블 정의

#### `public.profiles` — 사용자 메타데이터
```sql
create table public.profiles (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  display_name         text,
  marketing_opt_in     boolean default false,
  privacy_consent_at   timestamptz,
  terms_consent_at     timestamptz,
  birth_year           smallint,  -- 만 14세 미만 차단용
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);
```

#### `public.cats` — 고양이 프로필
```sql
create table public.cats (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id) on delete cascade,
  name               text not null,
  birth_year         smallint not null check (birth_year between 2000 and extract(year from now())),
  age_group          text generated always as (
    case
      when (extract(year from now()) - birth_year) >= 15 then '15+'
      when (extract(year from now()) - birth_year) >= 11 then '11+'
      when (extract(year from now()) - birth_year) >= 7  then '7+'
      else '1+'
    end
  ) stored,
  age_label          text generated always as (
    case
      when (extract(year from now()) - birth_year) >= 15 then '초고령'
      when (extract(year from now()) - birth_year) >= 11 then '고령'
      when (extract(year from now()) - birth_year) >= 7  then '중년'
      else '성묘'
    end
  ) stored,
  weight_kg          numeric(3,1) not null check (weight_kg between 0.5 and 15),
  neutered_status    text not null check (neutered_status in ('완료','안 함','몰라요')),
  diet_type          text not null check (diet_type in ('건식', '습식', '혼합')),
  current_food_id    uuid references public.foods(id),  -- nullable, DB에 없으면 NULL
  current_food_text  text,  -- DB에 없는 사료 자유 입력 fallback (current_food_id가 NULL일 때만 사용)
  health_conditions  text[] not null default '{}',
  avoid_ingredients  text[] not null default '{}',
  goal               text not null check (goal in ('질환관리','중노령 전환','체중관리 - 감량','체중관리 - 증량')),
  hero_image_path    text,  -- Supabase Storage 경로 (bucket: cat-photos)
  last_recommended_at timestamptz,  -- "마지막 분석 YYYY.MM" 표시용
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  -- 비즈니스 규칙은 트리거로 (3.4)
  constraint cats_current_food_either check (
    (current_food_id is not null and current_food_text is null) or
    (current_food_id is null) or
    (current_food_id is null and current_food_text is not null)
  )
);

create index cats_user_id_idx on public.cats(user_id);
```
> MVP는 1유저 = 1고양이 원칙. 스키마는 1:N 유지 (Phase 2 다묘 대비).

#### `public.foods` — 사료 DB (Supabase Studio 관리)
```sql
create table public.foods (
  id                  uuid primary key default gen_random_uuid(),
  brand               text not null,
  product_name        text not null,
  category            text not null check (category in ('건식','습식')),
  age_fit             text[] not null,   -- ['1+','7+','11+','15+'] 부분집합
  condition_fit       text[] not null,   -- 3.3 enum 값들 (세분화)
  protein_pct         numeric(4,1),
  fat_pct             numeric(4,1),
  fiber_pct           numeric(4,1),
  ash_pct             numeric(4,1),
  moisture_pct        numeric(4,1),
  phosphorus_pct      numeric(4,2),
  sodium_pct          numeric(4,2),
  omega3_pct          numeric(4,2),
  kcal_per_100g       numeric(5,1),
  ingredient_summary  text,
  ingredient_keywords text[],  -- 정규화된 원료 키워드 ('닭','치킨','연어' 등) — avoid 매칭용
  form                text,
  rec_daily_g         smallint,
  tags                text[],
  image_url           text,
  affiliate_links     jsonb,   -- { coupang: "...", naver: "..." }
  price_per_kg_krw    integer, -- 월 비용 계산용
  active              boolean not null default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index foods_active_age_idx on public.foods(active, age_fit);
create index foods_conditions_idx on public.foods using gin(condition_fit);
create index foods_ingredients_idx on public.foods using gin(ingredient_keywords);
```

#### `public.recommendations` — 추천 로그
```sql
create table public.recommendations (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references auth.users(id) on delete set null,  -- 게스트는 null
  guest_token            text,           -- 게스트 추천 식별용 (서버에서만 사용, 클라이언트엔 노출 X)
  cat_snapshot           jsonb not null, -- 추천 시점의 프로필 (이력 유지)
  cat_id                 uuid references public.cats(id) on delete set null,
  recommended_food_ids   uuid[] not null,
  rule_scores            jsonb,          -- 규칙별 점수 breakdown
  llm_explanations       jsonb,          -- 사료별 설명 텍스트
  llm_model              text,           -- 'claude-haiku-4-5-...'
  llm_prompt_version     text,           -- 'v1.0'
  generated_at           timestamptz default now()
);

create index recommendations_user_id_idx on public.recommendations(user_id) where user_id is not null;
```

#### `public.saved_foods` — 사용자 저장
```sql
create table public.saved_foods (
  user_id    uuid references auth.users(id) on delete cascade,
  food_id    uuid references public.foods(id) on delete cascade,
  cat_id     uuid references public.cats(id) on delete cascade,
  note       text,
  saved_at   timestamptz default now(),
  primary key (user_id, food_id, cat_id)
);
```

#### `public.affiliate_clicks` — 제휴 링크 클릭 트래킹
```sql
create table public.affiliate_clicks (
  id                bigserial primary key,
  user_id           uuid references auth.users(id) on delete set null,
  food_id           uuid references public.foods(id) on delete set null,
  partner           text not null,  -- 'coupang' | 'naver' | ...
  source_page       text,           -- 'recommendations' | 'compare' | 'saved'
  recommendation_id uuid references public.recommendations(id) on delete set null,
  clicked_at        timestamptz default now(),
  user_agent        text
);
```

### 3.3 도메인 enum (TypeScript 상수, DB는 text[])

```ts
export const HEALTH_OPTIONS = [
  { id: '질병 없음',          desc: '특별한 진단 없이 건강해요', exclusive: true },
  { id: '신부전 초기',        desc: 'BUN/크레아티닌 가벼운 상승', group: 'kidney' },
  { id: '신부전 1-2기',       desc: 'IRIS 1~2단계 · 조기 관리',  group: 'kidney' },
  { id: '신부전 3-4기',       desc: 'IRIS 3~4단계 · 치료식 필요', group: 'kidney' },
  { id: '당뇨',               desc: '인슐린 또는 식이 조절' },
  { id: '결석-스트루바이트',  desc: '용해 가능 · pH 산성화 사료', group: 'stone' },
  { id: '결석-옥살레이트',    desc: '용해 불가 · 예방·관리 중심', group: 'stone' },
  { id: 'IBD',               desc: '염증성 장 질환' },
  { id: '췌장염',            desc: '저지방 필요' },
] as const;

export const AGE_GROUPS = ['1+', '7+', '11+', '15+'] as const;
export const AGE_LABELS = { '1+': '성묘', '7+': '중년', '11+': '고령', '15+': '초고령' } as const;
export const GOALS = ['질환관리','중노령 전환','체중관리 - 감량','체중관리 - 증량'] as const;
export const DIET_TYPES = ['건식','습식','혼합'] as const;
export const NEUTERED_STATUS = ['완료','안 함','몰라요'] as const;
```

**비즈니스 규칙 (클라이언트 + 서버 양쪽 검증)**:
1. `exclusive: true` 옵션(질병 없음)은 다른 옵션과 동시 선택 불가
2. 같은 `group` 내 옵션은 1개만 선택 가능 (신부전 3단계 중 1개, 결석 2종 중 1개)
3. `질환관리` 목표 선택 + 질병 없음 입력 시 안내 ("진단이 없어도 부담 적은 사료 우선해드려요")

### 3.4 Row-Level Security (RLS) 정책 — **v1 보안 결함 수정**
```sql
-- 모든 사용자 데이터 테이블 RLS 활성화
alter table public.cats enable row level security;
alter table public.profiles enable row level security;
alter table public.recommendations enable row level security;
alter table public.saved_foods enable row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.foods enable row level security;

-- profiles: 본인만
create policy "profiles_owner_all" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- cats: 본인만
create policy "cats_owner_all" on public.cats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- recommendations: 본인만 SELECT (게스트 추천은 RLS로 차단, 서버에서 service_role로만 조회)
create policy "recommendations_owner_select" on public.recommendations
  for select using (auth.uid() is not null and auth.uid() = user_id);
-- INSERT는 anon 차단 — 모든 추천은 server route 경유 (service_role 사용)
-- → INSERT 정책을 생성하지 않으면 anon/authenticated 모두 차단됨

-- saved_foods: 본인만
create policy "saved_owner_all" on public.saved_foods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- affiliate_clicks: 본인 INSERT만 허용 (분석용 SELECT는 service_role만)
create policy "clicks_insert_self" on public.affiliate_clicks
  for insert with check (
    auth.uid() = user_id or user_id is null  -- 게스트 클릭도 기록
  );
-- SELECT 정책 없음 → 사용자는 자기 클릭도 못 봄 (필요 시 추가)

-- foods: active만 public read
create policy "foods_public_read" on public.foods
  for select using (active = true);
-- INSERT/UPDATE/DELETE는 service_role만
```

### 3.5 Supabase Storage 정책 — **신규**
```
버킷: cat-photos
- public: false
- file size limit: 5MB
- allowed mime types: image/jpeg, image/png, image/webp, image/heic
- 경로 규칙: {user_id}/{cat_id}/{uuid}.{ext}

RLS:
- SELECT: 본인 경로만 (storage.foldername(name)[1] = auth.uid()::text)
- INSERT/UPDATE/DELETE: 본인 경로만
- 게스트 사진: 업로드 시점 user 없으면 → localStorage base64로만, 로그인 후 Storage 업로드
```

### 3.6 마이그레이션 도구
- Supabase CLI (`supabase migration new`)
- `supabase/migrations/` Git 커밋
- 로컬·스테이징 시드: `supabase/seed.sql` (더미 사료 5~10개 + 더미 user)

---

## 4. 추천 로직 명세

### 4.1 전체 흐름
```
[Profile] ─> [Hard Filter] ─> [Scoring] ─> [TOP 2 선정 + 다양성] ─> [Priority 표시] ─> [LLM 설명 SSE]
                  │
                  ├─ active=true
                  ├─ age_fit 매치
                  ├─ avoid_ingredients 충돌 없음 (정규화 키워드 매칭)
                  └─ (질환별 안전 임계치 — M2 수의사 자문)
```

### 4.2 결정성 보장 — **재확인**
- **TOP 2 선정은 100% 결정적**: 같은 프로필 + 같은 사료 DB 상태 → 같은 사료 2개 보장
- **LLM 설명은 매번 신선**: 캐싱 없이 새 호출. 표현 다름은 의도된 동작
- **알려진 제약**: 사료 DB가 업데이트되면 결과가 달라질 수 있음 → UX 카피로 안내 ("매번 신선하게 분석해요"), 변경 통지는 Phase 2

### 4.3 Hard Filter (안전 필터)
```ts
function hardFilter(cat: Cat, food: Food): boolean {
  if (!food.active) return false;
  if (!food.age_fit.includes(cat.age_group)) return false;

  // avoid_ingredients 정규화 매칭 — v1의 substring 매칭에서 개선
  const blockedKeywords = cat.avoid_ingredients
    .flatMap(ing => INGREDIENT_SYNONYMS[ing] ?? [ing]);
  if (food.ingredient_keywords.some(k => blockedKeywords.includes(k))) return false;

  // 질환별 안전 임계치 — M2 수의사 자문 확정
  for (const condition of cat.health_conditions) {
    const threshold = SAFETY_THRESHOLDS[condition];
    if (threshold && !threshold(food)) return false;
  }
  return true;
}
```

#### 동의어 사전 (`INGREDIENT_SYNONYMS`)
MVP 최소셋 (M2 시드 작업 시 사료 ingredient_keywords와 함께 정비):
```ts
export const INGREDIENT_SYNONYMS: Record<string, string[]> = {
  '닭':     ['닭','닭고기','치킨','chicken'],
  '소고기': ['소고기','쇠고기','우육','beef'],
  '생선':   ['생선','어류','연어','참치','대구','salmon','tuna'],
  '연어':   ['연어','salmon'],
  '곡물':   ['곡물','옥수수','밀','쌀','보리','corn','wheat','rice'],
  '옥수수': ['옥수수','corn'],
  '유제품': ['유제품','우유','치즈','요거트','dairy','milk'],
};
```

#### 안전 임계치 (`SAFETY_THRESHOLDS`) — M2 확정
```ts
// 예시 — 실제값은 수의사 자문 후 확정
export const SAFETY_THRESHOLDS: Record<string, (f: Food) => boolean> = {
  '신부전 3-4기': f => (f.phosphorus_pct ?? 0) <= 0.5,
  '췌장염':       f => (f.fat_pct ?? 0) <= 10,
  // ...
};
```
> M2 종료 전까지는 모든 키를 truthy 함수로 두고 "수의사 상담 권장" 배너만 띄움.

### 4.4 Scoring (가중치 합산)
```ts
function score(cat: Cat, food: Food): Score {
  const b: Record<string, number> = {};
  b.age       = food.age_fit.includes(cat.age_group) ? 30 : 0;
  b.condition = cat.health_conditions.filter(c => food.condition_fit.includes(c)).length * 25;
  b.goal      = (cat.goal === '질환관리' && b.condition > 0) ? 10 : 0;
  b.diet      = (cat.diet_type === '혼합' || food.category === cat.diet_type) ? 5 : 0;
  b.nutrition = nutritionScore(cat, food);  // 질환별 영양소 적합도 (M2)
  const total = Object.values(b).reduce((a, c) => a + c, 0);
  return { total, breakdown: b };
}
```
> 가중치 표 확정은 M2 트랙. 초기값으로 시작 후 시드 10~20개 결과를 수동 검수하며 튜닝.

### 4.5 TOP 2 선정 (다양성 휴리스틱)
1. Hard filter 통과 후보를 score desc 정렬
2. 상위 1개 선택
3. 2번째는 **1번째와 카테고리(건식/습식)가 다른 후보** 우선 (건식+습식 페어가 자연스러운 비교)
4. 단, 다양성 후보 점수가 1번째와 30%+ 차이면 같은 카테고리라도 2위 선택
5. 동점 시: `food.id` 사전순 (재현성 보장)

### 4.6 추천 우선순위 박스 — **신규 (디자인 기반)**
디자인 코드의 `priorityOrder` 로직을 컴포넌트화. 사용자에게 "왜 이 사료를 골랐는지" 결정 흐름을 시각화.
```ts
// 사료 카드 위에 노출
// [1] 7+ 연령 적합 사료 (주 기준)
// [2] 질환관리 — 신부전 초기 (위 후보 중 안전한 사료만)
// [3] 체중관리 - 감량 (남은 후보를 칼로리 낮은 순)
function buildPriorityOrder(cat: Cat): PriorityStep[] {
  const steps: PriorityStep[] = [];
  if (cat.age_group !== '1+') {
    steps.push({ label: `${cat.age_group} 연령 적합 사료`, primary: true, tone: 'blue' });
  }
  const conds = cat.health_conditions.filter(c => c !== '질병 없음');
  if (conds.length > 0) {
    steps.push({ label: '질환관리', desc: conds.join(', '), tone: 'yellow' });
  }
  // 목표별 분기 — 디자인 코드 그대로
  // ...
  return steps;
}
```

### 4.7 LLM 설명 생성

#### 입력
- 프로필 요약
- 선정된 사료 정보 (전체 영양소, 태그, 성분 요약)
- 규칙 스코어 breakdown
- 출력 JSON 스키마

#### 모델·파라미터
- 모델: `claude-haiku-4-5-20251001` (인터뷰 결정)
- temperature: 0.4
- max_tokens: 1500
- **사료 2개 병렬 호출** (응답 시간 단축)
- **Streaming SSE on Vercel Edge Runtime** — Vercel Node 함수 timeout 60초 한도 회피

#### 출력 JSON 스키마 (디자인 코드 REASONS와 동형)
```json
{
  "headline": "9살 초기 신부전에 부담이 가장 적은 사료예요",
  "summary": "...",
  "checks": [{ "ok": true, "label": "인 0.55%", "detail": "..." }, ...],
  "cautions": ["...", ...],
  "detail_paragraphs": ["...", ...],
  "transition_plan": [{ "day": "1~2일차", "current": 75, "new": 25 }, ...]
}
```

#### 프롬프트 버전 관리
- `src/lib/llm/prompts/recommendation-v1.ts`
- 변경 시 버전 번호 증가, `recommendations.llm_prompt_version` 기록
- 시스템 프롬프트에 의료 면책 명시 → 출력에 자연스럽게 녹임

#### 안전장치
- JSON 스키마 불일치 시 fallback (규칙 breakdown을 템플릿으로 채움)
- 타임아웃 12초 (Edge runtime 25초 한도 안 여유)
- 에러 시 사용자에게 "잠시 후 다시" 토스트 + 카드는 데이터만 표시

### 4.8 비교 화면 자연어 요약 — **템플릿 기반 (MVP)**
디자인 코드의 비교 요약 박스를 템플릿으로 구현:
```ts
function buildCompareSummary(current: Food, rec: Food, cat: Cat): string {
  const parts: string[] = [];
  const pPct = pctChange(current.phosphorus_pct, rec.phosphorus_pct);
  const nPct = pctChange(current.sodium_pct, rec.sodium_pct);
  if (pPct && nPct && pPct < 0 && nPct < 0) {
    parts.push(`바꾸면 **인 ${Math.abs(pPct)}% ↓**, **나트륨 ${Math.abs(nPct)}% ↓**로 신장 부담이 크게 줄어요.`);
  }
  // 단백질·지방·칼로리 변화 문구도 동일 패턴
  const proteinDelta = rec.protein_pct - current.protein_pct;
  if (Math.abs(proteinDelta) < 3) {
    parts.push('단백질은 비슷한 수준이에요.');
  } else if (proteinDelta < 0 && cat.age_group !== '1+') {
    parts.push('단백질은 살짝 줄지만 노령묘 기준에서는 충분한 수준이에요.');
  }
  // ...
  return parts.join(' ');
}
```
> LLM 비교 요약은 Phase 2. 템플릿이 부자연스러우면 추후 도입.

### 4.9 영양소 importance — **MVP는 정적, Phase 2 동적**
- MVP: 디자인 코드의 `NUTRIENT_ROWS` 그대로 (인·나트륨이 항상 high)
- Phase 2: 고양이 상태에 따라 동적 계산
  ```ts
  function dynamicImportance(cat: Cat): Record<string, 'high'|'mid'|'low'> {
    if (cat.health_conditions.some(c => c.startsWith('신부전'))) {
      return { phosphorus_pct: 'high', sodium_pct: 'high', protein_pct: 'mid', ... };
    }
    if (cat.health_conditions.includes('당뇨')) {
      return { fat_pct: 'high', kcal_per_100g: 'high', ... };
    }
    // ...
  }
  ```

### 4.10 API 계약
```
POST /api/recommendations  (Edge Runtime)
  Body: { cat: CatProfile, guest_token?: string }
  Response: { recommendation_id, foods: [Food,Food], scores, priority_order }

POST /api/explanations  (Edge Runtime + SSE)
  Body: { recommendation_id, food_id }
  Response: stream of partial JSON (chunked)

POST /api/upload/cat-photo  (Node Runtime)
  Body: { content_type, size }
  Response: { upload_url (signed), object_path }

GET  /api/click/:productId  (Node Runtime)
  Query: ?partner=coupang&rec_id=...&source=recommendations
  Action: insert affiliate_clicks → 302 redirect to partner URL
```

---

## 5. 컴포넌트 & 라우팅 설계

### 5.1 디렉토리 구조
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                   # 랜딩 (onStart, onDemo)
│   ├── demo/page.tsx              # 데모 진입점
│   ├── onboarding/
│   │   ├── layout.tsx             # stepper
│   │   ├── basics/page.tsx        # + 사진 업로드 슬롯
│   │   ├── diet/page.tsx
│   │   ├── health/page.tsx        # exclusive/group 로직
│   │   └── goal/page.tsx
│   ├── recommendations/page.tsx
│   ├── compare/page.tsx
│   ├── saved/page.tsx
│   ├── cat/page.tsx
│   ├── auth/sign-in/page.tsx
│   ├── auth/callback/route.ts
│   ├── legal/
│   │   ├── terms/page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── affiliate/page.tsx
│   │   └── medical-disclaimer/page.tsx
│   └── api/
│       ├── recommendations/route.ts        (runtime = 'edge')
│       ├── explanations/route.ts           (runtime = 'edge')
│       ├── click/[productId]/route.ts
│       └── upload/cat-photo/route.ts
├── components/
│   ├── ui/                        # primitives (Button, Card, Chip, Icon, Stepper, Input, Segmented, Mono)
│   ├── domain/
│   │   ├── FoodRecCard.tsx
│   │   ├── PriorityOrderBox.tsx   # 신규
│   │   ├── ProfileBanner.tsx
│   │   ├── NutrientCompareTable.tsx
│   │   ├── MonthlyCostCompare.tsx # 신규
│   │   ├── CompareSummaryCard.tsx # 템플릿 자연어
│   │   ├── TransitionGuide.tsx    # 전환 plan
│   │   ├── CatAvatar.tsx          # 사진 fallback (이름 첫글자)
│   │   ├── FoodArt.tsx            # 사료 이미지 fallback (brand+category SVG)
│   │   ├── PhotoUploadSlot.tsx    # 신규
│   │   └── CatDescription.tsx     # 자동 자연어 설명 (describeCat)
│   └── layout/                    # TopNav, Footer, AffiliateBadge
├── lib/
│   ├── supabase/                  # browser, server, middleware
│   ├── recommendation/
│   │   ├── filter.ts
│   │   ├── scorer.ts
│   │   ├── selector.ts
│   │   ├── priority-order.ts      # 신규
│   │   ├── compare-summary.ts     # 신규 (템플릿)
│   │   └── thresholds.ts          # M2 수의사 자문 결과
│   ├── llm/
│   │   ├── anthropic.ts
│   │   └── prompts/recommendation-v1.ts
│   ├── domain/
│   │   ├── types.ts
│   │   ├── constants.ts           # HEALTH_OPTIONS (exclusive/group 포함), AGE_GROUPS, ...
│   │   ├── ingredient-synonyms.ts # 동의어 사전
│   │   ├── importance.ts          # MVP 정적, Phase 2 동적
│   │   └── schemas.ts             # Zod
│   ├── storage/
│   │   ├── upload.ts              # Storage signed URL
│   │   └── image.ts               # HEIC→JPEG, EXIF 보정, 리사이즈
│   ├── guest-storage.ts           # localStorage
│   └── analytics.ts               # GA4 wrapper
└── styles/
    └── globals.css                # Tailwind base
```

### 5.2 디자인 코드 포팅 가이드 — **v1 대비 보강**
- `docs/design/tokens.js` → `tailwind.config.ts`의 `theme.extend.colors`
- **prefix 적용**: Tailwind 기본 클래스와 충돌 방지 위해 `brand-bg`, `brand-yellow`, `surface-1` 등 semantic prefix. 디자인 토큰 키도 동일 매핑.
- `docs/design/primitives.jsx` → `src/components/ui/*.tsx` 1:1 포팅 (TypeScript prop)
- `docs/design/screens-*.jsx` → page.tsx + domain 컴포넌트로 분해
- 디자인 코드는 단일 HTML 프로토타입 → 'use client' 명시
- 아이콘은 디자인 inline SVG 대신 **lucide-react** (기획서 명시) — 동등 아이콘 매핑 표 작성:
  - `bowl` → `<UtensilsCrossed>`, `paw` → `<Cat>`, `spark` → `<Sparkles>`, `drop` → `<Droplet>`, `scale` → `<Scale>`, `heart` → `<Heart>`, `leaf` → `<Leaf>`, `info` → `<Info>`, `warn` → `<TriangleAlert>`
- **폰트**: **Pretendard** (디자인 코드 기준, v1 Noto Sans KR 수정)
- **CatAvatar / FoodArt fallback** — 사진 없는 사료가 다수일 것:
  - CatAvatar: 사진 없으면 이름 첫글자 + 배경색 (디자인 코드 그대로)
  - FoodArt: 사료 이미지 없으면 카테고리·brand로 SVG 합성 (디자인 코드의 FoodArt 그대로 포팅)

### 5.3 상태 관리
- **서버 상태**: Supabase는 RSC + `revalidate` 또는 SWR
- **클라이언트 상태**: 위저드 진행, 게스트 프로필, 사진 임시 미리보기 → **Zustand 1개 스토어** (`useGuestStore`)
- 별도 글로벌 상태 라이브러리 미도입

### 5.4 폼·검증
- React Hook Form + Zod
- step별 Zod schema → `lib/domain/schemas.ts`에 collocate
- 서버 라우트에서 한 번 더 검증 (방어선 2겹)
- **health_conditions 비즈니스 규칙**도 Zod superRefine으로:
  ```ts
  z.array(z.enum(HEALTH_IDS)).superRefine((v, ctx) => {
    if (v.includes('질병 없음') && v.length > 1) ctx.addIssue({ ... });
    // group 중복 체크
  });
  ```

---

## 6. 외부 의존성 & 환경 변수

### 6.1 패키지
| 패키지 | 버전 | 용도 |
|---|---|---|
| `next` | `^15` (App Router) | 프레임워크 |
| `react`, `react-dom` | `^19` | UI |
| `typescript` | `^5` | 타입 |
| `tailwindcss` | **`^3.4`** (v4 마이그레이션은 Phase 2) | 스타일 |
| `@supabase/supabase-js`, `@supabase/ssr` | 최신 | DB·Auth |
| `@anthropic-ai/sdk` | 최신 | LLM |
| `lucide-react` | 최신 | 아이콘 |
| `react-hook-form`, `zod` | 최신 | 폼·검증 |
| `zustand` | 최신 | 클라이언트 상태 |
| `browser-image-compression` | 최신 | HEIC→JPEG·리사이즈 |
| `eslint`, `prettier` | 최신 | 코드 품질 |
| `vitest`, `@testing-library/react` | 최신 | 단위 테스트 |
| `playwright` | 최신 | E2E |

### 6.2 환경 변수
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # 서버 전용

# Anthropic
ANTHROPIC_API_KEY=                  # 서버 전용

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
KAKAO_REST_API_KEY=                 # Custom OIDC 우회 구현
KAKAO_CLIENT_SECRET=

# 분석
NEXT_PUBLIC_GA_ID=

# 환경 식별
NEXT_PUBLIC_ENV=development|staging|production
```

### 6.3 환경 분리 — **신규**
v1에 빠진 환경 분리. OAuth Preview 문제 해결:
- **Production**: Vercel prod + Supabase prod project + Google/Kakao prod client
- **Staging**: 별도 Vercel project (도메인 고정: `staging.wangrut.com` 등) + Supabase staging project + Google/Kakao staging client (콜백 고정)
- **Preview**: Vercel preview 도메인 → OAuth 작동 안 함 (콜백 등록 불가) → **로그인 필요 흐름은 staging에서만 테스트**
- **Local**: `supabase start` (로컬 DB) + 로컬 Anthropic key

### 6.4 보안 체크리스트
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` 클라이언트 번들 포함 금지
- [ ] LLM 호출은 서버 라우트 경유 (브라우저 직호출 금지)
- [ ] OAuth callback URL은 production + staging만 등록 (preview는 의도적 미등록)
- [ ] CSP 헤더 (이미지 출처: Supabase Storage + 사료 제조사 도메인 화이트리스트)
- [ ] 제휴 리다이렉트는 화이트리스트 도메인만 (open redirect 방어)
- [ ] **RLS 정책 통합 테스트** — 다른 user의 데이터 read/write 시도 → 차단 확인 (E2E)
- [ ] **Storage 권한 테스트** — 다른 user 폴더 접근 시도 → 차단 확인

---

## 7. 마일스톤 & 작업 분해 (6~8주)

> 인력 가정 단순화. 풀타임 1인 환산. 실제 인력에 따라 압축 가능.
> **🔥 표시 = 외부 의존·일정 위험 항목**

### M0 — 셋업 + 외부 의존 시작 (4~5일)
- [ ] Next.js 15 + TS + Tailwind 3.4 부트스트랩
- [ ] Supabase 프로젝트 3개 생성 (dev/staging/prod)
- [ ] Vercel project 2개 (production / staging)
- [ ] 디자인 토큰 → Tailwind config (semantic prefix)
- [ ] Pretendard 폰트 로딩
- [ ] `primitives.jsx` → `components/ui/*.tsx` 포팅
- [ ] 도메인 타입·상수 정리 (HEALTH_OPTIONS 비즈니스 규칙 포함)
- [ ] ESLint/Prettier/lint-staged + Vercel preview CI
- [ ] 🔥 **수의사 자문 컨택 시작** (M2 임계치 결정용)
- [ ] 🔥 **사료 DB 시드 정리 가이드 작성** (`docs/food-data-entry-guide.md`)
- [ ] **산출물**: 토큰 적용된 랜딩 1장 + 외부 의존 컨택 진행 중

### M0.5 — 사료 DB 시드 (M0~M2 parallel track, 5~10일) 🔥
- [ ] 제조사 공식 사이트 데이터 수집 (목표 20개)
- [ ] 단위 정규화 (per kg ↔ per 100g, % ↔ mg/kg)
- [ ] dry matter basis 변환 (moisture 보정)
- [ ] ingredient_keywords 정규화 (동의어 사전과 매핑)
- [ ] image_url·affiliate_links 정리
- [ ] Supabase Studio에 입력 + RLS 동작 확인
- [ ] **산출물**: foods 20행 입력 완료

### M1 — 프로필 입력 위저드 + 사진 (5~7일)
- [ ] DB 마이그레이션: `profiles`, `cats` (사진 필드 포함) + RLS
- [ ] Supabase Storage 버킷 `cat-photos` 생성 + 정책
- [ ] 게스트 스토어 (Zustand + localStorage)
- [ ] 4단계 stepped 위저드 + 슬라이드 전환
- [ ] 각 step Zod schema + RHF
- [ ] **HEALTH_OPTIONS exclusive/group 로직** (클라이언트 + Zod superRefine)
- [ ] **사진 업로드 슬롯** (basics step) — HEIC 변환·리사이즈·미리보기
- [ ] 게스트는 base64 localStorage, 로그인 시 Storage 업로드
- [ ] 연령 그룹·라벨 자동 표시
- [ ] **산출물**: 위저드 + 사진 → 더미 추천 페이지

### M2 — 추천 엔진 + LLM 설명 (10~14일) ⚠️ 최대 위험 구간 🔥
- [ ] 🔥 **수의사 자문 1차 미팅** → hard filter 임계치 + 가중치 1차 확정
- [ ] `lib/recommendation/` 5개 모듈 (filter / scorer / selector / priority-order / compare-summary) + 단위 테스트 90%+
- [ ] `ingredient-synonyms.ts` 정비
- [ ] `/api/recommendations` Route Handler (Edge Runtime)
- [ ] Anthropic SDK wrapper + 프롬프트 v1
- [ ] `/api/explanations` Edge Runtime SSE 스트리밍
- [ ] 추천 결과 페이지: ProfileBanner + PriorityOrderBox + FoodRecCard × 2
- [ ] FoodRecCard에 자세히 토글 + 전환 가이드
- [ ] 시드 사료 20개로 결과 수동 검수 → 가중치 2차 튜닝
- [ ] 🔥 **수의사 자문 2차 (튜닝 검수)**
- [ ] LLM fallback 동작 검증 (JSON 불일치·타임아웃 시뮬레이션)
- [ ] **산출물**: 실제 프로필 → TOP 2 + LLM 설명 + 우선순위 박스 동작

### M3 — 비교·저장·OAuth·데모 (7~9일)
- [ ] Supabase Auth: Google Provider 설정 + 콜백
- [ ] 🔥 **Kakao Custom OIDC 우회 구현** (1~2일 별도)
- [ ] 게스트 → 로그인 데이터 마이그레이션 (프로필 + 사진 + 추천 이력)
- [ ] DB 마이그레이션: `recommendations`, `saved_foods`, `affiliate_clicks` + RLS
- [ ] 비교 페이지: NutrientCompareTable + MonthlyCostCompare + CompareSummaryCard (템플릿)
- [ ] 저장 버튼·저장 목록 페이지
- [ ] 제휴 링크 리다이렉트 + 클릭 트래킹 + **카드 단위 "광고" 표기**
- [ ] 랜딩 "예시 결과 먼저 보기" 데모 플로우
- [ ] 내 아이 프로필 화면 (CatDescription 자동 설명)
- [ ] **산출물**: 게스트~로그인 전 플로우 동작

### M4 — QA + 폴리시 + 컴플라이언스 (5~7일)
- [ ] 모바일 반응형 (4가지 뷰포트)
- [ ] 빈 상태/로딩/에러 UI 전부 그리기 (디자인 코드 ChatTyping 같은 디테일 포함)
- [ ] 메타 태그·OG 이미지·favicon·robots
- [ ] **약관·개인정보·광고제휴표기·면책 4페이지 작성**
- [ ] **개인정보 처리 동의 흐름**: 가입 시 필수/선택 분리 + 만 14세 미만 차단
- [ ] **공정위 광고 표기**: 사료 카드 + 푸터 양쪽 표기
- [ ] Playwright E2E 3개: 게스트 추천 / 로그인 후 저장 / 비교 후 제휴 클릭
- [ ] **RLS / Storage 격리 통합 테스트**
- [ ] Lighthouse 90+ (모바일)
- [ ] **LLM evaluation set**: 50개 프로필 샘플 → 수의사 검수
- [ ] LLM 장애 시뮬레이션 → fallback 검증
- [ ] **산출물**: 베타 런칭 가능

### M5 — 런칭 (2~3일)
- [ ] 도메인 연결 (TBD — 11.5)
- [ ] 프로덕션 시드 (foods 20행)
- [ ] GA4 + Search Console
- [ ] 모니터링·알람 (Vercel Analytics + Supabase 로그 + Anthropic usage)
- [ ] 1차 사용자 5~10명 베타 + 피드백 채널 (구글폼)

### 일정 요약
| 마일스톤 | 기간 | 누적 |
|---|---|---|
| M0 셋업 + 외부 의존 시작 | 4~5d | ~5d |
| M0.5 사료 DB 시드 (parallel) | 5~10d (M0~M2 병행) | — |
| M1 프로필 + 사진 | 5~7d | ~12d |
| M2 추천 엔진 (수의사 자문 포함) | 10~14d | ~26d |
| M3 비교·저장·OAuth·데모 | 7~9d | ~35d |
| M4 QA + 컴플라이언스 | 5~7d | ~42d |
| M5 런칭 | 2~3d | ~45d |

→ **약 6~8주**. M2 수의사 자문·시드 데이터 정리가 일정 변수.

---

## 8. QA & 런칭 체크리스트

### 8.1 테스트 전략
| 레이어 | 도구 | 커버리지 |
|---|---|---|
| 도메인 로직 (filter/scorer/selector/priority/compare-summary) | Vitest | 90%+ |
| HEALTH_OPTIONS 비즈니스 규칙 | Vitest | 100% |
| ingredient 동의어 매칭 | Vitest | 핵심 케이스 20+ |
| UI 컴포넌트 | RTL | 주요 인터랙션 |
| API 라우트 | Vitest (Supabase mock) | 50%+ |
| **RLS·Storage 격리** | Playwright (실제 Supabase 호출) | 필수 |
| E2E 골든 패스 | Playwright | 3개 |

### 8.2 의료성 컴플라이언스
- [ ] 모든 추천·비교 화면에 의료 면책 고지
- [ ] LLM 시스템 프롬프트에 진단·처방 단어 회피 가이드
- [ ] 신부전 3-4기·췌장염 등 중증 케이스 → "수의사 상담 권장" 배너 강조
- [ ] 추천 결과 카드에 "본 추천은 진단을 대체하지 않습니다" 작은 라벨

### 8.3 개인정보보호 컴플라이언스 — **신규**
- [ ] 가입 동의 화면: 필수(이용약관·개인정보처리방침) / 선택(마케팅) 분리
- [ ] 만 14세 미만 가입 차단 (생년월일 입력 + 차단)
- [ ] 개인정보 처리방침: 수집 항목·목적·보유기간 명시
- [ ] 회원 탈퇴 시 데이터 삭제 (cascade) 검증
- [ ] 데이터 보관 기간 정책 (게스트 추천 30일 보관 후 삭제 등)

### 8.4 광고·제휴 컴플라이언스 — **신규**
- [ ] 사료 카드의 "구매처 보기" 버튼 근처에 **"광고"** 또는 **"제휴"** 라벨
- [ ] 비교 화면의 "구매처 보기" 동일
- [ ] 푸터 + `/legal/affiliate` 페이지에 전체 정책 명시
- [ ] 쿠팡 파트너스 / 네이버 스마트스토어 약관 준수
- [ ] 추천 사료 선정에 제휴 여부가 영향 없음을 명시 (랜딩 "광고가 아닌, 우리 아이 기준" 카피와 일관)

### 8.5 LLM 품질 모니터링 — **신규**
- [ ] M4에 evaluation set 1회 (50샘플 → 수의사 검수)
- [ ] 운영 중 weekly random sampling 10건 → 수동 검수 채널
- [ ] LLM JSON schema fail 비율 모니터링 (대시보드)
- [ ] 토큰 사용량 / 비용 일일 알람

### 8.6 런칭 전 직접 확인
- [ ] Vercel production 정상
- [ ] Google + Kakao OAuth 둘 다 동작 (production 콜백)
- [ ] **RLS 침투 테스트**: 다른 user 데이터 조회·수정 → 차단
- [ ] **Storage 침투 테스트**: 다른 user 폴더 접근 → 차단
- [ ] 게스트 → 로그인 마이그레이션 손실 없음
- [ ] 사진 업로드: iOS HEIC, Android JPG, 5MB+ 거부 동작
- [ ] LLM 타임아웃 → fallback UI
- [ ] 모바일 4뷰포트 (360/390/414/768)
- [ ] 제휴 링크 클릭 → 트래킹 row 생성
- [ ] 데모 모드 → "예시 데이터" 배지 표시

---

## 9. 오픈 이슈 / Phase 2

### 9.1 LLM 모델 디폴트 확정
- M0 종료 시 Haiku PoC → 만족 시 확정, 아니면 Sonnet 비교

### 9.2 추천 규칙 가중치·안전 임계치
- M2 트랙. 수의사 자문 결과는 `docs/recommendation-rules.md`에 별도 관리.

### 9.3 다묘 가구 (Phase 2)
- 스키마 1:N 유지. UI만 확장 (+ 새 아이 / 프로필 스위처).

### 9.4 어드민 페이지 (Phase 2)
- MVP 제외. 사료 등록 빈도 주 5건+ 시 우선순위 상향.

### 9.5 도메인
- TBD. `wangrut.com` 등 후보 조사.

### 9.6 분석 도구
- GA4로 시작. PostHog는 사용량 증가 시 검토.

### 9.7 위저드 UX 변형 (Phase 2)
- one-page / chat 변형 출시 후 사용성 평가 → A/B 테스트 후보.

### 9.8 사진 갤러리 6장 (Phase 2)
- MVP는 hero 1장. 6장 갤러리는 사진 정렬·삭제 UX 별도 설계 필요.

### 9.9 동적 영양소 importance (Phase 2)
- 질환별로 비교 화면의 high/mid/low가 달라지게.

### 9.10 LLM 기반 비교 요약 (Phase 2)
- 템플릿이 부자연스러우면 도입. 비용·결정성 trade-off 검토.

### 9.11 추천 결과 변경 통지 (Phase 2)
- 사료 DB 업데이트로 결과 달라질 때 사용자에게 차이 안내.

### 9.12 알레르기 정밀 매칭 (Phase 2)
- MVP는 동의어 사전 기반. Phase 2는 사료 ingredients 정규화 배열 + ML 매칭.

### 9.13 위저드 카피 통일
- "3단계" vs "4단계" 카피 UX writer 확정. 라이프사이클 3단계("프로필→추천→비교")로 가는 게 유력.

---

## 10. 개발 리스크 & 완화 전략 — **신규**

### R1. Kakao OAuth Supabase 1st-class 미지원 (확률 高·영향 中)
- **리스크**: Supabase Auth가 Kakao를 직접 지원 안 함. Custom OIDC 또는 `signInWithOAuth` 우회 구현 필요.
- **완화**: M3 일정에 별도 1~2일 배정. 우회 패턴: Kakao OAuth → Edge Function → Supabase JWT 발급. PoC를 M1에 미리 진행.

### R2. SSE 스트리밍 + Vercel Timeout (확률 中·영향 高)
- **리스크**: Vercel Node 함수 timeout 60초, Edge 25초. LLM 응답 8~12초 + 마진 빠듯.
- **완화**: `/api/explanations`는 **Edge Runtime 필수**. 사료 2개 병렬 호출로 총 시간 단축. 클라이언트 fallback 타이머 15초.

### R3. Next.js 15 + React 19 + Tailwind 4 동시 사용 (확률 中·영향 中)
- **리스크**: 모두 비교적 새 버전. 호환성·디버깅 비용.
- **완화**: **Tailwind 3.4로 다운그레이드** (v2 결정). Next.js 15 + React 19 RSC 경계는 학습 필수.

### R4. 사료 DB 시드 데이터 실제 소요 (확률 高·영향 高)
- **리스크**: 단위 비일관·dry matter 변환·이미지 수집·affiliate 링크 정리. 20개 = 1~2주 단독 작업.
- **완화**: M0부터 parallel track 강제 배치 (M0.5). 비개발 인력 활용 가능. 시드 가이드 문서로 작업 표준화.

### R5. 수의사 자문 일정 외부 의존 (확률 中·영향 高)
- **리스크**: 섭외부터 시작 → M2 hard filter 임계치 결정이 2~3주 지연 가능.
- **완화**: M0에 컨택 시작. 1차 자문 M1 종료 시점까지 잡기. 임시 conservative threshold (모든 사료 통과 + "수의사 상담 권장" 배너)로 시작 후 강화.

### R6. 추천 결과 결정성이 사료 DB 업데이트로 깨짐 (확률 高·영향 低)
- **리스크**: 어드민 사료 추가/수정 → 같은 프로필 결과 변경 → 사용자 혼란.
- **완화**: `cat_snapshot` JSON 저장으로 과거 결과 재현 가능. 변경 통지 UX는 Phase 2. UX 카피로 "매번 신선하게 분석" 강조.

### R7. LLM 응답 품질 검증 자동화 부족 (확률 中·영향 中)
- **리스크**: 매번 신선 생성 → 가끔 의료성 단어·schema 불일치.
- **완화**: M4 evaluation set 1회 + 운영 중 weekly sampling. JSON schema fail은 fallback으로 자동 처리. 사용자 신고 채널.

### R8. avoid_ingredients false negative/positive (확률 中·영향 高 — 의료성)
- **리스크**: '닭' 회피인데 '치킨' 표기 매칭 실패 → 알레르기 사고 가능성.
- **완화**: `INGREDIENT_SYNONYMS` 사전 + 사료 시드 시 `ingredient_keywords` 정규화 동시 정비. M4에 알레르기 시뮬레이션 테스트 케이스.

### R9. OAuth Preview 환경 불가 (확률 高·영향 中)
- **리스크**: Vercel preview 도메인 매번 변경 → OAuth 콜백 불가 → preview에서 인증 흐름 테스트 불가.
- **완화**: Staging 환경 별도 구축 (도메인 고정). Preview는 게스트 흐름만 검증.

### R10. 모바일 사진 처리 (확률 中·영향 中)
- **리스크**: HEIC·iOS EXIF 회전·5MB+ 처리.
- **완화**: `browser-image-compression` 도입 (HEIC→JPEG 변환 + EXIF 보정 + 리사이즈 1200px). 클라이언트에서 처리 후 업로드.

### R11. 개인정보보호법 컴플라이언스 (확률 中·영향 高)
- **리스크**: 만 14세 미만 차단·필수/선택 동의 분리 미흡 시 과징금 위험.
- **완화**: M4에 컴플라이언스 체크리스트 별도 시행. 법무 검수 가능하면 권장.

### R12. Tailwind 토큰 충돌 (확률 高·영향 低)
- **리스크**: `bg-yellow` 등 디자인 토큰 명이 Tailwind 기본과 충돌.
- **완화**: semantic prefix (`brand-yellow`, `surface-1`) 적용. 디자인 토큰 → Tailwind 매핑 표 M0에 작성.

### R13. CatAvatar / FoodArt fallback UX (확률 高·영향 低)
- **리스크**: 사진 없는 사료가 다수 → fallback이 일관되지 않으면 디자인 품질 ↓.
- **완화**: 디자인 코드의 CatAvatar·FoodArt 컴포넌트 그대로 포팅 (이름 첫글자·brand 합성 SVG). M0~M1에 완료.

---

## 부록 A — 인터뷰 결정 사항 (트레이서빌리티)

| 결정 | 값 | 라운드 |
|---|---|---|
| 서비스명 | 완그릇 | 1 |
| 어드민 MVP | 제외 (Supabase Studio) | 1 |
| 추천 설명 생성 | LLM 동적 (매번) | 1 |
| 사료 DB 소스 | 제조사 공식 수기 정리 | 1 |
| LLM 캐싱 | 없음 | 2 |
| 추천 엔진 구조 | 선정=규칙, 설명=LLM | 2 |
| 규칙 세부 | M2 결정 | 2 |
| 게스트 범위 | 추천 결과까지 | 2 |
| 인증 수단 | Google + Kakao OAuth | 2 |
| 연령 그룹 | 1+/7+/11+/15+ | 3 |
| 질환 카테고리 | 디자인 수준 세분화 | 3 |
| 구매 링크 | 제휴 (쿠팡·네이버) | 3 |
| avoid_ingredients UX | 추천 태그 + 자유 입력 | 3 |
| 배포 환경 | Vercel + Supabase Cloud | 4 |
| 일정 | (v1: 4~6주 → v2: 6~8주 재산정) | 4 |
| 인력 | 충분 | 4 |
| LLM 예산 | 사용량 기반, 한도 없음 | 4 |

## 부록 B — v1 → v2 변경 사항 (점검 보고서 반영)

### Tier 1 — 결함 수정 (5건)
| # | 영역 | v1 | v2 |
|---|---|---|---|
| 1 | RLS 정책 | `user_id is null` SELECT 허용 (보안 결함) | 게스트 추천은 RLS 차단, 서버 service_role만 |
| 2 | 폰트 | Noto Sans KR | Pretendard |
| 3 | 중성화 | boolean | text enum ('완료/안 함/몰라요') |
| 4 | HEALTH_OPTIONS 로직 | 미명시 | exclusive/group 비즈니스 규칙 명시 |
| 5 | 위저드 단계 카피 | 4단계 가정 | 4단계로 통일 (랜딩 "3단계" 카피 수정 작업 명시) |

### Tier 2 — 누락 기능 추가 (8건)
| # | 영역 | v1 | v2 |
|---|---|---|---|
| 6 | 사진 업로드 | 미고려 | MVP hero 1장 + Storage 정책, 6장 갤러리는 Phase 2 |
| 7 | 위저드 UX 변형 | stepped 가정 | stepped 채택, 나머지 2개 Phase 2 |
| 8 | 데모 모드 | 미반영 | 랜딩 "예시 결과 먼저 보기" + /demo 라우트 |
| 9 | 추천 우선순위 박스 | 미명시 | `PriorityOrderBox` 컴포넌트 + `priority-order.ts` 로직 |
| 10 | 월 비용 비교 | 미명시 | `MonthlyCostCompare` 컴포넌트 + `price_per_kg_krw` 활용 |
| 11 | 영양소 importance | 정적 | MVP 정적 + Phase 2 동적 명시 |
| 12 | 비교 요약문 | 미명시 | 템플릿 기반 (`compare-summary.ts`) + LLM 버전 Phase 2 |
| 13 | 광고·제휴 표기 | 푸터만 | 카드 단위 + 별도 페이지 `/legal/affiliate` |

### Tier 3 — 리스크 대응 (13건)
- **10장 "개발 리스크 & 완화 전략" 신규 섹션**에 R1~R13으로 정리. 각 항목에 확률·영향·완화 전략 명시.
- 일정 영향: M0에 외부 의존 컨택 시작·M0.5 사료 DB parallel track 강제·M3 Kakao OAuth 1~2일 별도 배정.
- 결과: 일정 4~6주 → **6~8주**로 재산정.
