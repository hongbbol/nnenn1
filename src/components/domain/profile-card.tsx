import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { CatAvatar } from '@/components/ui';
import { EditProfileButton } from './edit-profile-button';
import { DeleteProfileButton } from './delete-profile-button';
import { catRowToGuestCat } from '@/lib/domain/cat-mapping';
import { ageGroupFromBirthYear } from '@/lib/domain/constants';
import type { CatRow } from '@/lib/domain/types';

/** 마이페이지 — 내 아이 프로필 요약 카드 + "수정"(재온보딩) / "삭제" / "추천 보기". */
export function ProfileCard({
  cat,
  imageSrc,
}: {
  cat: CatRow;
  imageSrc: string | null;
}) {
  const ag = ageGroupFromBirthYear(cat.birth_year);
  const ageChip = ag ? `만 ${ag.age}살 · ${ag.label}` : `${cat.age_label} (${cat.age_group})`;
  // 성별·묘종은 기존 행에 없을 수 있어 null이면 칩에서 제외.
  const chips = [
    cat.breed,
    ageChip,
    cat.sex,
    `${cat.weight_kg}kg`,
    `중성화 ${cat.neutered_status}`,
    cat.diet_type,
    cat.goal,
  ].filter(Boolean) as string[];
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
        <div className="flex shrink-0 flex-col items-end gap-1">
          <EditProfileButton cat={catRowToGuestCat(cat)} catId={cat.id} photoUrl={imageSrc} variant="ghost" label="수정" />
          <DeleteProfileButton catId={cat.id} catName={cat.name} />
        </div>
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

      <Link
        href={`/recommendations?cat=${cat.id}`}
        className="mt-4 flex items-center justify-between rounded-[12px] bg-surface-1 px-4 py-3 text-[13px] font-semibold text-brand-text transition-colors hover:bg-surface-2"
      >
        이 아이 사료 추천 보기
        <ChevronRight size={16} className="text-brand-faint" />
      </Link>
    </div>
  );
}
