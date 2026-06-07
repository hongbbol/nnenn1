import { CatAvatar } from '@/components/ui';
import { AGE_LABELS } from '@/lib/domain/constants';
import type { RecInput } from '@/lib/recommendation';

/** 추천 결과 상단 프로필 배너 — 어떤 아이 기준으로 추천했는지(dev-plan §M2 ProfileBanner). */
export function ProfileBanner({
  input,
  imageSrc,
}: {
  input: RecInput;
  imageSrc?: string | null;
}) {
  const chips: string[] = [
    `${AGE_LABELS[input.ageGroup]} (${input.ageGroup})`,
    input.goal,
  ];
  if (input.diseases.length === 0) chips.push('질환 없음');

  return (
    <div className="flex items-center gap-4 rounded-[18px] border border-border-soft bg-surface-card p-5">
      <CatAvatar size={56} name={input.name} imageSrc={imageSrc} />
      <div className="min-w-0">
        <div className="text-[18px] font-bold text-brand-text">
          {input.name}님을 위한 추천
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-md bg-surface-1 px-2 py-[3px] text-[12px] font-medium text-brand-sub"
            >
              {c}
            </span>
          ))}
          {input.avoid.map((a) => (
            <span
              key={a}
              className="rounded-md bg-brand-danger-soft px-2 py-[3px] text-[12px] font-medium text-brand-danger"
            >
              {a} 제외
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
