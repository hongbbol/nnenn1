import { CatAvatar } from '@/components/ui';
import { EditProfileButton } from './edit-profile-button';
import { catRowToGuestCat } from '@/lib/domain/cat-mapping';
import type { CatRow } from '@/lib/domain/types';

/** 마이페이지 상단 — 내 아이 프로필 요약 카드 + "수정"(재온보딩). */
export function ProfileCard({
  cat,
  imageSrc,
}: {
  cat: CatRow;
  imageSrc: string | null;
}) {
  const chips = [
    `${cat.age_label} (${cat.age_group})`,
    `${cat.weight_kg}kg`,
    `중성화 ${cat.neutered_status}`,
    cat.diet_type,
    cat.goal,
  ];
  const conditions = (cat.health_conditions ?? []).filter((c) => c !== '질병 없음');
  const avoid = cat.avoid_ingredients ?? [];

  return (
    <div className="rounded-[18px] border border-border-soft bg-surface-card p-6">
      <div className="flex items-center gap-4">
        <CatAvatar size={64} name={cat.name} imageSrc={imageSrc} />
        <div className="min-w-0 flex-1">
          <div className="text-[20px] font-bold text-brand-text">{cat.name}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span
                key={c}
                className="rounded-md bg-surface-1 px-2 py-[3px] text-[12px] font-medium text-brand-sub"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
        <EditProfileButton cat={catRowToGuestCat(cat)} variant="ghost" label="수정" />
      </div>

      {(conditions.length > 0 || avoid.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border-soft pt-4">
          {conditions.map((c) => (
            <span
              key={c}
              className="rounded-md bg-brand-blue px-2 py-[3px] text-[12px] font-medium text-brand-blue-deep"
            >
              {c}
            </span>
          ))}
          {avoid.map((a) => (
            <span
              key={a}
              className="rounded-md bg-brand-danger-soft px-2 py-[3px] text-[12px] font-medium text-brand-danger"
            >
              {a} 제외
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
