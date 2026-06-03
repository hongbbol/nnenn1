'use client';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  padding?: number;
  hoverable?: boolean;
};

export function Card({
  children,
  padding = 24,
  hoverable,
  className,
  style,
  ...rest
}: Props) {
  return (
    <div
      {...rest}
      style={{ padding, ...style }}
      className={cn(
        'rounded-[20px] border border-border-soft bg-surface-card shadow-card-rest transition-shadow duration-200',
        hoverable && 'hover:shadow-card-hover',
        rest.onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}
