'use client';
import { useEffect, useState } from 'react';
import { Input, Segmented } from '@/components/ui';
import { useGuestStore } from '@/lib/guest-store';
import { NEUTERED_STATUS, SEXES, ageGroupFromBirthYear } from '@/lib/domain/constants';
import { basicsSchema } from '@/lib/domain/schemas';
import { PhotoUploadSlot } from '@/components/domain/photo-upload-slot';
import { BreedField } from '@/components/domain/breed-field';
import { OnboardingProfileBar } from '@/components/domain/onboarding-profile-bar';
import { FormResetButton } from '@/components/domain/form-reset-button';
import { OnboardingNav } from '../_nav-buttons';
import { FieldLabel } from '../_field-label';

/** 숫자 입력 → 자리수 제한 후 number | undefined. 비면 undefined. */
function toClampedInt(raw: string, maxDigits: number): number | undefined {
  const digits = raw.replace(/\D/g, '').slice(0, maxDigits);
  if (!digits) return undefined;
  const n = Number(digits);
  return Number.isFinite(n) ? n : undefined;
}

export default function BasicsStep() {
  const cat = useGuestStore((s) => s.cat);
  const setCat = useGuestStore((s) => s.setCat);

  // 몸무게는 소수점 입력 중 "4." 같은 중간 상태를 number로 저장하면
  // 마침표가 사라지므로, 입력 문자열은 로컬 상태로 따로 보관한다.
  const [weightText, setWeightText] = useState(() =>
    cat.weight_kg != null ? String(cat.weight_kg) : '',
  );
  // 스토어 값이 외부에서 바뀌면(하이드레이션·리셋) 입력칸과 동기화.
  useEffect(() => {
    const local = weightText === '' || weightText === '.' ? undefined : Number(weightText);
    if (cat.weight_kg !== local) {
      setWeightText(cat.weight_kg != null ? String(cat.weight_kg) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat.weight_kg]);

  const ag = ageGroupFromBirthYear(cat.birth_year as number | undefined);
  const parsed = basicsSchema.safeParse({
    name: cat.name ?? '',
    sex: cat.sex ?? '',
    breed: cat.breed ?? '',
    birth_year: cat.birth_year ?? '',
    birth_month: cat.birth_month ?? '',
    birth_day: cat.birth_day ?? '',
    weight_kg: cat.weight_kg ?? '',
    neutered_status: cat.neutered_status ?? '',
    hero_image_preview: cat.hero_image_preview ?? null,
  });

  return (
    <div className="flex flex-col gap-7">
      <OnboardingProfileBar />

      <div>
        <FieldLabel>사진 (선택)</FieldLabel>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <PhotoUploadSlot
              name={cat.name}
              preview={cat.hero_image_preview}
              onChange={(v) => setCat({ hero_image_preview: v })}
            />
          </div>
          <FormResetButton />
        </div>
      </div>

      <div>
        <FieldLabel>이름</FieldLabel>
        <Input
          value={cat.name ?? ''}
          placeholder="예: 보리"
          onChange={(e) => setCat({ name: e.target.value })}
        />
      </div>

      <div>
        <FieldLabel>묘종</FieldLabel>
        <BreedField value={cat.breed} onChange={(v) => setCat({ breed: v })} />
      </div>

      <div>
        <FieldLabel
          hint={
            ag ? (
              <span className="text-[13px] font-semibold text-brand-blue-deep">
                만 {ag.age}살 · {ag.label} ({ag.group})
              </span>
            ) : null
          }
        >
          출생일
        </FieldLabel>
        <div className="flex gap-2">
          <Input
            className="w-[116px]"
            value={cat.birth_year != null ? String(cat.birth_year) : ''}
            placeholder="2017"
            suffix="년"
            inputMode="numeric"
            onChange={(e) => setCat({ birth_year: toClampedInt(e.target.value, 4) })}
          />
          <Input
            className="w-[88px]"
            value={cat.birth_month != null ? String(cat.birth_month) : ''}
            placeholder="3"
            suffix="월"
            inputMode="numeric"
            onChange={(e) => setCat({ birth_month: toClampedInt(e.target.value, 2) })}
          />
          <Input
            className="w-[88px]"
            value={cat.birth_day != null ? String(cat.birth_day) : ''}
            placeholder="15"
            suffix="일"
            inputMode="numeric"
            onChange={(e) => setCat({ birth_day: toClampedInt(e.target.value, 2) })}
          />
        </div>
      </div>

      <div>
        <FieldLabel>몸무게</FieldLabel>
        <Input
          value={weightText}
          placeholder="4.7"
          suffix="kg"
          inputMode="decimal"
          onChange={(e) => {
            // 숫자와 마침표 1개만 허용, 최대 4글자 (예: "15.0", "0.50")
            const raw = e.target.value.replace(/[^\d.]/g, '');
            const firstDot = raw.indexOf('.');
            const normalized =
              firstDot === -1
                ? raw
                : raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, '');
            const clean = normalized.slice(0, 4);
            setWeightText(clean);
            if (!clean || clean === '.') {
              setCat({ weight_kg: undefined });
              return;
            }
            const n = Number(clean);
            setCat({ weight_kg: Number.isFinite(n) ? n : undefined });
          }}
        />
      </div>

      <div>
        <FieldLabel>성별</FieldLabel>
        <Segmented
          options={SEXES}
          value={cat.sex ?? ''}
          onChange={(v) => setCat({ sex: v })}
        />
      </div>

      <div>
        <FieldLabel>중성화</FieldLabel>
        <Segmented
          options={NEUTERED_STATUS}
          value={cat.neutered_status ?? ''}
          onChange={(v) => setCat({ neutered_status: v })}
        />
      </div>

      <OnboardingNav step={0} canProceed={parsed.success} />
    </div>
  );
}
