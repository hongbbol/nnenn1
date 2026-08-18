/**
 * 사료 선택용 경량 옵션 소스 (검색·표시 전용).
 *
 * 추천용 전체 `Food`가 아니라 UI에서 검색·렌더링에 필요한 필드만 노출한다.
 * 실서비스 옵션은 DB `foods`(kr_available)에서 오고(`@/lib/data/queries`의
 * `getFoodOptionRows`), 여기의 `getFoodOptions()`는 시드 파생 폴백(로컬/미시드 환경)이다.
 *
 * DB 브랜드명은 영문("Royal Canin")이고 제품명만 한글이라, 사용자가 "로얄캐닌"처럼
 * 한글로 검색해도 매칭되도록 KR 유통 브랜드의 한글 별칭 테이블을 함께 둔다.
 */
import { SEED_FOODS } from './foods-data';

export type FoodOption = {
  id: string;
  brand: string;
  productName: string;
  category: '건식' | '습식';
};

/** 시드 파생 옵션(폴백 전용). DB가 비어 있거나 조회 실패 시 사용. */
export function getFoodOptions(): FoodOption[] {
  return SEED_FOODS.filter((f) => f.active).map((f) => ({
    id: f.id,
    brand: f.brand,
    productName: f.product_name,
    category: f.category,
  }));
}

/** 옵션의 사용자 표시 라벨. */
export function foodOptionLabel(o: FoodOption): string {
  return `${o.brand} ${o.productName}`;
}

/**
 * KR 유통 브랜드의 한글 별칭(검색 전용, 표기는 원문 유지).
 * 국내 쇼핑몰 통용 표기 기준 — 표기 흔들림이 있는 브랜드는 복수 별칭.
 */
export const BRAND_ALIASES_KO: Record<string, string[]> = {
  Acana: ['아카나'],
  Aleva: ['알레바'],
  'Addiction Pet Foods': ['어딕션'],
  'Advance (Affinity)': ['어드밴스'],
  Aixia: ['아이시아'],
  'Almo Nature': ['알모네이쳐', '알모네이처'],
  Animonda: ['아니몬다'],
  Applaws: ['어플라우즈', '어플로스', '아플로스'],
  'Blue Buffalo': ['블루버팔로'],
  Bonacibo: ['보나시보'],
  Boreal: ['보레알'],
  Brit: ['브릿'],
  Canagan: ['카나간'],
  Carna4: ['카르나4', '카나포'],
  Carnilove: ['카니러브'],
  Catit: ['캣잇'],
  'Catz Finefood': ['캣츠파인푸드'],
  'Club 4 Paws': ['클럽4포즈', '클럽포포즈'],
  'Earthborn Holistic': ['어스본'],
  Eminent: ['에미넌트'],
  Equilíbrio: ['이퀼리브리오', '에퀼리브리오'],
  'Fancy Feast': ['팬시피스트'],
  Farmina: ['파미나'],
  'Feline Natural': ['필라인내추럴', '피라인내추럴'],
  Forza10: ['포르자10', '포르자텐', '포르자'],
  Friskies: ['프리스키'],
  'Fussie Cat': ['퍼시캣', '푸시캣'],
  GimCat: ['짐캣', '김캣'],
  GranataPet: ['그라나타펫'],
  'Green Petfood': ['그린펫푸드'],
  'Greenies Feline': ['그리니즈'],
  'Halo Pets': ['헤일로'],
  Harringtons: ['해링턴'],
  "Hill's Pet Nutrition": ['힐스'],
  Husse: ['후새', '후세', '후쎄'],
  Inaba: ['이나바', '챠오', '차오'],
  Instinct: ['인스팅트'],
  Josera: ['조세라'],
  JosiCat: ['조시캣'],
  'Kirkland Signature': ['커클랜드'],
  Leonardo: ['레오나르도'],
  Lifestyle: ['라이프스타일'],
  Lotus: ['로터스'],
  MERA: ['메라'],
  'Maruha Nichiro Pet': ['마루하니치로', '마루하'],
  'Me-O': ['미오'],
  Monge: ['몬지', '몽쥬'],
  'Natural Balance': ['내추럴발란스', '내츄럴발란스'],
  "Nature's Protection": ['네이쳐스프로텍션', '네이처스프로텍션'],
  'Northwest Naturals': ['노스웨스트 내추럴', '노스웨스트내추럴', '노스웨스트내추럴스'],
  Nulo: ['눌로'],
  Nutrience: ['뉴트리언스'],
  Nutro: ['뉴트로'],
  'Open Farm': ['오픈팜'],
  Optimeal: ['옵티밀'],
  Orijen: ['오리젠'],
  Petcurean: ['펫큐리안', '고내추럴'],
  'Primal Pet Foods': ['프라이멀'],
  'Pro-Nutrition Flatazor': ['프로뉴트리션', '플라타조'],
  Profine: ['프로파인'],
  Purina: ['퓨리나'],
  Reflex: ['리플렉스'],
  'Royal Canin': ['로얄캐닌', '로열캐닌'],
  "Sam's Field": ['샘스필드'],
  Sanabelle: ['사나벨', '보쉬사나벨'],
  Schesir: ['쉐시르', '셰시르'],
  Sheba: ['쉬바', '시바'],
  'Smallbatch Pets': ['스몰배치'],
  'Snappy Tom': ['스내피톰'],
  'Solid Gold': ['솔리드골드'],
  "Stella & Chewy's": ['스텔라앤츄이스', '스텔라앤듀이'],
  "Steve's Real Food": ['스티브스리얼푸드'],
  'Taste of the Wild': ['테이스트오브더와일드'],
  Temptations: ['템테이션'],
  'Terra Canis': ['테라카니스'],
  'The Honest Kitchen': ['어니스트키친'],
  'Tiki Cat': ['티키캣'],
  Tomojo: ['토모조'],
  Vitakraft: ['비타크래프트'],
  'Vital Essentials': ['바이탈에센셜'],
  Wanpy: ['완피'],
  'Wellness Natural Pet Food': ['웰니스'],
  Weruva: ['웨루바'],
  Whiskas: ['위스카스'],
  ZEAL: ['지알', '질'],
  'ZIWI Peak': ['지위픽', '지위'],
};

/** 검색 결과 최대 노출 개수. 브랜드당 SKU가 수십 개(로얄캐닌 89)라 8은 부족 — 12로 상향. */
export const FOOD_OPTION_RESULT_LIMIT = 12;

/** 옵션의 검색 대상 문자열(소문자·공백제거) — 브랜드 원문 + 한글 별칭 + 제품명. */
function searchHay(o: FoodOption): string {
  const aliases = BRAND_ALIASES_KO[o.brand] ?? [];
  return `${o.brand} ${aliases.join(' ')} ${o.productName}`.toLowerCase().replace(/\s+/g, '');
}

/**
 * 옵션을 검색어로 필터링. 공백으로 나눈 토큰이 모두 부분일치해야 한다(AND) —
 * "로얄캐닌 레날"처럼 브랜드(별칭)와 제품명을 섞어 검색할 수 있다.
 * 빈 쿼리는 빈 배열을 반환(드롭다운 미노출). 결과는 상위 N개로 cap.
 */
export function filterFoodOptions(
  options: FoodOption[],
  query: string,
  limit: number = FOOD_OPTION_RESULT_LIMIT,
): FoodOption[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const out: FoodOption[] = [];
  for (const o of options) {
    const hay = searchHay(o);
    if (tokens.every((t) => hay.includes(t))) {
      out.push(o);
      if (out.length >= limit) break;
    }
  }
  return out;
}
