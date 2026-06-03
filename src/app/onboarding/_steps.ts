import type { Step } from '@/components/ui/stepper';

export const ONBOARDING_STEPS: ReadonlyArray<Step & { path: string; title: string; sub: string }> = [
  {
    id: 'basics',
    label: '기본 정보',
    path: '/onboarding/basics',
    title: '아이의 기본 정보를 알려주세요',
    sub: '이름·사진·나이·체중부터 시작해요.',
  },
  {
    id: 'diet',
    label: '현재 식단',
    path: '/onboarding/diet',
    title: '지금 어떤 사료를 먹고 있나요?',
    sub: '비교를 위해 알려주세요.',
  },
  {
    id: 'health',
    label: '건강 상태',
    path: '/onboarding/health',
    title: '건강 상태가 어때요?',
    sub: '진단 받았거나 관찰된 증상을 골라주세요.',
  },
  {
    id: 'goal',
    label: '목표',
    path: '/onboarding/goal',
    title: '바라는 목표가 있어요?',
    sub: '추천에 가장 큰 영향을 줘요.',
  },
];

export function stepIndexByPath(pathname: string): number {
  const i = ONBOARDING_STEPS.findIndex((s) => pathname.startsWith(s.path));
  return i < 0 ? 0 : i;
}
