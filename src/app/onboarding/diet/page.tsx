'use client';
import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Chip, Segmented, Small } from '@/components/ui';
import { useGuestStore } from '@/lib/guest-store';
import { DIET_TYPES, POPULAR_FOODS } from '@/lib/domain/constants';
import { foodOptionLabel, getFoodOptions, type FoodOption } from '@/lib/recommendation';
import { dietSchema } from '@/lib/domain/schemas';
import { fetchFoodOptions } from '../_actions';
import { OnboardingNav } from '../_nav-buttons';
import { FieldLabel } from '../_field-label';
import { FoodSearchSelect } from './_food-search-select';
import { CurrentFoodInput } from './_current-food-input';

export default function DietStep() {
  const cat = useGuestStore((s) => s.cat);
  const setCat = useGuestStore((s) => s.setCat);
  const excluded = cat.exclude_food_ids ?? [];

  // 검색용 옵션 — DB foods(kr_available) 서버 액션으로 로드. 도착 전엔 시드 파생으로 시작.
  const [foodOptions, setFoodOptions] = useState<FoodOption[]>(() => getFoodOptions());
  useEffect(() => {
    let alive = true;
    fetchFoodOptions().then((opts) => {
      if (alive && opts.length > 0) setFoodOptions(opts);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 재온보딩 prefill: DB 연결 저장분은 current_food_text가 null이라(XOR 저장) 입력칸이
  // 비어 보인다 — 옵션이 로드되면 라벨을 복원한다.
  useEffect(() => {
    if (cat.current_food_id && !cat.current_food_text) {
      const o = foodOptions.find((x) => x.id === cat.current_food_id);
      if (o) setCat({ current_food_text: foodOptionLabel(o) });
    }
  }, [foodOptions, cat.current_food_id, cat.current_food_text, setCat]);

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
        <CurrentFoodInput
          options={foodOptions}
          text={cat.current_food_text ?? ''}
          foodId={cat.current_food_id ?? null}
          onChange={({ text, foodId }) =>
            setCat({ current_food_text: text, current_food_id: foodId })
          }
        />
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {POPULAR_FOODS.map((s) => (
            <Chip
              key={s}
              variant="soft"
              size="sm"
              onClick={() => setCat({ current_food_text: s, current_food_id: null })}
            >
              {s}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel hint={<Small>검색해서 선택</Small>}>제외하고 싶은 사료</FieldLabel>
        <FoodSearchSelect
          options={foodOptions}
          selectedIds={excluded}
          onChange={(ids) => setCat({ exclude_food_ids: ids })}
        />
      </div>

      <OnboardingNav step={1} canProceed={parsed.success} />
    </div>
  );
}
