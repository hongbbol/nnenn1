'use client';
import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { ONBOARDING_STEPS } from './_steps';

type Props = {
  /** 0-based step index. */
  step: number;
  canProceed: boolean;
  onNext?: () => void | Promise<void>;
};

export function OnboardingNav({ step, canProceed, onNext }: Props) {
  const router = useRouter();
  const isLast = step >= ONBOARDING_STEPS.length - 1;

  const handleBack = useCallback(() => {
    if (step === 0) router.push('/');
    else router.push(ONBOARDING_STEPS[step - 1].path);
  }, [step, router]);

  const handleNext = useCallback(async () => {
    if (!canProceed) return;
    if (onNext) await onNext();
    if (isLast) router.push('/recommendations');
    else router.push(ONBOARDING_STEPS[step + 1].path);
  }, [canProceed, isLast, onNext, router, step]);

  // dev-plan §2.4 — Enter 키로 다음 step. textarea(<></>)에서는 Enter가 줄바꿈이므로 input/select에서만.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      // 텍스트 영역·버튼·링크에서는 기본 동작 보존
      if (t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON' || t.tagName === 'A') return;
      if (canProceed) {
        e.preventDefault();
        void handleNext();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [canProceed, handleNext]);

  return (
    <div className="sticky bottom-0 mt-12 bg-gradient-to-b from-transparent via-brand-bg/80 to-brand-bg px-1 pb-7 pt-6">
      <div className="mx-auto flex max-w-[720px] justify-between gap-3">
        <Button variant="ghost" leading={<ArrowLeft size={16} />} onClick={handleBack}>
          이전
        </Button>
        <Button
          disabled={!canProceed}
          trailing={<ArrowRight size={16} />}
          onClick={() => void handleNext()}
        >
          {isLast ? '추천 받기' : '다음'}
        </Button>
      </div>
    </div>
  );
}
