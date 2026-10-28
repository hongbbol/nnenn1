import { ArrowLeftRight, Check, Info, TriangleAlert } from 'lucide-react';
import { FoodArt } from '@/components/ui';
import type { DeltaSummary, ScoredFood } from '@/lib/recommendation';
import { plausiblePhosphorusPct } from '@/lib/recommendation/nutrition';

const RANK_LABEL = ['추천 1순위', '추천 2순위', '추천'];

/**
 * 추천 사료 카드 — 점수·근거("왜")·영양 요약 (dev-plan §M2 FoodRecCard).
 * `delta`는 '지금 사료 대비 변화'(delta.ts) — 점수 근거(reasons)와 섞이지 않도록 별도 섹션에 그린다.
 */
export function FoodRecCard({
  item,
  rank,
  delta = null,
}: {
  item: ScoredFood;
  rank: number;
  delta?: DeltaSummary | null;
}) {
  const { food, score, reasons, lowConfidence } = item;
  const accent = food.category === '습식' ? '#DDEFE7' : '#D9EEFB';

  return (
    <div className="relative flex flex-col gap-5 rounded-[20px] border border-border-soft bg-surface-card p-6 shadow-card-rest">
      <div className="flex items-start gap-4">
        <FoodArt
          size={84}
          accent={accent}
          label={food.category}
          brand={food.brand}
          imageSrc={food.image_url}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-brand-text px-2 py-[3px] text-[11px] font-semibold text-white">
              {RANK_LABEL[rank] ?? RANK_LABEL[2]}
            </span>
            {lowConfidence && (
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-[3px] text-[11px] font-semibold text-brand-sub">
                <TriangleAlert size={11} /> 신뢰도 낮음
              </span>
            )}
          </div>
          <div className="mt-1.5 truncate text-[12px] font-semibold text-brand-sub">
            {food.brand}
          </div>
          <div className="text-[17px] font-bold leading-[1.3] text-brand-text">
            {food.product_name}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-[26px] font-bold leading-none text-brand-text">
            {score}
          </div>
          <div className="text-[11px] font-medium text-brand-faint">적합도</div>
        </div>
      </div>

      {reasons.length > 0 && (
        <div className="flex flex-col gap-2">
          {reasons.slice(0, 4).map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-[13.5px] leading-[1.5]">
              {r.tone === 'good' ? (
                <Check size={15} className="mt-0.5 shrink-0 text-brand-green" />
              ) : r.tone === 'warn' ? (
                <TriangleAlert size={15} className="mt-0.5 shrink-0 text-brand-danger" />
              ) : (
                <Info size={15} className="mt-0.5 shrink-0 text-brand-faint" />
              )}
              <span className="text-brand-text">{r.label}</span>
            </div>
          ))}
        </div>
      )}

      {delta && <DeltaSection delta={delta} />}

      {food.ingredient_summary && (
        <div className="text-[12.5px] leading-[1.55] text-brand-sub">
          <span className="font-semibold text-brand-faint">주원료 </span>
          {truncate(food.ingredient_summary, 90)}
        </div>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 border-t border-border-soft pt-4 text-[12.5px] text-brand-sub">
        {food.protein_pct != null && <NutrientStat label="단백" value={`${food.protein_pct}%`} />}
        {food.fat_pct != null && <NutrientStat label="지방" value={`${food.fat_pct}%`} />}
        {food.moisture_pct != null && <NutrientStat label="수분" value={`${food.moisture_pct}%`} />}
        {plausiblePhosphorusPct(food) != null && (
          <NutrientStat label="인" value={`${food.phosphorus_pct}%`} />
        )}
        {food.kcal_per_100g != null && (
          <NutrientStat label="칼로리" value={`${food.kcal_per_100g}kcal/100g`} />
        )}
      </div>

      {food.price_per_kg_krw != null && (
        <div className="text-[12px] text-brand-faint">
          약 {food.price_per_kg_krw.toLocaleString('ko-KR')}원/kg · 예시 가격
        </div>
      )}
    </div>
  );
}

/** '지금 사료 대비' — 쉬운 문장 2~3줄 + 라벨 기준 고지. 현재 사료 자체면 순위만 알린다. */
function DeltaSection({ delta }: { delta: DeltaSummary }) {
  return (
    <div className="rounded-[14px] bg-surface-1 px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-brand-blue-deep">
        <ArrowLeftRight size={13} />
        지금 사료 대비
      </div>
      {delta.kind === 'same' ? (
        <p className="mt-2 text-[13.5px] leading-[1.5] text-brand-text">
          지금 먹이고 있는 사료예요. 이 조건에서 {delta.rank + 1}순위로 나왔어요.
        </p>
      ) : (
        <>
          <div className="mt-2 flex flex-col gap-1.5">
            {delta.lines.map((l, i) => (
              <div key={i} className="flex items-start gap-2 text-[13.5px] leading-[1.5]">
                {l.tone === 'good' ? (
                  <Check size={15} className="mt-0.5 shrink-0 text-brand-green" />
                ) : l.tone === 'warn' ? (
                  <TriangleAlert size={15} className="mt-0.5 shrink-0 text-brand-danger" />
                ) : (
                  <Info size={15} className="mt-0.5 shrink-0 text-brand-faint" />
                )}
                <span className="text-brand-text">{l.text}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-[1.5] text-brand-faint">{delta.note}</p>
        </>
      )}
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max).trimEnd()}…` : s;
}

function NutrientStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-brand-faint">{label}</span>
      <span className="font-mono font-semibold text-brand-text">{value}</span>
    </div>
  );
}
