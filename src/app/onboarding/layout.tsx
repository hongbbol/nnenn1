'use client';
import { usePathname } from 'next/navigation';
import { Stepper } from '@/components/ui';
import { TopNav } from '@/components/layout/top-nav';
import { ONBOARDING_STEPS, stepIndexByPath } from './_steps';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const idx = stepIndexByPath(pathname);
  const step = ONBOARDING_STEPS[idx];

  return (
    <>
      <TopNav />
      <div className="min-h-[calc(100vh-68px)] bg-brand-bg pb-20">
        <div className="mx-auto max-w-[720px] px-8 pt-12">
          <Stepper current={idx} steps={ONBOARDING_STEPS} />
        </div>
        <div className="mx-auto max-w-[720px] px-8 pt-12">
          <div className="text-[30px] font-bold leading-[1.2] tracking-[-0.02em] text-brand-text">
            {step.title}
          </div>
          <p className="mt-3 text-[15px] leading-[1.6] text-brand-sub">{step.sub}</p>
          <div className="mt-9">{children}</div>
        </div>
      </div>
    </>
  );
}
