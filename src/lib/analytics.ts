/** 완그릇 퍼널 커스텀 이벤트 이름 (GA4, snake_case). */
type FunnelEvent =
  | 'cta_start_clicked'
  | 'onboarding_step_completed'
  | 'recommendation_generated'
  | 'compare_clicked';

/**
 * GA4 커스텀 이벤트 전송. 클라이언트 컴포넌트의 핸들러에서만 호출한다.
 *
 * 루트 레이아웃의 <GoogleAnalytics />가 주입하는 전역 gtag를 직접 호출한다.
 * @next/third-parties의 sendGAEvent는 모듈 스코프 상태(currDataLayerName)에 의존하는데
 * App Router에서 컴포넌트와 헬퍼가 서로 다른 클라이언트 청크로 분리되면 그 상태가 공유되지
 * 않아 조용히 no-op이 되는 이슈가 있다. gtag 직접 호출은 그 의존성이 없어 안정적이다.
 *
 * gtag가 아직 로드되지 않았으면(스크립트 로드 전) 무해하게 건너뛴다.
 * 파라미터 값은 string·number·boolean만 허용한다(GA4 권장, 중첩 객체 불가).
 */
export function trackEvent(
  name: FunnelEvent,
  params?: Record<string, string | number | boolean>,
) {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== 'function') return;
  gtag('event', name, params ?? {});
}
