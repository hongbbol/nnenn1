import { Cake, Scale } from 'lucide-react';
import { EditProfileButton } from './edit-profile-button';
import { DeleteProfileButton } from './delete-profile-button';
import { catRowToGuestCat } from '@/lib/domain/cat-mapping';
import { ageGroupFromBirthYear } from '@/lib/domain/constants';
import type { AgeGroup } from '@/lib/domain/constants';
import type { CatRow } from '@/lib/domain/types';

/** 7세↑ 나이대 관리 라벨 (건강 이슈가 없을 때 이름 밑에 노출). */
const AGE_MANAGE: Partial<Record<AgeGroup, string>> = {
  '7+': '중년관리',
  '11+': '노령관리',
  '15+': '초고령관리',
};

/**
 * 이름 밑 건강정보 한 줄.
 * 건강 이슈가 있으면 이슈 우선(여러 개면 "신부전 외 2건") → 없고 7세↑면 나이대 관리 라벨 → 그 외 빈 문자열.
 */
function healthLine(cat: CatRow, group: AgeGroup): string {
  const conditions = (cat.health_conditions ?? []).filter((c) => c !== '질병 없음');
  if (conditions.length > 0) {
    return conditions.length > 1
      ? `${conditions[0]} 외 ${conditions.length - 1}건`
      : conditions[0];
  }
  return AGE_MANAGE[group] ?? '';
}

const sexGlyph = (sex: CatRow['sex']) => (sex === '남아' ? '♂' : sex === '여아' ? '♀' : '·');
const sexColor = (sex: CatRow['sex']) =>
  sex === '남아' ? '#2E97E6' : sex === '여아' ? '#E0584A' : '#586573';

/** 하단 3칸 스탯 — 라벨 없이 아이콘/기호 + 값, 테두리 없이 그림자. */
function Stat({ glyph, value, color }: { glyph: React.ReactNode; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-[14px] bg-surface-card px-2 py-3 shadow-[0_6px_16px_-6px_rgba(28,90,150,0.22)]">
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary-soft text-[15px] font-bold"
        style={{ color }}
      >
        {glyph}
      </span>
      <span className="text-[14px] font-bold text-brand-text">{value}</span>
    </div>
  );
}

/**
 * 마이페이지 — 내 아이 프로필 카드.
 * 꽉 찬 정사각형 사진(없으면 이니셜) + 왼쪽 정렬 이름·건강정보 + 하단 3칸(성별·나이·체중).
 * 수정/삭제는 사진 위 반투명 아이콘. (사료 추천 링크 없음 — 순수 프로필.)
 */
export function ProfileCard({
  cat,
  imageSrc,
}: {
  cat: CatRow;
  imageSrc: string | null;
}) {
  const ag = ageGroupFromBirthYear(cat.birth_year);
  const group = ag?.group ?? cat.age_group;
  const ageValue = ag ? `만 ${ag.age}살` : cat.age_label;
  const health = healthLine(cat, group);

  return (
    <div className="rounded-[22px] bg-gradient-to-b from-brand-primary-soft to-surface-card p-4 shadow-card-hero">
      {/* 꽉 차는 정사각형 사진(둥근 모서리) — 없으면 이니셜 박스. 수정/삭제는 우상단 오버레이. */}
      <div className="relative overflow-hidden rounded-[20px] shadow-card-hover">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt={cat.name} className="aspect-square w-full object-cover" />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-brand-primary-soft text-[72px] font-bold text-brand-text">
            {(cat.name || '?').slice(0, 1)}
          </div>
        )}
        <div className="absolute right-3 top-3 flex gap-1.5">
          <EditProfileButton overlay cat={catRowToGuestCat(cat)} catId={cat.id} photoUrl={imageSrc} />
          <DeleteProfileButton overlay catId={cat.id} catName={cat.name} />
        </div>
      </div>

      {/* 이름 왼쪽 정렬 + 건강정보는 글씨만(없으면 줄 숨김). */}
      <div className="mt-3.5">
        <div className="text-[22px] font-bold leading-tight text-brand-text">{cat.name}</div>
        {health && <div className="mt-1 text-[13px] font-medium text-brand-sub">{health}</div>}
      </div>

      {/* 하단 3칸: 성별 · 나이 · 체중. */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat glyph={sexGlyph(cat.sex)} value={cat.sex ?? '—'} color={sexColor(cat.sex)} />
        <Stat glyph={<Cake size={16} />} value={ageValue} color="#586573" />
        <Stat glyph={<Scale size={16} />} value={`${cat.weight_kg}kg`} color="#586573" />
      </div>
    </div>
  );
}
