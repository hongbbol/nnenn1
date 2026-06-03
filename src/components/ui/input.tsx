'use client';
import { useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Size = 'lg' | 'md';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  suffix?: ReactNode;
  size?: Size;
};

const heightCls: Record<Size, string> = {
  lg: 'h-[52px]',
  md: 'h-[44px]',
};

export function Input({
  suffix,
  size = 'lg',
  className,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [focus, setFocus] = useState(false);
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-[14px] border-[1.5px] bg-surface-card px-4 transition-colors',
        heightCls[size],
        focus ? 'border-brand-text' : 'border-border-soft',
        className,
      )}
    >
      <input
        {...rest}
        onFocus={(e) => {
          setFocus(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          onBlur?.(e);
        }}
        className="min-w-0 flex-1 border-none bg-transparent text-[16px] font-medium text-brand-text outline-none placeholder:text-brand-faint"
      />
      {suffix && (
        <span className="text-[14px] font-medium text-brand-sub">{suffix}</span>
      )}
    </div>
  );
}
