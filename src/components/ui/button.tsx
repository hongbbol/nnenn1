'use client';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'dark' | 'blue' | 'ghost' | 'soft' | 'text';
type Size = 'lg' | 'md' | 'sm';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  full?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
};

const sizeCls: Record<Size, string> = {
  lg: 'h-[52px] px-6 text-[15.5px] rounded-[14px]',
  md: 'h-[42px] px-[18px] text-[14px] rounded-[12px]',
  sm: 'h-[34px] px-[14px] text-[13px] rounded-[10px]',
};

const variantCls: Record<Variant, string> = {
  primary:
    'bg-brand-primary text-white border border-brand-primary shadow-btn-primary hover:bg-brand-primary-strong',
  dark: 'bg-brand-text text-white border border-brand-text hover:brightness-110',
  blue: 'bg-brand-blue text-brand-blue-deep border border-brand-blue hover:brightness-[1.02]',
  ghost:
    'bg-surface-card text-brand-text border border-border-soft hover:border-border-strong',
  soft: 'bg-surface-1 text-brand-text border border-transparent hover:bg-surface-2',
  text: 'bg-transparent text-brand-sub border-none shadow-none hover:text-brand-text',
};

export function Button({
  children,
  variant = 'primary',
  size = 'lg',
  full,
  leading,
  trailing,
  disabled,
  className,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 active:scale-[0.985]',
        sizeCls[size],
        variantCls[variant],
        full && 'w-full',
        disabled && 'cursor-not-allowed opacity-45',
        className,
      )}
    >
      {leading}
      {children}
      {trailing}
    </button>
  );
}
