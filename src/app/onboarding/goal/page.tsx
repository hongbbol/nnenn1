'use client';
import { useState } from 'react';
import { Check, Info } from 'lucide-react';
import { useGuestStore } from '@/lib/guest-store';
import { GOAL_OPTIONS } from '@/lib/domain/constants';
import { goalSchema } from '@/lib/domain/schemas';
import { cn } from '@/lib/cn';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { uploadCatPhotoClient } from '@/lib/storage/client-upload';
import { OnboardingNav } from '../_nav-buttons';
import { saveCatAndRecommend } from '../_actions';

export default function GoalStep() {
  const cat = useGuestStore((s) => s.cat);
  const setCat = useGuestStore((s) => s.setCat);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const conditions = cat.health_conditions ?? [];
  const hasDisease = conditions.some((c) => c !== '질병 없음');
  // dev-plan §3.3 rule 3: 질환관리 + 질병 없음 → "진단 없어도 부담 적은 사료 우선" 안내
  const showHealthyGuidance =
    cat.goal === '질환관리' && (conditions.length === 0 || conditions.includes('질병 없음'));

  const parsed = goalSchema.safeParse({ goal: cat.goal ?? '' });

  return (
    <div className="flex flex-col gap-2.5">
      {hasDisease && (
        <div className="mb-1.5 flex gap-2.5 rounded-[12px] bg-brand-blue px-4 py-3.5 text-[13px] font-medium leading-[1.55] text-brand-blue-deep">
          <div className="shrink-0 pt-0.5">
            <Info size={14} />
          </div>
          <div>
            <strong className="font-bold">
              질환이 있는 아이는 &ldquo;질환관리&rdquo;가 자동으로 우선돼요.
            </strong>
            <br />
            <span className="text-brand-blue-ink">
              여기서 고르신 목표는 보조 기준으로 적용돼요 — 질환에 안전한 사료들 중에서 선택하신
              목표에 맞춰 순위를 매겨드려요.
            </span>
          </div>
        </div>
      )}
      {showHealthyGuidance && (
        <div className="mb-1.5 flex gap-2.5 rounded-[12px] bg-brand-yellow-soft px-4 py-3.5 text-[13px] font-medium leading-[1.55] text-brand-yellow-dark">
          <div className="shrink-0 pt-0.5">
            <Info size={14} />
          </div>
          <div>
            <strong className="font-bold">진단이 없어도 괜찮아요.</strong>{' '}
            나이·체중·식단을 기준으로 <strong>부담이 적은 사료</strong>를 우선해드릴게요.
          </div>
        </div>
      )}

      {GOAL_OPTIONS.map((g) => {
        const sel = cat.goal === g.id;
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => setCat({ goal: g.id })}
            className={cn(
              'flex items-center justify-between rounded-[14px] border-[1.5px] p-5 text-left transition-colors',
              sel
                ? 'border-brand-text bg-brand-text text-white'
                : 'border-border-soft bg-surface-card hover:border-border-strong',
            )}
          >
            <div>
              <div className={cn('text-[16px] font-bold', sel ? 'text-white' : 'text-brand-text')}>
                {g.id}
              </div>
              <div
                className={cn(
                  'mt-1 text-[13px]',
                  sel ? 'text-white/70' : 'text-brand-sub',
                )}
              >
                {g.desc}
              </div>
            </div>
            <div
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px]',
                sel ? 'border-white bg-white text-brand-text' : 'border-border-strong text-transparent',
              )}
            >
              {sel && <Check size={14} strokeWidth={3} />}
            </div>
          </button>
        );
      })}

      {saveErr && (
        <div className="rounded-[12px] bg-brand-danger-soft px-4 py-3 text-[13px] font-medium text-brand-danger">
          {saveErr}
        </div>
      )}

      <OnboardingNav
        step={3}
        canProceed={parsed.success && !saving}
        onNext={async () => {
          setSaveErr(null);
          setSaving(true);
          try {
            // 사진이 있으면 먼저 클라이언트에서 Storage에 업로드(큰 dataURL을 Server
            // Action으로 보내지 않기 위함). Server Action에는 경로/입력값만 전달.
            const supabase = createSupabaseBrowserClient();
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error('로그인이 필요해요.');

            let heroPath: string | null = null;
            if (cat.hero_image_preview?.startsWith('data:image/')) {
              heroPath = await uploadCatPhotoClient(
                supabase,
                user.id,
                cat.hero_image_preview,
              );
            }

            const { hero_image_preview, ...catData } = cat;
            void hero_image_preview;
            const res = await saveCatAndRecommend(catData, heroPath);
            if (!res.ok) {
              // OnboardingNav가 /recommendations로 넘어가지 않도록 throw.
              throw new Error(res.error);
            }
          } catch (e) {
            setSaveErr(
              e instanceof Error ? e.message : '저장 중 문제가 생겼어요. 다시 시도해주세요.',
            );
            throw e;
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}
