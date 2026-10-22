'use client';
import { useEffect, type ReactNode } from 'react';
import { Button } from './button';

/**
 * 확인 모달 — 본문 + 확인/취소 2버튼. Escape·배경 클릭은 onClose(그냥 닫기, 기본 = onCancel).
 * 열릴 때 확인 버튼에 자동 포커스(autoFocus), 닫히면 페이지 이동이 뒤따르므로 포커스 복원은 생략.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Escape·배경 클릭. 생략 시 onCancel. 취소 버튼이 페이지 이동을 동반할 때 분리해서 쓴다. */
  onClose?: () => void;
  busy?: boolean;
}) {
  const close = onClose ?? onCancel;
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-[480px] rounded-[20px] bg-surface-card p-6 shadow-card-rest"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-dialog-title"
          className="text-[18px] font-bold leading-[1.3] text-brand-text"
        >
          {title}
        </h2>
        <div className="mt-3 flex flex-col gap-2.5 text-[13.5px] leading-[1.6] text-brand-text">
          {children}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button autoFocus variant="primary" onClick={onConfirm} disabled={busy}>
            {busy ? '잠시만요…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
