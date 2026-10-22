'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toRecInput } from '@/lib/recommendation/engine';
import { formFilterWarnings } from '@/lib/recommendation/form-filter-warnings';
import { useGuestStore } from '@/lib/guest-store';
import { useSaveProfile } from '@/lib/onboarding/use-save-profile';
import { trackEvent } from '@/lib/analytics';
import { ONBOARDING_STEPS } from './_steps';

type Props = {
  /** 0-based step index. */
  step: number;
  canProceed: boolean;
  onNext?: () => void | Promise<void>;
};

export function OnboardingNav({ step, canProceed, onNext }: Props) {
  const router = useRouter();
  const editMode = useGuestStore((s) => s.editMode);
  const cat = useGuestStore((s) => s.cat);
  const saveProfile = useSaveProfile();
  const isLast = step >= ONBOARDING_STEPS.length - 1;
  const editing = editMode;
  const [completing, setCompleting] = useState(false);
  const [completeErr, setCompleteErr] = useState<string | null>(null);
  // '추천 범위: 건식만' 경고 — 마지막 단계의 '추천 받기' 전에 확인 창으로 먼저 보여준다(2026-10-22 사용자 결정).
  // '알고있어요' → 저장·추천 진행, '다시 선택하기' → 식단 단계로 돌아가 추천 범위를 바꿀 수 있게.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const recInput = isLast ? toRecInput(cat) : null;
  const warnings = recInput ? formFilterWarnings(recInput) : [];

  const handleBack = useCallback(() => {
    if (step === 0) router.push('/');
    else router.push(ONBOARDING_STEPS[step - 1].path);
  }, [step, router]);

  const proceed = useCallback(async () => {
    if (!canProceed) return;
    if (onNext) await onNext(); // goal 단계 저장 실패 시 throw → 아래 계측·이동 미실행
    trackEvent('onboarding_step_completed', { step: ONBOARDING_STEPS[step].id });
    if (isLast) {
      trackEvent('recommendation_generated');
      router.push('/recommendations');
    } else {
      router.push(ONBOARDING_STEPS[step + 1].path);
    }
  }, [canProceed, isLast, onNext, router, step]);

  // 마지막 단계 + 경고 있음 → 확인 창 먼저. 그 외엔 바로 진행.
  const handleNext = useCallback(async () => {
    if (!canProceed) return;
    if (isLast && warnings.length > 0) {
      setConfirmOpen(true);
      return;
    }
    await proceed();
  }, [canProceed, isLast, warnings.length, proceed]);

  const handleConfirmProceed = useCallback(async () => {
    setConfirmOpen(false);
    try {
      await proceed();
    } catch {
      // 저장 실패 메시지는 goal 단계(onNext)가 표시한다.
    }
  }, [proceed]);

  const handleReselect = useCallback(() => {
    setConfirmOpen(false);
    router.push('/onboarding/diet');
  }, [router]);

  // 수정 모드 "완료" — 어느 단계에서든 현재 입력을 저장하고 마이페이지로. (신규 온보딩에는 없음)
  const handleComplete = useCallback(async () => {
    if (!canProceed || completing) return;
    setCompleteErr(null);
    setCompleting(true);
    try {
      const res = await saveProfile();
      if (!res.ok) {
        setCompleteErr(res.error);
        return;
      }
      router.push('/mypage');
    } catch (e) {
      setCompleteErr(
        e instanceof Error ? e.message : '저장 중 문제가 생겼어요. 다시 시도해주세요.',
      );
    } finally {
      setCompleting(false);
    }
  }, [canProceed, completing, saveProfile, router]);

  // 수정 모드에선 "다음/추천 받기"를 노출하지 않는다 — 기초정보만 고치고 "완료"로 저장.
  // (식단·건강·목표는 '사료찾기' 흐름에서 입력·수정된다)
  const showNext = !editing;

  // dev-plan §2.4 — Enter 키로 다음 진행. textarea에서는 줄바꿈이므로 input/select에서만.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON' || t.tagName === 'A') return;
      if (!canProceed) return;
      e.preventDefault();
      if (showNext) void handleNext();
      else void handleComplete();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [canProceed, showNext, handleNext, handleComplete]);

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        title="추천 범위를 '건식만'으로 두면"
        confirmLabel="알고있어요"
        cancelLabel="다시 선택하기"
        onConfirm={() => void handleConfirmProceed()}
        onCancel={handleReselect}
        onClose={() => setConfirmOpen(false)}
      >
        {warnings.map((w, i) => (
          <p key={i} className="rounded-[12px] bg-brand-blue px-4 py-3 text-brand-blue-deep">
            {w}
          </p>
        ))}
        <p className="text-[12.5px] text-brand-sub">
          &lsquo;다시 선택하기&rsquo;를 누르면 식단 단계로 돌아가 추천 범위를 바꿀 수 있어요.
        </p>
      </ConfirmDialog>
      <div className="sticky bottom-0 mt-12 bg-gradient-to-b from-transparent via-brand-bg/80 to-brand-bg px-1 pb-7 pt-6">
        <div className="mx-auto flex max-w-[720px] flex-col gap-2">
          {completeErr && (
            <div className="rounded-[12px] bg-brand-danger-soft px-4 py-3 text-[13px] font-medium text-brand-danger">
              {completeErr}
            </div>
          )}
          <div className="flex justify-between gap-3">
            <Button variant="ghost" leading={<ArrowLeft size={16} />} onClick={handleBack}>
              이전
            </Button>
            <div className="flex gap-3">
              {editing && (
                <Button
                  variant="primary"
                  leading={<Check size={16} />}
                  disabled={!canProceed || completing}
                  onClick={() => void handleComplete()}
                >
                  {completing ? '저장 중…' : '완료'}
                </Button>
              )}
              {showNext && (
                <Button
                  disabled={!canProceed}
                  trailing={<ArrowRight size={16} />}
                  onClick={() => void handleNext()}
                >
                  {isLast ? '추천 받기' : '다음'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
