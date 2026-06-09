'use client';
import { RotateCcw } from 'lucide-react';
import { useGuestStore } from '@/lib/guest-store';

/**
 * "제거(입력 초기화)" — 편집 중인 프로필은 유지한 채 폼만 비운다(저장 시 그 프로필 덮어쓰기).
 * 누르기 전 경고. 편집 모드(editingCatId 있음)에서만 표시한다 — 신규 입력엔 비울 저장본이 없으므로.
 */
export function FormResetButton() {
  const editingCatId = useGuestStore((s) => s.editingCatId);
  const resetCat = useGuestStore((s) => s.resetCat);

  if (!editingCatId) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (
          !window.confirm('저장된 프로필 내용이 변경돼요. 입력을 비우고 다시 작성할까요?')
        ) {
          return;
        }
        resetCat({ keepEditingId: true });
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] px-2 py-1.5 text-[13px] font-medium text-brand-sub transition-colors hover:text-brand-text"
    >
      <RotateCcw size={14} />
      제거(입력 초기화)
    </button>
  );
}
