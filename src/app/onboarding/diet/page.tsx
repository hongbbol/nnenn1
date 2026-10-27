'use client';
import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Chip, Segmented, Small } from '@/components/ui';
import { useGuestStore } from '@/lib/guest-store';
import { DIET_TYPES, FORM_FILTERS, FORM_FILTER_OPTIONS, POPULAR_FOODS } from '@/lib/domain/constants';
import { foodOptionLabel, getFoodOptions, type FoodOption } from '@/lib/recommendation';
import { dietSchema } from '@/lib/domain/schemas';
import type { FoodHistoryChips } from '@/lib/onboarding/food-history';
import { fetchCatFoodHistory, fetchFoodOptions } from '../_actions';
import { OnboardingNav } from '../_nav-buttons';
import { FieldLabel } from '../_field-label';
import { FoodSearchSelect } from './_food-search-select';
import { CurrentFoodInput } from './_current-food-input';

const EMPTY_HISTORY: FoodHistoryChips = { currentFoods: [], excludeCandidates: [] };

export default function DietStep() {
  const cat = useGuestStore((s) => s.cat);
  const setCat = useGuestStore((s) => s.setCat);
  const editingCatId = useGuestStore((s) => s.editingCatId);
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

  // 이 고양이의 기록 칩 — 지난번 입력한 현재 사료 · 추천됐던 사료(제외 후보). 신규 프로필은 빈 칩.
  const [history, setHistory] = useState<FoodHistoryChips>(EMPTY_HISTORY);
  useEffect(() => {
    let alive = true;
    fetchCatFoodHistory(editingCatId).then((h) => {
      if (alive) setHistory(h);
    });
    return () => {
      alive = false;
    };
  }, [editingCatId]);

  // 입력 도중 뒤로 왔을 때: DB 연결 저장분은 current_food_text가 null이라(XOR 저장) 입력칸이
  // 비어 보인다 — 옵션이 로드되면 라벨을 복원한다. (플로우 진입 시에는 현재 사료를 prefill하지 않는다.)
  useEffect(() => {
    if (cat.current_food_id && !cat.current_food_text) {
      const o = foodOptions.find((x) => x.id === cat.current_food_id);
      if (o) setCat({ current_food_text: foodOptionLabel(o) });
    }
  }, [foodOptions, cat.current_food_id, cat.current_food_text, setCat]);

  const formFilter = cat.form_filter ?? '전체';
  const parsed = dietSchema.safeParse({
    diet_type: cat.diet_type ?? '',
    form_filter: formFilter,
    current_food_text: cat.current_food_text ?? '',
    exclude_food_ids: excluded,
  });
  const currentFoodMissing = !(cat.current_food_text ?? '').trim();

  // 현재 사료 빠른 선택: 이 고양이에게 지난번 입력했던 사료가 있으면 그것을, 없으면 일반 예시를.
  const currentFoodChips =
    history.currentFoods.length > 0
      ? history.currentFoods
      : POPULAR_FOODS.map((s) => ({ label: s, foodId: null as string | null }));
  // 제외 후보: 이미 제외한 것은 뺀다(아래 선택 칩으로 이동).
  const excludeChips = history.excludeCandidates.filter((o) => !excluded.includes(o.id));

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
          hint={<Small>{FORM_FILTER_OPTIONS.find((o) => o.id === formFilter)?.desc}</Small>}
        >
          추천 범위
        </FieldLabel>
        <Segmented
          options={FORM_FILTERS}
          value={formFilter}
          onChange={(v) => setCat({ form_filter: v })}
        />
      </div>

      <div>
        <FieldLabel
          hint={
            currentFoodMissing ? (
              <Small className="text-brand-danger" muted={false}>
                필수
              </Small>
            ) : (
              <span className="inline-flex items-center gap-1 text-[13px] text-brand-green">
                <Check size={12} /> 입력됨
              </span>
            )
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
        {currentFoodMissing && (
          <Small className="mt-2 text-brand-danger" muted={false} role="alert">
            추천 뒤 사료가 바뀌었을 수 있어 매번 새로 여쭤봐요. 지금 먹이는 사료를 입력해야 다음으로
            넘어갈 수 있어요.
          </Small>
        )}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {history.currentFoods.length > 0 && (
            <Small className="w-full text-[12px]">지난번에 입력한 사료</Small>
          )}
          {currentFoodChips.map((c) => (
            <Chip
              key={`${c.foodId ?? 'text'}:${c.label}`}
              variant="soft"
              size="sm"
              onClick={() => setCat({ current_food_text: c.label, current_food_id: c.foodId })}
            >
              {c.label}
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
        {excludeChips.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Small className="w-full text-[12px]">
              지난 추천·입력 기록에서 고르기 — 누르면 제외 목록에 들어가요
            </Small>
            {excludeChips.map((o) => (
              <Chip
                key={o.id}
                variant="soft"
                size="sm"
                onClick={() => setCat({ exclude_food_ids: [...excluded, o.id] })}
                aria-label={`${o.brand} ${o.productName} 제외에 추가`}
              >
                {o.brand} · {o.productName}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <OnboardingNav step={1} canProceed={parsed.success} />
    </div>
  );
}
