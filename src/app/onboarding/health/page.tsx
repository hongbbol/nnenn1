'use client';
import { Check, Info } from 'lucide-react';
import { Body, Card } from '@/components/ui';
import { useGuestStore } from '@/lib/guest-store';
import { HEALTH_OPTIONS } from '@/lib/domain/constants';
import { healthSchema } from '@/lib/domain/schemas';
import { cn } from '@/lib/cn';
import { OnboardingNav } from '../_nav-buttons';
import { FieldLabel } from '../_field-label';

export default function HealthStep() {
  const cat = useGuestStore((s) => s.cat);
  const setCat = useGuestStore((s) => s.setCat);
  const conditions = cat.health_conditions ?? [];

  const parsed = healthSchema.safeParse({ health_conditions: conditions });

  function toggle(id: string) {
    const opt = HEALTH_OPTIONS.find((o) => o.id === id);
    if (!opt) return;
    let next: string[];
    if (conditions.includes(id)) {
      next = conditions.filter((x) => x !== id);
    } else if (opt.exclusive) {
      next = [id];
    } else {
      next = conditions
        .filter((x) => {
          const cur = HEALTH_OPTIONS.find((o) => o.id === x);
          if (!cur) return true;
          if (cur.exclusive) return false;
          if (opt.group && cur.group === opt.group) return false;
          return true;
        })
        .concat(id);
    }
    setCat({ health_conditions: next });
  }

  return (
    <div className="flex flex-col gap-5">
      <FieldLabel
        hint={<span className="text-[13px] text-brand-sub">중복 가능 · 진단 없으면 비워두세요</span>}
      >
        진단 또는 관찰된 증상
      </FieldLabel>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {HEALTH_OPTIONS.map((c) => {
          const sel = conditions.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={cn(
                'flex items-center gap-3 rounded-[12px] border-[1.5px] p-3.5 text-left transition-colors',
                sel
                  ? 'border-brand-blue-deep bg-brand-blue'
                  : 'border-border-soft bg-surface-card hover:border-border-strong',
              )}
            >
              <div
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px]',
                  sel
                    ? 'border-brand-blue-deep bg-brand-blue-deep text-white'
                    : 'border-border-strong bg-transparent text-transparent',
                )}
              >
                {sel && <Check size={12} strokeWidth={3} />}
              </div>
              <div>
                <div className="text-[14px] font-semibold text-brand-text">{c.id}</div>
                {c.desc && (
                  <div className="mt-0.5 text-[12px] text-brand-sub">{c.desc}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <Card padding={14} className="!border-transparent !bg-surface-1">
        <div className="flex gap-2.5 text-brand-blue-deep">
          <div className="pt-0.5">
            <Info size={14} />
          </div>
          <Body className="!text-[13px] text-brand-text">
            완그릇 추천은 보조 도구예요. 진단·치료는 수의사와 상의하세요.
          </Body>
        </div>
      </Card>

      {!parsed.success && (
        <div className="rounded-[12px] border border-brand-danger/30 bg-brand-danger-soft/60 px-3.5 py-2.5 text-[13px] text-brand-danger">
          {parsed.error.issues[0]?.message ?? '입력을 확인해주세요'}
        </div>
      )}

      <OnboardingNav step={2} canProceed={parsed.success} />
    </div>
  );
}
