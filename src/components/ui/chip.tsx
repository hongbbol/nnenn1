'use client';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'default' | 'blue' | 'yellow' | 'soft' | 'ok' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  selected?: boolean;
  leading?: ReactNode;
};

const sizeCls: Record<Size, string> = {
  sm: 'text-[12px] px-[9px] py-[5px] h-6 rounded-[7px]',
  md: 'text-[13px] px-3 py-[7px] h-[30px] rounded-[9px]',
  lg: 'text-[14px] px-[14px] py-[10px] h-[38px] rounded-[11px]',
};

function defaultCls(selected?: boolean) {
  return selected
    ? 'bg-brand-text text-white border-brand-text'
    : 'bg-surface-card text-brand-text border-border-soft hover:border-border-strong';
}

const variantCls: Record<Exclude<Variant, 'default'>, string> = {
  blue: 'bg-brand-blue text-brand-blue-deep border-transparent',
  yellow: 'bg-brand-yellow-soft text-brand-yellow-dark border-transparent',
  soft: 'bg-surface-1 text-brand-sub border-transparent',
  ok: 'bg-brand-green-soft text-brand-green border-transparent',
  danger: 'bg-brand-danger-soft text-brand-danger border-transparent',
};

export function Chip({
  children,
  variant = 'default',
  size = 'md',
  selected,
  leading,
  className,
  onClick,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      onClick={onClick}
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap border font-medium transition-colors',
        sizeCls[size],
        variant === 'default' ? defaultCls(selected) : variantCls[variant],
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {leading}
      {children}
    </button>
  );
}
