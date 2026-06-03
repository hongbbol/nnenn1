'use client';
import { Input, Segmented } from '@/components/ui';
import { useGuestStore } from '@/lib/guest-store';
import { NEUTERED_STATUS, ageGroupFromBirthYear } from '@/lib/domain/constants';
import { basicsSchema } from '@/lib/domain/schemas';
import { PhotoUploadSlot } from '@/components/domain/photo-upload-slot';
import { OnboardingNav } from '../_nav-buttons';
import { FieldLabel } from '../_field-label';

export default function BasicsStep() {
  const cat = useGuestStore((s) => s.cat);
  const setCat = useGuestStore((s) => s.setCat);

  const ag = ageGroupFromBirthYear(cat.birth_year as number | undefined);
  const parsed = basicsSchema.safeParse({
    name: cat.name ?? '',
    birth_year: cat.birth_year ?? '',
    weight_kg: cat.weight_kg ?? '',
    neutered_status: cat.neutered_status ?? '',
    hero_image_preview: cat.hero_image_preview ?? null,
  });

  return (
    <div className="flex flex-col gap-7">
      <div>
        <FieldLabel>사진 (선택)</FieldLabel>
        <PhotoUploadSlot
          name={cat.name}
          preview={cat.hero_image_preview}
          onChange={(v) => setCat({ hero_image_preview: v })}
        />
      </div>

      <div>
        <FieldLabel>이름</FieldLabel>
        <Input
          value={cat.name ?? ''}
          placeholder="예: 보리"
          onChange={(e) => setCat({ name: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
            출생년도
          </FieldLabel>
          <Input
            value={cat.birth_year != null ? String(cat.birth_year) : ''}
            placeholder="2017"
            suffix="년"
            inputMode="numeric"
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
              if (!digits) {
                setCat({ birth_year: undefined });
                return;
              }
              const n = Number(digits);
              setCat({ birth_year: Number.isFinite(n) ? n : undefined });
            }}
          />
        </div>
        <div>
          <FieldLabel>몸무게</FieldLabel>
          <Input
            value={cat.weight_kg != null ? String(cat.weight_kg) : ''}
            placeholder="4.7"
            suffix="kg"
            inputMode="decimal"
            onChange={(e) => {
              // single decimal point only, max 4 chars (e.g. "15.0", "0.50")
              const raw = e.target.value.replace(/[^\d.]/g, '');
              const firstDot = raw.indexOf('.');
              const normalized =
                firstDot === -1
                  ? raw
                  : raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, '');
              const clean = normalized.slice(0, 4);
              if (!clean || clean === '.') {
                setCat({ weight_kg: undefined });
                return;
              }
              const n = Number(clean);
              setCat({ weight_kg: Number.isFinite(n) ? n : undefined });
            }}
          />
        </div>
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
