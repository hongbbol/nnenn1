/**
 * 선정 + 충돌 처리 (레지스트리 §4) + 추천 우선순위 박스(§0-2) + 상담 톤(§1).
 */
import type { DiseaseMode, PriorityItem, RecInput, SafetyGate } from './types';
import { SAFETY_GATE } from './rules';
import { formFilterWarnings } from './form-filter-warnings';

/**
 * 동반질환 충돌 시 식이 hard를 가질 "우선 질환"을 고른다(§4-1).
 * 알레르겐은 filter에서 이미 hard 처리되므로 여기선 soft 레버 주도권만 결정.
 * 예후·식이 근거 강도 순서: CKD(3-4기 최상) > 당뇨 > 요로 > IBD > 췌장염.
 */
const PRIORITY_RANK: Record<DiseaseMode, number> = {
  ckd_34: 100,
  ckd_12: 90,
  ckd_early: 80,
  diabetes: 70,
  struvite: 60,
  oxalate: 60,
  ibd: 50,
  pancreatitis: 40,
};

export function resolvePrimaryMode(input: RecInput): DiseaseMode | null {
  if (input.diseases.length === 0) return null;
  return [...input.diseases].sort((a, b) => PRIORITY_RANK[b] - PRIORITY_RANK[a])[0];
}

/** 활성 모드 중 가장 높은 안전 게이트. */
export function highestSafetyGate(input: RecInput): SafetyGate | null {
  if (input.diseases.length === 0) return null;
  return input.diseases.reduce<SafetyGate>((max, d) => {
    const g = SAFETY_GATE[d];
    return g > max ? g : max;
  }, 1 as SafetyGate);
}

// 라벨 맵은 의존성 없는 순수 모듈(labels.ts)로 분리 — 기존 import 경로 유지를 위해 재노출.
import { MODE_LABEL, modeLabel } from './labels';
export { MODE_LABEL, modeLabel };

/**
 * 추천 우선순위 박스 — "지금 이 추천에서 무엇을 가장 중요하게 봤는가"(§0-2 1차 레버).
 * primaryMode가 있으면 질환 레버, 없으면 목표 레버.
 */
export function buildPriorityOrder(
  input: RecInput,
  primaryMode: DiseaseMode | null,
): PriorityItem[] {
  const items: PriorityItem[] = [];
  const senior = input.ageGroup === '11+' || input.ageGroup === '15+';

  if (input.avoid.length > 0) {
    items.push({
      key: 'allergen',
      label: '알레르겐 배제',
      weight: 1,
      detail: `${input.avoid.join('·')} 포함 제품 제외 (절대 조건)`,
    });
  }

  switch (primaryMode) {
    case 'ckd_early':
    case 'ckd_12':
    case 'ckd_34':
      items.push({ key: 'phosphorus', label: '인(P) 제한', weight: 0.95, detail: '신장 부담을 줄이는 핵심 레버' });
      items.push({ key: 'protein', label: '적정 고품질 단백', weight: 0.6, detail: '근감소 방지 (과도 제한 금지)' });
      items.push({ key: 'palatability', label: '기호성·에너지', weight: 0.5, detail: '식욕 저하 대응' });
      break;
    case 'struvite':
    case 'oxalate':
      items.push({ key: 'moisture', label: '수분·희석', weight: 0.9, detail: '고수분 습식으로 소변 희석 (공통 1차)' });
      items.push({ key: 'mineral', label: '결석별 미네랄·pH', weight: 0.55, detail: modeLabel(primaryMode) + ' 전략 반영' });
      break;
    case 'diabetes':
      items.push({ key: 'carb', label: '저탄수화물', weight: 0.95, detail: '<50 g/1000kcal 목표' });
      items.push({ key: 'protein', label: '고단백', weight: 0.7, detail: '혈당 안정·제지방 보존' });
      items.push({ key: 'moisture', label: '습식 선호', weight: 0.45, detail: '저탄수·수분' });
      break;
    case 'ibd':
      items.push({ key: 'protein_type', label: '단백 항원·소화율', weight: 0.9, detail: '가수분해 > 신규 > 고소화성' });
      items.push({ key: 'omega3', label: '항염·기호성', weight: 0.4, detail: '오메가-3 보조' });
      break;
    case 'pancreatitis':
      // §3-H(2026-10-20 확정): 지방 제한이 아니라 단백 소화율 + 칼로리 확보.
      items.push({ key: 'protein_type', label: '단백 소화율·항원', weight: 0.85, detail: '가수분해·고소화성 우선 (지방 제한 아님)' });
      items.push({ key: 'energy', label: '칼로리 확보', weight: 0.6, detail: '거식 방지 — 잘 먹는 에너지 밀도' });
      items.push({ key: 'omega3', label: '항염·기호성', weight: 0.3, detail: '오메가-3 보조' });
      break;
    default:
      // 질환 없음 — goal 기반.
      if (input.goal === '체중관리 - 감량') {
        items.push({ key: 'energy', label: '적정 칼로리', weight: 0.85, detail: '감량 (주당 0.5~1% 권장)' });
        items.push({ key: 'protein', label: '고단백', weight: 0.7, detail: '제지방량 보존' });
      } else if (input.goal === '체중관리 - 증량') {
        items.push({ key: 'energy', label: '높은 에너지 밀도', weight: 0.85, detail: '체중 증가' });
        items.push({ key: 'protein', label: '고단백', weight: 0.55, detail: '근육 형성' });
      } else {
        items.push({ key: 'protein', label: '고품질 단백', weight: 0.75, detail: '근감소 방지' });
        if (senior) items.push({ key: 'phosphorus', label: '예방적 저인', weight: 0.6, detail: '노화 신장 부담 완화' });
        items.push({ key: 'energy', label: '에너지·기호성', weight: 0.5, detail: '노령 소화율 저하 대응' });
      }
  }

  // ibd/pancreatitis 분기는 이미 omega3 레버를 넣으므로 중복 추가 방지(React key 충돌).
  if (!items.some((it) => it.key === 'omega3')) {
    items.push({ key: 'omega3', label: '기능성분', weight: 0.3, detail: '오메가-3 등 가점' });
  }
  // 동반질환 보조 반영(§4-4 ④) — 우선 질환 외 질환은 축소 가중 soft로 들어간 것을 박스에 드러낸다.
  for (const d of input.diseases) {
    if (d === primaryMode) continue;
    items.push({ key: `secondary_${d}`, label: `${modeLabel(d)} 보조 반영`, weight: 0.25, detail: '우선 질환 다음으로 점수에 반영' });
  }
  return items.sort((a, b) => b.weight - a.weight);
}

