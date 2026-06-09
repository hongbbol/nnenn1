import { z } from 'zod';
import {
  DIET_TYPES,
  GOALS,
  HEALTH_IDS,
  HEALTH_OPTIONS,
  NEUTERED_STATUS,
  SEXES,
} from './constants';

const currentYear = new Date().getFullYear();

const basicsObject = z.object({
  name: z.string().trim().min(1, '이름을 입력해주세요').max(30, '이름이 너무 길어요'),
  sex: z.enum(SEXES, { errorMap: () => ({ message: '성별을 선택해주세요' }) }),
  breed: z.string().trim().min(1, '묘종을 입력해주세요').max(40, '묘종이 너무 길어요'),
  birth_year: z
    .coerce.number({ invalid_type_error: '출생년도를 숫자로 입력해주세요' })
    .int()
    .min(2000, '2000년 이후만 가능해요')
    .max(currentYear, '미래는 안 돼요'),
  birth_month: z
    .coerce.number({ invalid_type_error: '월을 숫자로 입력해주세요' })
    .int()
    .min(1, '월을 입력해주세요')
    .max(12, '월은 1~12 사이예요'),
  birth_day: z
    .coerce.number({ invalid_type_error: '일을 숫자로 입력해주세요' })
    .int()
    .min(1, '일을 입력해주세요')
    .max(31, '일은 1~31 사이예요'),
  weight_kg: z
    .coerce.number({ invalid_type_error: '몸무게를 숫자로 입력해주세요' })
    .min(0.5, '0.5kg 이상으로 입력해주세요')
    .max(15, '15kg 이하로 입력해주세요'),
  neutered_status: z.enum(NEUTERED_STATUS),
  hero_image_preview: z.string().nullish(),
});

/** 년·월·일이 실제 달력상 존재하는 날짜이고 미래가 아닌지 검증 (cross-field). */
function refineBirthDate(
  v: { birth_year: number; birth_month: number; birth_day: number },
  ctx: z.RefinementCtx,
) {
  const { birth_year, birth_month, birth_day } = v;
  const d = new Date(birth_year, birth_month - 1, birth_day);
  const realDate =
    d.getFullYear() === birth_year &&
    d.getMonth() === birth_month - 1 &&
    d.getDate() === birth_day;
  if (!realDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['birth_day'],
      message: '실제 존재하는 날짜를 입력해주세요',
    });
    return;
  }
  // 자정 기준 비교 — 오늘 출생까지는 허용
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d.getTime() > today.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['birth_day'],
      message: '미래 날짜는 안 돼요',
    });
  }
}

export const basicsSchema = basicsObject.superRefine(refineBirthDate);

export const dietSchema = z.object({
  diet_type: z.enum(DIET_TYPES),
  current_food_text: z.string().trim().max(120).nullish(),
  avoid_ingredients: z.array(z.string()).default([]),
  exclude_food_ids: z.array(z.string()).default([]),
});

export const healthSchema = z.object({
  health_conditions: z
    .array(z.string())
    .default([])
    .superRefine((vals, ctx) => {
      const set = new Set(vals);
      // unknown ids — silently drop is fine for forward-compat, but flag in dev
      for (const v of vals) {
        if (!HEALTH_IDS.includes(v)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `알 수 없는 건강 옵션: ${v}`,
          });
        }
      }
      const exclusive = HEALTH_OPTIONS.find((o) => o.exclusive && set.has(o.id));
      if (exclusive && set.size > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${exclusive.id}"은 다른 옵션과 함께 선택할 수 없어요`,
        });
      }
      const groups = new Map<string, string[]>();
      for (const opt of HEALTH_OPTIONS) {
        if (opt.group && set.has(opt.id)) {
          const arr = groups.get(opt.group) ?? [];
          arr.push(opt.id);
          groups.set(opt.group, arr);
        }
      }
      for (const [g, arr] of groups) {
        if (arr.length > 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `같은 그룹(${g})에서는 하나만 선택할 수 있어요: ${arr.join(', ')}`,
          });
        }
      }
    }),
});

export const goalSchema = z.object({
  goal: z.enum(GOALS),
});

export const profileSchema = basicsObject
  .merge(dietSchema)
  .merge(healthSchema)
  .merge(goalSchema)
  .superRefine(refineBirthDate);

export type BasicsForm = z.infer<typeof basicsSchema>;
export type DietForm = z.infer<typeof dietSchema>;
export type HealthForm = z.infer<typeof healthSchema>;
export type GoalForm = z.infer<typeof goalSchema>;
export type ProfileForm = z.infer<typeof profileSchema>;
