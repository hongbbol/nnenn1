import { Check } from 'lucide-react';
import { Fragment } from 'react';
import { cn } from '@/lib/cn';

export type Step = { id: string; label: string };

type Props = {
  current: number;
  steps: ReadonlyArray<Step>;
};

export function Stepper({ current, steps }: Props) {
  return (
    <div className="flex w-full items-center gap-2">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <Fragment key={s.id}>
            <div
              className={cn(
                'flex items-center gap-2 transition-opacity',
                active || done ? 'opacity-100' : 'opacity-50',
              )}
            >
              <div
                className={cn(
                  'flex h-[26px] w-[26px] items-center justify-center rounded-full text-[12px] font-bold',
                  active || done
                    ? 'bg-brand-text text-white'
                    : 'bg-border-soft text-brand-sub',
                )}
              >
                {done ? <Check size={12} strokeWidth={2.5} /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-[13px]',
                  active
                    ? 'font-semibold text-brand-text'
                    : 'font-medium text-brand-sub',
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 rounded transition-colors duration-300',
                  i < current ? 'bg-brand-text' : 'bg-border-soft',
                )}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