/** 안전 게이트·모드에 따른 상담 고지 문장. */
export function buildNotices(
  input: RecInput,
  primaryMode: DiseaseMode | null,
  opts: { heldCount?: number; formFilterRelaxed?: boolean } = {},
): string[] {
  const notices: string[] = [];
  const gate = highestSafetyGate(input);

  if (gate === 3) {
    notices.push(
      '⚠️ 신장병·당뇨는 수의사의 혈액검사·진단이 필요한 질환이에요. 이 추천은 정보 제공용이며, 사료 변경 전 반드시 수의사와 상담하세요.',
    );
  } else if (gate === 2) {
    notices.push('이 추천은 정보 제공용이에요. 진단·치료 방향은 수의사와 함께 확인하세요.');
  }

  if (primaryMode === 'ckd_early') {
    notices.push(
      '아직 병기를 모른다면 여기서 시작하되, 반드시 수의사에게 IRIS 병기를 확인하세요. 실제 3-4기라면 관리 강도가 달라져요.',
    );
  }
  if (primaryMode === 'ckd_34') {
    notices.push('3-4기는 완전 상용 신장식과 인결합제(약물)·수분 관리가 핵심이에요. 인 데이터가 부족한 후보는 신뢰도를 낮게 표시했어요.');
  }
  if (input.diseases.includes('diabetes')) {
    notices.push(
      '인슐린·SGLT2 억제제 치료 중이면 사료 변경이 약물 요구량을 바꿀 수 있어요. 반드시 수의사 조정과 함께 진행하세요.',
    );
  }
  if (input.diseases.length >= 3) {
    notices.push('질환이 여러 개라 모두 만족하는 상용식이 없을 수 있어요. 우선 질환을 정해 수의사와 상의하세요.');
  } else if (input.diseases.length === 2 && primaryMode) {
    const secondary = input.diseases.find((d) => d !== primaryMode);
    if (secondary) {
      notices.push(
        `${modeLabel(primaryMode)}을(를) 우선으로 보고 ${modeLabel(secondary)}은(는) 보조로 반영했어요. 두 질환을 동시에 만족하는 상용식이 없으면 수의사와 약물 관리를 상의하세요.`,
      );
    }
  }
  if (primaryMode === 'pancreatitis') {
    notices.push(
      '고양이 췌장염은 지방 제한보다 잘 먹는 것이 우선이에요(ACVIM 2021). 최근 진단·입원 중(급성)이라면 사료 선택보다 수의사 진료가 먼저예요.',
    );
  }
  // 추천 범위 '건식만' 경고(2026-10-22) — 온보딩 '추천 받기' 확인 창과 같은 문구(form-filter-warnings.ts).
  notices.push(...formFilterWarnings(input));
  if (opts.formFilterRelaxed) {
    notices.push(
      `추천 범위(${input.formFilter})에 맞는 사료가 없어 전체 제형에서 골랐어요.`,
    );
  }
  if (opts.heldCount && opts.heldCount > 0) {
    notices.push(
      `인 데이터가 없는 후보 ${opts.heldCount}개는 3-4기 추천에서 보류했어요(신뢰도 기준). 인 함량은 제조사 영양 분석표로 확인할 수 있어요.`,
    );
  }
  return notices;
}
