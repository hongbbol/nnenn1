/**
 * 질환 모드 → 한글 라벨. 의존성 없는 순수 모듈(클라이언트 번들에서 안전하게 import 가능).
 * 엔진/사료 데이터를 끌어오는 selector.ts 대신 여기서만 라벨을 가져온다.
 */
import type { DiseaseMode } from './types';

export const MODE_LABEL: Record<DiseaseMode, string> = {
  ckd_early: '신부전 초기/의심',
  ckd_12: '신부전 1-2기',
  ckd_34: '신부전 3-4기',
  diabetes: '당뇨',
  struvite: '결석 (스트루바이트)',
  oxalate: '결석 (옥살레이트)',
  ibd: 'IBD/만성 장병증',
  pancreatitis: '췌장염',
};

export function modeLabel(mode: DiseaseMode): string {
  return MODE_LABEL[mode];
}
