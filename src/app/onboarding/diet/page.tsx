'use client';
import { Check } from 'lucide-react';
import { Chip, Input, Segmented, Small } from '@/components/ui';
import { useGuestStore } from '@/lib/guest-store';
import {
  AVOID_INGREDIENTS_POPULAR,
  DIET_TYPES,
  POPULAR_FOODS,
} from '@/lib/domain/constants';
import { dietSchema } from '@/lib/domain/schemas';
import { OnboardingNav } from '../_nav-buttons';
import { FieldLabel } from '../_field-label';

export default function DietStep() {
  const cat = useGuestStore((s) => s.cat);
  const setCat = useGuestStore((s) => s.setCat);
  const avoid = cat.avoid_ingredients ?? [];

  const parsed = dietSchema.safeParse({
    diet_type: cat.diet_type ?? '',
    current_food_text: cat.current_food_text ?? '',
    avoid_ingredients: avoid,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <FieldLabel>주로 먹는 식단</FieldLabel>
        <Segmented
          options={DIET_TYPES}
          value={cat.diet_type ?? ''}
          onChange={(v) => setCat({ diet_type: v })}
        />
      </div>

      <div>
        <FieldLabel
          hint={
            cat.current_food_text ? (
              <span className="inline-flex items-center gap-1 text-[13px] text-brand-green">
                <Check size={12} /> 입력됨
              </span>
            ) : null
          }
        >
          지금 먹이는 사료
        </FieldLabel>
        <Input
          value={cat.current_food_text ?? ''}
          placeholder="브랜드 또는 제품명"
          onChange={(e) => setCat({ current_food_text: e.target.value })}
        />
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {POPULAR_FOODS.map((s) => (
            <Chip
              key={s}
              variant="soft"
              size="sm"
              onClick={() => setCat({ current_food_text: s })}
            >
              {s}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel hint={<Small>중복 가능</Small>}>피하고 싶은 성분</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {AVOID_INGREDIENTS_POPULAR.map((ing) => {
            const sel = avoid.includes(ing);
            return (
              <Chip
                key={ing}
                selected={sel}
                onClick={() =>
                  setCat({
                    avoid_ingredients: sel ? avoid.filter((x) => x !== ing) : [...avoid, ing],
                  })
                }
              >
                {ing}
              </Chip>
            );
          })}
        </div>
      </div>

      <OnboardingNav step={1} canProceed={parsed.success} />
    </div>
  );
}
