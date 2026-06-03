# 완그릇

중·노령·질환 고양이 보호자가 내 아이 조건에 맞는 사료를 이유와 함께 추천받고, 현재 사료와 비교해 전환 판단까지 돕는 웹 서비스. 자세한 기획·아키텍처는 [`docs/dev-plan.md`](docs/dev-plan.md).

## 현재 진행 단계 — M1 위저드까지 완료

- ✅ M0 셋업 (Next.js 15 / TS / Tailwind 3.4 / Pretendard / 디자인 토큰·primitives 포팅 / 랜딩 페이지)
- ✅ M1 위저드 (`/onboarding/{basics,diet,health,goal}` · 게스트 Zustand 스토어 · 사진 업로드 슬롯 · Supabase 마이그레이션·Storage 정책 SQL · `@supabase/ssr` 클라이언트·미들웨어)
- ⏳ M2~M5 — 추천 엔진, 비교, OAuth, QA, 런칭 (별도 세션)

## 시작하기

### 1. 환경 변수

`.env.example`을 `.env.local`로 복사 후 채우세요. Supabase 키는 [GH 이슈 #3](https://github.com/hongbbol/nnenn1/issues/3) 참조.

```bash
cp .env.example .env.local
```

### 2. 의존성

`npm` 캐시 권한 이슈가 있어 별도 캐시 디렉터리 사용을 권장합니다.

```bash
npm install --legacy-peer-deps --cache /tmp/npm-cache-wangrut
```

### 3. Supabase 로컬 (선택)

```bash
supabase start              # 로컬 stack (config.toml 참조)
supabase db reset           # 마이그레이션 적용 + seed.sql 실행
```

### 4. 개발 서버

```bash
npm run dev
```

http://localhost:3000

## 스크립트

- `npm run dev` — 개발 서버
- `npm run build` — 프로덕션 빌드
- `npm run typecheck` — 타입체크
- `npm run lint` — ESLint
- `npm run test` — Vitest (현재 56 tests, 도메인 로직 위주)

## 계획 대비 알려진 차이

| 영역 | 계획 | 현재 | 사유 |
|---|---|---|---|
| 폼 라이브러리 | `react-hook-form + zod` (plan §5.4) | Zustand store + Zod safeParse | persist와 RHF 동기화 복잡성 회피. Zod 검증은 동일하게 적용됨. M3 서버 라우트에서 한 번 더 검증(plan의 "방어선 2겹") 예정. |
| 위저드 슬라이드 전환 | 디자인 컨셉 (plan §2.4) | 라우트 기반 전환 | 라우트 기반이라 브라우저 뒤로/딥링크가 정상 작동. 시각적 슬라이드 트랜지션은 추후 Framer Motion으로 |
| 위저드 URL 가드 | (명시 없음) | 직접 URL 입력 시 step skip 가능 | 의도. 라우트 기반의 자연스러운 동작. 다음 버튼은 여전히 disable됨 |

## 디렉터리

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 랜딩
│   └── onboarding/{basics,diet,health,goal}/
├── components/
│   ├── ui/                       # primitives (포팅된 디자인 코드)
│   ├── layout/                   # TopNav, Footer
│   └── domain/                   # PhotoUploadSlot 등
├── lib/
│   ├── domain/                   # types, constants(HEALTH_OPTIONS), schemas, ingredient-synonyms, importance
│   ├── supabase/                 # browser/server/middleware client
│   ├── storage/                  # 이미지 압축 (HEIC→JPEG)
│   ├── guest-store.ts            # Zustand persist
│   └── cn.ts
├── middleware.ts                 # Supabase auth 세션 리프레시
└── styles/globals.css

supabase/
├── migrations/                   # profiles, cats + RLS / Storage 정책
├── config.toml                   # 로컬 stack 설정
└── seed.sql

docs/
├── dev-plan.md                   # v2 기획서
└── design/                       # 디자인 코드 (참조용)
```

## 사용자 직접 처리 필요한 작업

GitHub 이슈 [`label:setup`](https://github.com/hongbbol/nnenn1/issues?q=is%3Aissue+label%3Asetup)으로 정리되어 있습니다:

| # | 항목 | 차단 여부 |
|---|---|---|
| [#3](https://github.com/hongbbol/nnenn1/issues/3) | Supabase 프로젝트 3개 | blocking |
| [#4](https://github.com/hongbbol/nnenn1/issues/4) | Vercel 프로젝트 2개 | blocking |
| [#5](https://github.com/hongbbol/nnenn1/issues/5) | Google OAuth |  |
| [#6](https://github.com/hongbbol/nnenn1/issues/6) | Kakao OAuth + Custom OIDC | blocking (M3) |
| [#7](https://github.com/hongbbol/nnenn1/issues/7) | Anthropic API 키 |  |
| [#8](https://github.com/hongbbol/nnenn1/issues/8) | 도메인 |  |
| [#9](https://github.com/hongbbol/nnenn1/issues/9) | 수의사 자문 컨택 | blocking (M2) |
| [#10](https://github.com/hongbbol/nnenn1/issues/10) | 사료 DB 시드 20개 | blocking (M2) |
| [#11](https://github.com/hongbbol/nnenn1/issues/11) | Supabase Storage 버킷 |  |
| [#12](https://github.com/hongbbol/nnenn1/issues/12) | GA4 + Search Console |  |
| [#13](https://github.com/hongbbol/nnenn1/issues/13) | 쿠팡·네이버 제휴 |  |
| [#14](https://github.com/hongbbol/nnenn1/issues/14) | 법무 검수 |  |
