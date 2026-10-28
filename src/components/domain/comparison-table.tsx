import type { ComparisonResult } from '@/lib/domain/types';
import { COMPARISON_UNIT_NOTE } from '@/lib/recommendation/compare';

function fmt(v: number | null): string {
  if (v == null) return '—';
  if (Number.isInteger(v)) return String(v);
  // 작은 값(인·나트륨 g/1000kcal)은 소수 2자리까지, 큰 값은 1자리.
  return Math.abs(v) < 10 ? v.toFixed(2).replace(/\.?0+$/, '') : v.toFixed(1);
}

/** 현재 사료 vs 추천 사료 영양소 비교 표. */
export function ComparisonTable({ result }: { result: ComparisonResult }) {
  const { baseline, candidates, metrics } = result;

  return (
    <div className="overflow-x-auto rounded-[18px] border border-border-soft bg-surface-card">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border-soft bg-surface-1">
            <th className="p-3 text-left font-semibold text-brand-sub">영양소</th>
            <th className="min-w-[110px] p-3 text-center font-semibold text-brand-text">
              <div>현재 사료</div>
              <div className="mt-0.5 truncate text-[11px] font-medium text-brand-faint">
                {baseline.label}
              </div>
            </th>
            {candidates.map((c, i) => (
              <th
                key={c.id}
                className="min-w-[110px] p-3 text-center font-semibold text-brand-text"
              >
                <div>TOP {i + 1}</div>
                <div className="mt-0.5 truncate text-[11px] font-medium text-brand-faint">
                  {c.brand}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.key} className="border-b border-border-soft last:border-0">
              <td className="p-3 text-left">
                <span className="font-medium text-brand-text">{m.label}</span>
                <span className="ml-1 text-[11px] text-brand-faint">{m.unit}</span>
                {m.better !== 'neutral' && (
                  <span className="ml-1 text-[11px] text-brand-faint">
                    {m.better === 'higher' ? '↑좋음' : '↓좋음'}
                  </span>
                )}
              </td>
              <td className="p-3 text-center text-brand-sub">{fmt(m.baseline)}</td>
              {m.values.map((v, i) => (
                <td key={i} className="p-3 text-center font-medium text-brand-text">
                  {fmt(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {metrics.some((m) => m.unit.includes('1000kcal')) && (
        <p className="border-t border-border-soft px-4 py-3 text-[11.5px] leading-[1.55] text-brand-faint">
          {COMPARISON_UNIT_NOTE}
        </p>
      )}
    </div>
  );
}
