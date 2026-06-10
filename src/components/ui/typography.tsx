import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Props = HTMLAttributes<HTMLDivElement> & { children: ReactNode };

export function H1({ className, children, ...rest }: Props) {
  return (
    <div
      {...rest}
      className={cn(
        'text-[27px] font-bold leading-[1.25] tracking-[-0.025em] text-brand-text md:text-[48px] md:leading-[1.1]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function H2({ className, children, ...rest }: Props) {
  return (
    <div
      {...rest}
      className={cn(
        'text-[21px] font-bold leading-[1.25] tracking-[-0.02em] text-brand-text md:text-[30px] md:leading-[1.2]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function H3({ className, children, ...rest }: Props) {
  return (
    <div
      {...rest}
      className={cn(
        'text-[17px] font-bold leading-[1.3] tracking-[-0.01em] text-brand-text md:text-[20px]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function H4({ className, children, ...rest }: Props) {
  return (
    <div
      {...rest}
      className={cn(
        'text-[16px] font-semibold leading-[1.35] text-brand-text md:text-[18px]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Body({
  className,
  children,
  muted,
  ...rest
}: Props & { muted?: boolean }) {
  return (
    <div
      {...rest}
      className={cn(
        'text-[15px] font-normal leading-[1.6]',
        muted ? 'text-brand-sub' : 'text-brand-text',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Small({
  className,
  children,
  muted = true,
  ...rest
}: Props & { muted?: boolean }) {
  return (
    <div
      {...rest}
      className={cn(
        'text-[13px] font-medium leading-[1.4]',
        muted ? 'text-brand-sub' : 'text-brand-text',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Caption({ className, children, ...rest }: Props) {
  return (
    <div
      {...rest}
      className={cn(
        'text-[12px] font-semibold uppercase tracking-[0.06em] text-brand-sub',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Mono({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return (
    <span {...rest} className={cn('font-mono font-mono-num', className)}>
      {children}
    </span>
  );
}
