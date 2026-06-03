'use client';
import { cn } from '@/lib/cn';

type Size = 'lg' | 'md';

type Props<T extends string> = {
  options: ReadonlyArray<T>;
  value: T | '';
  onChange: (v: T) => void;
  size?: Size;
};

const innerH: Record<Size, string> = {
  lg: 'h-[52px]',
  md: 'h-[44px]',
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: Props<T>) {
  return (
    <div
      className={cn(
        'inline-flex gap-1 rounded-[12px] bg-surface-1 p-1',
        size === 'lg' ? 'h-[60px]' : 'h-[52px]',
      )}
    >
      {options.map((opt) => {
        const sel = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              'min-w-[80px] flex-[1_0_auto] rounded-[9px] px-4 text-[14px] transition-all',
              innerH[size],
              sel
                ? 'bg-surface-card font-semibold text-brand-text shadow-card-rest'
                : 'bg-transparent font-medium text-brand-sub hover:text-brand-text',
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
