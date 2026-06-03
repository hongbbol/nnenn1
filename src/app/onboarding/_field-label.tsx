import type { ReactNode } from 'react';

export function FieldLabel({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between">
      <div className="text-[14px] font-semibold tracking-[-0.005em] text-brand-text">
        {children}
      </div>
      {hint}
    </div>
  );
}
