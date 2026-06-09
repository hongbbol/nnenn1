'use client';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui';
import { cn } from '@/lib/cn';
import { CAT_BREEDS } from '@/lib/domain/constants';

const CUSTOM = '__custom__';

/**
 * 묘종 입력 — 주요 묘종 드롭다운 + "기타(직접 입력)" 선택 시 자유 입력칸 노출.
 * 저장 값은 묘종 문자열 하나. 목록에 없는 기존 값이 들어오면 자동으로 직접 입력 모드.
 */
export function BreedField({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
}) {
  const isKnown =
    value != null && value !== '' && (CAT_BREEDS as readonly string[]).includes(value);
  const [custom, setCustom] = useState(value != null && value !== '' && !isKnown);

  const selectValue = custom ? CUSTOM : isKnown ? (value as string) : '';

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <select
          value={selectValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === CUSTOM) {
              setCustom(true);
              onChange('');
            } else {
              setCustom(false);
              onChange(v);
            }
          }}
          className={cn(
            'h-[52px] w-full appearance-none rounded-[14px] border-[1.5px] border-border-soft bg-surface-card px-4 pr-10 text-[16px] font-medium outline-none transition-colors focus:border-brand-text',
            selectValue === '' ? 'text-brand-faint' : 'text-brand-text',
          )}
        >
          <option value="" disabled>
            묘종 선택
          </option>
          {CAT_BREEDS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
          <option value={CUSTOM}>기타 (직접 입력)</option>
        </select>
        <ChevronDown
          size={18}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-brand-faint"
        />
      </div>
      {custom && (
        <Input
          value={value ?? ''}
          placeholder="묘종을 입력해주세요"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
