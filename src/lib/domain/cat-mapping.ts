import type { CatRow, GuestCat } from './types';

/**
 * DB의 CatRow를 온보딩 입력 버퍼(GuestCat)로 변환한다. 재온보딩("수정") 시
 * 폼을 기존 값으로 채우기 위해 사용. hero_image_preview(dataURL)는 DB에 없으므로
 * 비운다 — 기존 사진은 hero_image_path로 유지되고, 새로 올릴 때만 교체된다.
 */
export function catRowToGuestCat(cat: CatRow): GuestCat {
  return {
    name: cat.name,
    sex: cat.sex ?? null,
    breed: cat.breed ?? null,
    birth_year: cat.birth_year,
    birth_month: cat.birth_month,
    birth_day: cat.birth_day,
    weight_kg: cat.weight_kg,
    neutered_status: cat.neutered_status,
    diet_type: cat.diet_type,
    current_food_id: cat.current_food_id ?? null,
    current_food_text: cat.current_food_text ?? null,
    health_conditions: cat.health_conditions ?? [],
    // '피하고 싶은 성분' UI 제거 — 수정(재온보딩) 시 DB의 레거시 stale 값을 다시 폼으로
    // 끌어오지 않는다. (컬럼·엔진 로직은 보존, 추후 '알러지' 질환 옵션에서 재사용)
    avoid_ingredients: [],
    exclude_food_ids: cat.exclude_food_ids ?? [],
    goal: cat.goal,
  };
}
