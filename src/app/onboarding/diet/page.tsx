'use client';
import { Check } from 'lucide-react';
import { Chip, Input, Segmented, Small } from '@/components/ui';
import { useGuestStore } from '@/lib/guest-store';
import { DIET_TYPES, POPULAR_FOODS } from '@/lib/domain/constants';
import { getFoodOptions } from '@/lib/recommendation';
import { dietSchema } from '@/lib/domain/schemas';
import { OnboardingNav } from '../_nav-buttons';
import { FieldLabel } from '../_field-label';
import { FoodSearchSelect } from './_food-search-select';

// 검색용 옵션 — 현재 SEED_FOODS 파생(소스 비의존, 향후 DB 교체 가능).
const FOOD_OPTIONS = getFoodOptions();

export default function DietStep() {
  const cat = useGuestStore((s) => s.cat);
  const setCat = useGuestStore((s) => s.setCat);
  const excluded = cat.exclude_food_ids ?? [];

  const parsed = dietSchema.safeParse({
    diet_type: cat.diet_type ?? '',
    current_food_text: cat.current_food_text ?? '',
    exclude_food_ids: excluded,
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
        <FieldLabel hint={<Small>검색해서 선택</Small>}>제외하고 싶은 사료</FieldLabel>
        <FoodSearchSelect
          options={FOOD_OPTIONS}
          selectedIds={excluded}
          onChange={(ids) => setCat({ exclude_food_ids: ids })}
        />
      </div>

      <OnboardingNav step={1} canProceed={parsed.success} />
    </div>
  );
}
