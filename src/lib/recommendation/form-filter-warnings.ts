import type { Goal } from '@/lib/domain/constants';
import type { FormFilter } from '@/lib/domain/constants';
import type { DiseaseMode } from './types';

/**
 * 추천 범위 '건식만' 경고(2026-10-22 사용자 결정) — 수분이 핵심인 모드·감량 목표에서 1차 레버를
 * 빼고 고른 결과임을 알린다. 필터는 그대로 적용(사용자 제약 존중), 막지 않는다.
 *
 * 순수 함수 — 서버(selector.buildNotices → 결과 화면 고지)와 클라이언트(온보딩 '추천 받기' 확인 창)가
 * 같은 문구를 쓴다.
 */
export function formFilterWarnings(input: {
  formFilter: FormFilter;
  diseases: DiseaseMode[];
  goal: Goal;
}): string[] {
  const out: string[] = [];
  if (input.formFilter !== '건식만') return out;
  const ds = input.diseases;
  if (ds.includes('struvite') || ds.includes('oxalate')) {
    out.push(
      '⚠️ 요로 결석은 수분(습식·희석)이 1차 관리 수단이에요. 건식만으로 제한해 핵심 레버를 빼고 고른 결과예요 — 음수 유도(급수기·물 추가)와 습식 병행 가능성을 수의사와 상의하세요.',
    );
  }
  if (ds.includes('ckd_34')) {
    out.push(
      '⚠️ 신부전 3-4기는 수분 관리가 핵심이에요. 건식 신장식도 표준 처방식이지만, 탈수 예방을 위해 물 섭취량 확보와 습식 병행 여부를 수의사와 확인하세요.',
    );
  } else if (ds.includes('ckd_early') || ds.includes('ckd_12')) {
    out.push('신부전은 수분 섭취가 중요해요. 건식만 급여한다면 음수량을 챙겨 주세요.');
  }
  if (ds.includes('diabetes')) {
    out.push(
      '⚠️ 건식은 대개 탄수화물이 높아 당뇨 후보가 크게 줄고 신뢰도가 낮아져요. 저탄수 건식이 드물어 습식 병행이 권장되는 질환이에요 — 수의사와 상의하세요.',
    );
  }
  if (input.goal === '체중관리 - 감량') {
    out.push(
      '감량은 수분이 많은 습식이 포만감·칼로리 조절에 유리해요. 건식만 추천이라 급여량(그램) 관리가 더 중요해요 — 주당 0.5~1% 이상 급속 감량은 피하세요.',
    );
  }
  return out;
}
