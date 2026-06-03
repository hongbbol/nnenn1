# 맞사료 — One-Page 기획서

## 1. 컨셉 (한 줄 정의)
중노령·질환 고양이 보호자가 내 아이 조건에 맞는 사료를 이유와 함께 추천받고, 현재 사료와 비교해 전환 판단까지 돕는 웹 서비스

## 2. 기술 스택
- **프레임워크**: Next.js (App Router) + Tailwind CSS + TypeScript
- **데이터 저장**: Supabase (Postgres + Auth)
- **에셋**: Lucide React 아이콘, Google Fonts (Noto Sans KR)

## 3. 핵심 기능 (최대 3개)
1. **고양이 프로필 입력** — 출생년도 입력 → 자동 나이 계산 → 연령 그룹(7+/11+/15+) 자동 분류, 체중, 질환(신부전·당뇨·결석 등), 현재 사료, 급여 목표를 단계별로 입력
2. **조건 기반 사료 추천 TOP 2** — 연령·질환·성분 적합성을 기준으로 사료 2개를 추천하고, 각각 왜 맞는지 자연어로 설명 + 주의 포인트 표시
3. **현재 사료 vs 추천 사료 비교 + 저장** — 조단백·조지방·인·나트륨·칼로리·급여량을 표 형태로 비교하고, 추천/비교 결과를 저장해 재방문 유도

## 4. 디자인 컨셉 (Look & Feel)
- **스타일**: 깔끔·실용·차분 — 둥근 카드 레이아웃, 충분한 여백, 모바일 반응형
- **컬러**: 메인 #FFFFFF(화이트), 텍스트 #000000(블랙), 포인트1 #CEE6F7(연한 파랑), 포인트2 #F6CC46(노란 강조)
- **모션**: 프로필 입력 단계 전환 시 슬라이드, 추천 카드 등장 시 페이드인

## 5. 데이터 구조

### 고양이 프로필 테이블
```json
{
  "user_id": "uuid",
  "cat_id": "uuid",
  "birth_year": "number (출생년도, 유저 입력)",
  "age_group": "7+ | 11+ | 15+ (birth_year 기반 자동 계산)",
  "weight": "number (kg)",
  "neutered": "boolean",
  "health_conditions": ["신부전", "당뇨", "결석", "IBD", "췌장염"],
  "diet_type": "건식 | 습식 | 혼합",
  "current_food": "string (현재 급여 사료명)",
  "avoid_ingredients": ["string"],
  "goal": "체중관리 | 중노령전환 | 요로관리 | 질환관리"
}
```

### 사료 DB 테이블
```json
{
  "product_id": "uuid",
  "brand": "string",
  "product_name": "string",
  "category": "건식 | 습식",
  "age_fit": ["7+", "11+", "15+"],
  "condition_fit": ["신부전", "당뇨", "결석", "IBD", "췌장염"],
  "protein": "number (%)",
  "fat": "number (%)",
  "fiber": "number (%)",
  "ash": "number (%)",
  "moisture": "number (%)",
  "phosphorus": "number (%)",
  "sodium": "number (%)",
  "kcal": "number (kcal/100g)",
  "ingredient_summary": "string",
  "form": "string",
  "purchase_link": "string",
  "active_status": "boolean"
}
```

### 추천 로그 테이블
```json
{
  "user_id": "uuid",
  "cat_id": "uuid",
  "query_time": "timestamp",
  "recommended_products": ["product_id", "product_id"],
  "clicked_product": "product_id | null",
  "saved_product": "product_id | null"
}
```

## 6. 화면 구성 (MVP)
1. **랜딩** — 서비스 가치 전달 + 프로필 작성 CTA
2. **프로필 입력** — 기본 정보 → 현재 식단 → 건강 상태 → 목표 선택 (단계별)
3. **추천 결과** — 아이 프로필 요약 + 추천 TOP 2 카드 (이유·주의 포인트 포함)
4. **비교 페이지** — 현재 사료 vs 추천 사료 성분·급여량 비교 표 + 요약 문장
5. **저장 목록** — 저장한 사료 / 최근 비교 기록 / 최근 본 추천
6. **관리자 페이지** — 사료 DB 등록/수정, 연령·질환 태그 관리, 추천 결과 검수
