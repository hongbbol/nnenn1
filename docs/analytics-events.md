# 완그릇 — 애널리틱스 이벤트 설명서

> 작성일: 2026-06-25
> 대상 도구: **Google Analytics 4 (GA4)** + **Vercel Speed Insights**
> 관련 PR: [#33](https://github.com/hongbbol/nnenn1/pull/33) · 구현 헬퍼: `src/lib/analytics.ts`

이 문서는 현재 사이트에 붙어 있는 분석 이벤트가 **무엇을 / 언제 / 어디서** 수집하는지,
그리고 GA4에서 **어떻게 보는지**를 정리한다.

---

## 1. 개요

- **행동 분석**은 GA4로 한다. 페이지뷰는 자동, 핵심 퍼널 행동은 커스텀 이벤트로 추적한다.
- **성능 모니터링**은 Vercel Speed Insights(Core Web Vitals)로 한다. *(이벤트와 별개)*
- GA4 커스텀 이벤트는 **무료**다. (Vercel Web Analytics는 커스텀 이벤트가 Pro 전용이라 GA4로 선택)
- **측정 ID**: `G-B1CR2K6LNQ`

### 수집되는 환경
| 환경 | GA 수집 | 비고 |
|---|---|---|
| 프로덕션(배포) | ✅ | 코드 기본값 또는 `NEXT_PUBLIC_GA_ID` |
| 로컬 `npm run dev` | ❌ (기본) | 개발 트래픽이 분석을 오염시키지 않게 끔. 테스트하려면 `.env.local`에 `NEXT_PUBLIC_GA_ID=G-B1CR2K6LNQ` |

> ID 우선순위: `NEXT_PUBLIC_GA_ID`(환경변수) → 없으면 프로덕션 빌드에서만 코드 기본값. 정의: `src/app/layout.tsx`.

---

## 2. 자동 수집 (코드 불필요)

GA4 **Enhanced Measurement**가 켜져 있으면 다음이 자동 수집된다.

- `page_view` — 첫 진입 + **SPA 라우트 전환**(`/`, `/onboarding/*`, `/recommendations`, `/compare`, `/mypage` 등)
- `scroll`, `click`(외부 링크), `session_start`, `first_visit` 등 GA4 기본 이벤트

> SPA 페이지뷰는 "Page changes based on browser history events" 옵션에 의존한다(기본 켜짐).
> GA4 → 관리 → 데이터 스트림 → 향상된 측정에서 확인.

---

## 3. 커스텀 이벤트 (퍼널)

완그릇의 핵심 퍼널: **시작 클릭 → 온보딩 4단계 → 추천 생성 → 비교**.

| 이벤트 이름 | 발생 시점 | 파라미터 | 코드 위치 |
|---|---|---|---|
| `cta_start_clicked` | "시작하기" 류 CTA 클릭 | `source`: `hero`\|`nav`<br>`returning`: `boolean`*(hero만)* | `src/components/domain/start-button.tsx`, `src/components/layout/top-nav.tsx` |
| `onboarding_step_completed` | 온보딩 한 단계의 "다음/추천 받기"로 진행 성공 | `step`: `basics`\|`diet`\|`health`\|`goal` | `src/app/onboarding/_nav-buttons.tsx` |
| `recommendation_generated` | 마지막 단계(goal) 저장 성공 = **온보딩 완료** | (없음) | `src/app/onboarding/_nav-buttons.tsx` |
| `compare_clicked` | "현재 사료와 비교하기" 저장 성공 | (없음) | `src/components/domain/compare-button.tsx` |

### 파라미터 의미
- **`source`** — 시작 진입점. `hero` = 랜딩 본문 CTA("3분 안에 시작하기", "추천 받기 시작"), `nav` = 상단 헤더 "시작하기".
- **`returning`** — `hero`에서만. `false` = 신규(빈 온보딩), `true` = 기존 프로필을 채워 다시 시작.
- **`step`** — 방금 **완료한** 단계의 id. 순서: `basics`(기본정보) → `diet`(현재 식단) → `health`(건강) → `goal`(목표).

### 중요한 동작 규칙
- 이벤트는 **저장/진행이 성공한 뒤에만** 발생한다. 예: goal 단계 저장이 실패하면 `onboarding_step_completed`·`recommendation_generated` 둘 다 안 뜬다.
- `onboarding_step_completed`/`recommendation_generated`는 **신규 온보딩(사료찾기) 흐름**에서만 발생한다. 마이페이지의 **프로필 수정("완료")** 흐름은 추적하지 않는다.
- `step`이 `goal`인 `onboarding_step_completed`와 `recommendation_generated`는 **같이** 발생한다(마지막 단계 = 완료).

---

## 4. 퍼널 읽는 법 (예시)

전환 깔때기를 이벤트 수로 보면:

```
cta_start_clicked            ← 시작 의향
  └ onboarding_step_completed (step=basics)
      └ ... (diet → health → goal)
          └ recommendation_generated   ← 핵심 전환(추천 도달)
              └ compare_clicked        ← 심화 행동(비교)
```

- **이탈 단계 파악**: `onboarding_step_completed`를 `step`별로 쪼개면 어느 단계에서 사람이 빠지는지 보인다.
- **진입점 효과**: `cta_start_clicked`를 `source`로 쪼개면 헤더 vs 본문 CTA 중 무엇이 더 시작을 유도하는지 보인다.
- **추천 도달률** = `recommendation_generated` ÷ `cta_start_clicked`.

---

## 5. GA4에서 보는 법

1. **실시간 확인**: GA4 → 보고서 → **실시간**. 사이트에서 행동하면 수십 초 내 이벤트가 뜬다.
2. **디버그(파라미터까지)**: **DebugView** (관리 → DebugView). 로컬에서 보려면 `.env.local`에 ID를 넣고 [GA Debugger 확장](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna) 사용.
3. **파라미터를 리포트 차원으로 쓰기**: `source`, `step`, `returning` 같은 커스텀 파라미터는 수집은 되지만, 표/탐색에서 **차원**으로 쪼개려면 등록이 필요하다.
   - 관리 → **맞춤 정의** → **맞춤 측정기준 만들기** → 범위: 이벤트 → 이벤트 매개변수에 `source`/`step`/`returning` 입력.
   - 등록 후 수집되는 데이터부터 적용된다(소급 안 됨). 처음에 한 번 해두면 좋다.
4. **탐색 분석**: 탐색 → **유입경로 탐색 분석(Funnel)**에 위 이벤트들을 순서대로 넣으면 단계별 전환/이탈률을 시각화할 수 있다.

---

## 6. 새 이벤트 추가하는 법

1. **이벤트 이름 등록** — `src/lib/analytics.ts`의 `FunnelEvent` 유니온에 snake_case 이름 추가.
   ```ts
   type FunnelEvent =
     | 'cta_start_clicked'
     | 'onboarding_step_completed'
     | 'recommendation_generated'
     | 'compare_clicked'
     | 'my_new_event';   // ← 추가
   ```
2. **호출** — **클라이언트 컴포넌트**(`'use client'`)의 핸들러에서:
   ```ts
   import { trackEvent } from '@/lib/analytics';
   trackEvent('my_new_event', { some_key: 'value', count: 3 });
   ```
3. **규칙**
   - 파라미터 값은 `string`·`number`·`boolean`만. 중첩 객체 ❌. 이름/키/값 각 255자 이하.
   - 성공/완료 시점에 호출(실패 시 호출 금지)해 깔끔한 전환 수를 유지.
   - 서버 액션/RSC에서는 호출 불가(클라이언트 전용).

---

## 7. 구현 메모 (왜 이렇게 했나)

- 이벤트 전송은 `@next/third-parties`의 `sendGAEvent` 대신 **`window.gtag` 직접 호출**(`src/lib/analytics.ts`).
  App Router에서 `<GoogleAnalytics>`와 `sendGAEvent`가 서로 다른 클라이언트 청크로 분리되면
  `sendGAEvent`가 내부 상태(`currDataLayerName`)를 공유하지 못해 **조용히 no-op** 되는 이슈가 있어서다.
- `gtag`가 아직 로드 전이면 `trackEvent`는 무해하게 건너뛴다(가드 있음).
- 페이지뷰는 GA4가 history 이벤트로 자동 처리하므로 수동 `page_view` 호출은 두지 않았다(중복 방지).

---

## 8. 운영 시 유의

- **개인정보 동의**: GA4는 쿠키/사용자 데이터를 수집한다. 한국 PIPA·GDPR 상 **동의 배너**가 필요할 수 있다(현재 미구현). 운영 전 검토 권장.
- **내부 트래픽 필터**: 본인/팀 접속이 수치를 흐리면 GA4 → 데이터 스트림 → 태그 설정 → 내부 트래픽 정의(IP)로 제외 가능.
- **Speed Insights**: 데이터는 Vercel → 프로젝트 → **Speed Insights → Enable** 토글을 켜야 쌓인다(Hobby 무료). 이벤트와는 무관.
