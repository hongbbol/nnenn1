#!/usr/bin/env python3
"""
nnenn2 cat_food_research.xlsx → foods.seed.json (방향 A: SKU 1행 = foods 1행).

정규화된 nnenn2 시트(Lines/SKUs/Nutrition/Ingredients/FeedingGuide)를 조인해
nnenn1 `foods` 평탄 스키마로 변환한다. 출력 JSON은 git에서 리뷰 가능하며,
seed-foods.mjs가 source_sku_id 기준으로 멱등 upsert 한다.

사용법:
  python3 scripts/etl/build_foods_json.py [XLSX_PATH]
  (기본 XLSX_PATH=~/Desktop/nnenn2/cat_food_research.xlsx)
"""
import json
import os
import re
import sys

import openpyxl

DEFAULT_XLSX = os.path.expanduser("~/Desktop/nnenn2/cat_food_research.xlsx")
OUT_PATH = os.path.join(os.path.dirname(__file__), "foods.seed.json")

# nnenn1 src/lib/domain/ingredient-synonyms.ts 와 동기화 (avoid 매칭용)
INGREDIENT_SYNONYMS = {
    "닭": ["닭", "닭고기", "치킨", "chicken"],
    "소고기": ["소고기", "쇠고기", "우육", "beef"],
    "생선": ["생선", "어류", "연어", "참치", "대구", "salmon", "tuna"],
    "연어": ["연어", "salmon"],
    "곡물": ["곡물", "옥수수", "밀", "쌀", "보리", "corn", "wheat", "rice"],
    "옥수수": ["옥수수", "corn"],
    "유제품": ["유제품", "우유", "치즈", "요거트", "dairy", "milk"],
}


def read_sheet(wb, name):
    ws = wb[name]
    rows = list(ws.iter_rows(values_only=True))
    header = rows[0]
    # 1행(인덱스 1)은 한글 라벨 → 실데이터는 2행부터
    out = []
    for r in rows[2:]:
        if any(v not in (None, "") for v in r):
            out.append(dict(zip(header, r)))
    return out


def num(v):
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        return float(v)
    m = re.search(r"-?\d+(?:\.\d+)?", str(v))
    return float(m.group()) if m else None


WET_KW_EN = ["wet", "canned", "can", "pouch", "pate", "pâté", "paté", "purée", "puree",
             "churu", "jelly", "gravy", "broth", "stew", "mousse", "frozen"]
WET_KW_KO = ["습식", "캔", "파우치", "퓨레", "츄루", "젤리", "그레이비", "음료", "무스", "냉동"]
DRY_KW_EN = ["dry", "kibble", "freeze-dried", "air-dried"]
DRY_KW_KO = ["드라이", "동결건조", "에어드라이"]
# 물에 타거나 불려서 급여하는 제품(대용유·인스턴트 브로스·탈수식)은 분말 수분과 무관하게
# 습식(2026-07-21 사용자 확정). 단, '밀크 맛' 건식 사료(Tuna & Milk·leche 표기 포함 12종)가
# 있어 일반 'milk' 키워드는 쓰지 않고 제품 유형 문구만 매칭.
# ⚠ '탈수'는 재수화 급여(THK 홀메이드·소조스), '동결건조/에어드라이'는 그대로 급여(건식) — 구분 유지.
RECONSTITUTED_KW = ["milk replacer", "babycat milk", "cat milk", "kitten milk",
                    "캣밀크", "베이비캣 밀크", "분유", "락톨", "lactol", "kmr",
                    "instant", "인스턴트", "dehydrated", "탈수"]


def _has_kw(text, en_kws, ko_kws):
    """영문은 단어 경계 매칭(ACANA/CANIDAE/Royal Canin의 'can' 오탐 방지),
    한글은 부분 매칭."""
    for k in en_kws:
        if re.search(rf"(?<![a-z0-9]){re.escape(k)}(?![a-z0-9])", text):
            return True
    return any(k in text for k in ko_kws)


def derive_category(sku_name, line_form, moisture):
    """습식/건식 판별: moisture가 있으면 그것만으로 확정, 이름/form은 보조.

    - moisture 판정을 키워드보다 먼저: 수분 6.5% 명시 SKU가 이름 키워드로
      습식 처리되던 회귀(로얄캐닌 34건, 2026-07 발견) 방지.
    - 영문 키워드는 단어 경계 매칭: 'can'⊂'Canin/Canyon/CANIDAE' 오탐 방지.
    - 혼합 라인(form='dry/wet')의 'dry'가 판별을 오염시키므로 혼합 form 제외.
    - 브랜드 '캔보'는 한글 '캔' 매칭에서 제외.
    """
    form = (line_form or "").lower()
    if "dry" in form and ("wet" in form or "/" in form):
        form = ""
    text = f"{sku_name or ''} {form}".lower().replace("캔보", "")
    # 물 개어 급여 제품(대용유·인스턴트 브로스)은 분말 수분과 무관하게 습식 — moisture 판정보다 먼저.
    if any(k in text for k in RECONSTITUTED_KW):
        return "습식"
    if moisture is not None:
        return "습식" if moisture > 50 else "건식"
    if _has_kw(text, WET_KW_EN, WET_KW_KO) and not _has_kw(text, DRY_KW_EN, DRY_KW_KO):
        return "습식"
    if _has_kw(text, DRY_KW_EN, DRY_KW_KO):
        return "건식"
    # moisture 없음 + 단서 없음 → 보수적으로 건식
    return "건식"


# derive_category 회귀 셀프테스트 — 실제 사고 사례 기반. 버그를 고칠 때마다 케이스 추가.
# 매 빌드 시작 시 실행되어 실패하면 시드를 생성하지 않는다.
_CATEGORY_SELFTEST_CASES = [
    # (sku_name, form, moisture, 기대값, 메모)
    ("Royal Canin Hairball Care", "dry/wet", None, "건식", "'can'⊂'Canin' 오탐 회귀(2026-07, 34건)"),
    ("Royal Canin AGEING 11+", "dry/wet", 6.5, "건식", "수분 명시값이 이름 키워드보다 우선"),
    ("Canyon River Feline Recipe with Trout", "dry", 10.0, "건식", "'can'⊂'Canyon' 오탐(TOTW S0084)"),
    ("Science Diet Adult Savory Chicken Entrée Canned", "dry/wet", None, "습식",
     "혼합 form 제외 후 canned 키워드 정상 매칭(힐스 L0005 회귀, f498e69)"),
    ("데일리 부스터 인스턴트 비프 본브로스", None, 8.0, "습식", "인스턴트(물 개어 급여)는 분말 수분 무관 습식(HK S0113, 2026-07-21 사용자 확정)"),
    ("홀메이드 탈수식 그레인프리 치킨 레시피 캣푸드 (Prowl)", "dry", 5.0, "습식", "탈수식(재수화 급여)도 습식(THK S0109/110·소조스 S0297, 2026-07-21 사용자 확정)"),
    ("Royal Canin Babycat Milk 베이비캣 밀크", "dry/wet", None, "습식", "대용유는 물 타는 액상 급여 → 습식(S1341)"),
    ("몽슈 발란스 건식 — 키튼 참치&밀크", "dry", 10.0, "건식", "'밀크 맛' 건식은 대용유가 아님(S1075)"),
    ("캔보 캣 스테릴라이즈드 Premium Dry", "dry", None, "건식", "브랜드 '캔보'의 '캔' 오탐 가드"),
    ("퀘스트 냉동 로우 캣푸드 치킨 레시피", None, None, "습식", "냉동 생식은 습식(S0278)"),
    ("지위픽 캣 캔식품 고등어", "wet", None, "습식", "한글 '캔' 정상 매칭"),
    ("Freeze-Dried Chicken Recipe pouch", None, None, "건식", "동결건조가 pouch 키워드에 우선"),
    ("어덜트 터키 인 그레이비 습식 캣푸드 파우치", "wet", 81.0, "습식", "일반 습식"),
]


def selftest_derive_category():
    fails = []
    for name, form, moist, expect, memo in _CATEGORY_SELFTEST_CASES:
        got = derive_category(name, form, moist)
        if got != expect:
            fails.append(f"  '{name}' (form={form}, moist={moist}) → {got}, 기대 {expect} [{memo}]")
    if fails:
        print("❌ derive_category 셀프테스트 실패:", file=sys.stderr)
        print("\n".join(fails), file=sys.stderr)
        sys.exit(1)


# 시드 불변식 감사 — 위반이면 시드를 쓰지 않고 빌드 실패.
# 알려진 예외는 사유와 함께 명시(원본 discrepancy 등록 건 등).
AUDIT_ALLOWLIST = {
    "S0588": "JW 터키 인 그레이비 — 공식 GA가 DM 의심 고수치(419kcal/100g), nnenn2 원본 discrepancy 등록 건",
}


def audit_rows(rows):
    """카테고리↔수분/칼로리 모순 전수 검사. 반환: 위반 목록(allowlist 제외)."""
    violations = []
    for r in rows:
        sid, cat = r["source_sku_id"], r["category"]
        m, k = r.get("moisture_pct"), r.get("kcal_per_100g")
        # 재수화 제품(대용유·인스턴트·탈수식)은 분말 GA(저수분·고kcal)로 습식 분류가
        # 정상이므로 습식 측 불변식에서 구조적으로 면제.
        reconstituted = any(kw in r["product_name"].lower() for kw in RECONSTITUTED_KW)
        bad = None
        if cat == "습식":
            if reconstituted:
                pass
            elif m is not None and m < 20:
                bad = f"습식인데 수분 {m}%"
            elif m is None and k is not None and k > 250:
                bad = f"습식인데 수분 미상·{k}kcal/100g"
        else:
            if m is not None and m > 50:
                bad = f"건식인데 수분 {m}%"
            elif m is None and k is not None and k < 130:
                bad = f"건식인데 수분 미상·{k}kcal/100g"
        if bad and sid not in AUDIT_ALLOWLIST:
            violations.append(f"  {sid} [{r['brand']}] {r['product_name']}: {bad}")
    return violations


def diff_against_previous(rows):
    """기존 foods.seed.json 대비 변경 요약 — 신규 브랜드 배치에 기존 행 플립이
    숨는 사고(f498e69→로얄캐닌 34건) 방지용. 출력만 하고 실패시키지 않는다."""
    if not os.path.exists(OUT_PATH):
        return
    with open(OUT_PATH, encoding="utf-8") as f:
        prev = {r["source_sku_id"]: r for r in json.load(f)}
    cur = {r["source_sku_id"]: r for r in rows}
    added = sorted(cur.keys() - prev.keys())
    removed = sorted(prev.keys() - cur.keys())
    cat_changes = [(s, prev[s]["brand"], prev[s]["product_name"], prev[s]["category"], cur[s]["category"])
                   for s in sorted(prev.keys() & cur.keys()) if prev[s]["category"] != cur[s]["category"]]
    other_changed = sum(1 for s in prev.keys() & cur.keys()
                        if prev[s] != cur[s] and prev[s]["category"] == cur[s]["category"])
    # 처방식 판정(condition_fit·'처방식' 태그)은 추천 노출을 좌우하므로 별도 표시 —
    # '기타 필드 변경' 카운트에 묻히면 OTC↔처방식 플립을 리뷰에서 놓친다.
    rx_changes = [
        (s, cur[s]["brand"], cur[s]["product_name"],
         prev[s].get("condition_fit"), cur[s].get("condition_fit"),
         "처방식" in (prev[s].get("tags") or []), "처방식" in (cur[s].get("tags") or []))
        for s in sorted(prev.keys() & cur.keys())
        if prev[s].get("condition_fit") != cur[s].get("condition_fit")
        or ("처방식" in (prev[s].get("tags") or [])) != ("처방식" in (cur[s].get("tags") or []))
    ]
    print(f"\n📋 기존 시드 대비: 신규 {len(added)} · 삭제 {len(removed)} · "
          f"category 변경 {len(cat_changes)} · 처방식 판정 변경 {len(rx_changes)} · "
          f"기타 필드 변경 {other_changed}행")
    if rx_changes:
        print("   ⚠️  기존 SKU 처방식 판정 변경 — 의도한 것인지 반드시 확인:")
        for s, brand, name, pcf, ccf, prx, crx in rx_changes[:50]:
            print(f"      {s} [{brand}] {name}: condition_fit {pcf}→{ccf} · 처방식태그 {prx}→{crx}")
        if len(rx_changes) > 50:
            print(f"      … 외 {len(rx_changes) - 50}건")
    if removed:
        print("   삭제:", ", ".join(removed[:20]), "…" if len(removed) > 20 else "")
    if cat_changes:
        from collections import Counter
        print("   ⚠️  기존 SKU category 변경 — 의도한 것인지 반드시 확인:")
        print("      브랜드별:", dict(Counter(c[1] for c in cat_changes)))
        for c in cat_changes[:50]:
            print(f"      {c[0]} [{c[1]}] {c[2]}: {c[3]}→{c[4]}")
        if len(cat_changes) > 50:
            print(f"      … 외 {len(cat_changes) - 50}건")


def derive_food_role(completeness, sku_name, life_stage):
    """주식/보조식/간식 분류 (완전성 우선, 없으면 이름)."""
    c = (completeness or "").lower()
    text = f"{sku_name or ''} {life_stage or ''}".lower()
    if "treat" in c or "간식" in c or "treat" in text:
        return "간식"
    if "supplemental" in c or "complementary" in c or "보조" in c or "supplemental" in text:
        return "보조식"
    if "complete" in c or "therapeutic" in c or "balanced" in c:
        return "주식"
    # 완전성 정보 없음 → 이름 기반
    if "treat" in text or "동결건조" in text or "freeze-dried" in text:
        return "간식"
    return "주식"


def derive_age_fit(life_stage):
    """nnenn1 버킷(1+/7+/11+/15+)으로 매핑. 키튼은 빈 배열(태그로 보존).

    의미: age_fit = "이 연령대 고양이에게 적합한가". 일반 성묘용(Adult/Sterilised/
    Therapeutic)은 노령묘에게도 급여 가능하므로 **전 성묘 버킷**. 좁히는 건
    ① 라벨이 연령 밴드를 명시한 경우(예 'Adult 1-6') ② 노령 하한 명시(7+/11+/15+)뿐.
    (버그 수정 2026-06-24: Adult→['1+']만 주던 매핑이 11세+ 고양이에게 레날 처방식
    포함 전 성묘식을 life_stage 게이트로 전멸시켰음.)
    """
    s = (life_stage or "").lower()
    if any(k in s for k in ["all life", "all ages", "전연령", "all-life"]):
        return ["1+", "7+", "11+", "15+"]
    if any(k in s for k in ["kitten", "키튼", "growth", "성장", "reproduction", "수유", "임신"]):
        return []  # nnenn1 성묘+ 버킷에 없음 → 키튼 태그로 보존
    # 노령 하한 명시 — 구체 연령이 있으면 세분화.
    if re.search(r"1[5-9]\s*\+|1[5-9]\s*세", s):
        return ["15+"]
    if re.search(r"1[1-4]\s*\+|1[1-4]\s*세", s):
        return ["11+", "15+"]
    if any(k in s for k in ["senior", "mature", "7+", "8+", "9+", "10+", "노령", "시니어", "고령"]):
        return ["7+", "11+", "15+"]
    # 성묘 연령 밴드 명시(예 'Adult 1-6', '1~6세') → 젊은 성묘 한정.
    if re.search(r"\b1\s*[-–~]\s*6\b", s):
        return ["1+"]
    # adult / maintenance / sterilised / therapeutic 등 일반 성묘용 → 전 성묘 버킷.
    return ["1+", "7+", "11+", "15+"]


# 처방식 → nnenn1 HEALTH_OPTIONS 매핑 (데이터 로직 추천용, 수의자문 추후).
# 주의: SKU 고유 필드(이름+life_stage)만으로 판별한다. Line.positioning에는
# 그 라인 전체 처방식 목록("c/d 비뇨, k/d 신장, m/d 당뇨…")이 들어 있어
# 모든 규칙에 매칭되는 과잉 매핑이 발생하므로 사용하지 않는다.
CONDITION_RULES = [
    (["urinary so", "urinary", "struvite", "스트루바이트", "비뇨", "유리너리", "c/d", "결석"],
     ["결석-스트루바이트"]),
    (["renal", "kidney", "키드니", "신장", "신부전", "k/d"],
     ["신부전 1-2기", "신부전 3-4기"]),
    (["diabet", "당뇨", "diabetic", "glycobalance"],
     ["당뇨"]),
    (["gastro", "digest", "i/d", "소화", "ibd", "intestinal", "장 질환"],
     ["IBD"]),
    (["pancrea", "췌장", "low fat", "저지방", "hepatic", "간 질환"],
     ["췌장염"]),
]


# '처방' 부분문자열 매칭은 부정문까지 처방식으로 잡는다 — 03_Lines.positioning의
# "요로 배려 기능식(처방식 아님)"(L1013 자나벨레 케어 유리너리) 같은 일반 판매용(OTC)
# 기능식이 수의사 처방식으로 분류되어 condition_fit + '처방식' 태그가 붙는다
# (2026-07-26 KR-EXP-24a 리플렉스 유리너리 S1936에서 발견). 판정 전에 부정된
# '처방' 언급만 지운다. 근접 부정어만 인정하고(10자 이내, 문장부호 미교차) '없이'류는
# 제외한다 — "수의사 처방 없이 급여 금지"는 오히려 처방식이므로.
# '아[님닌니닙녀]'로 아니- 활용형을 함께 잡는다(아님/아닌/아니다/아닙니다/아녀요).
_RX_NEGATED_RE = re.compile(
    r"(?:비|非)\s*처방"                                    # 비처방식
    r"|처방[^.,;·)\]]{0,10}?(?:아[님닌니닙녀]|불필요|무관)"  # 처방식(이) 아님 / 처방 전용이 아닌
)


def mentions_rx(text):
    """'처방' 언급 중 부정되지 않은 것이 있는가."""
    return bool(text) and "처방" in _RX_NEGATED_RE.sub("", str(text))


def derive_is_therapeutic(completeness, life_stage, line):
    """수의사 처방식(therapeutic/dietetic) 여부.

    life_stage와 positioning은 각각 따로 본다 — 이어 붙이면 한쪽의 부정문이
    다른 쪽 '처방'과 섞여 판정이 뒤집힌다.
    """
    line_name = (line.get("line_name_en") or "").lower()
    return bool(
        (completeness and "therapeutic" in completeness.lower())
        or "therapeutic" in (life_stage or "").lower()
        or mentions_rx(life_stage)
        or mentions_rx(line.get("positioning"))
        or "veterinary" in line_name
        or "rx" in line_name
    )


# derive_is_therapeutic 회귀 셀프테스트 — 실제 사고 사례 기반. 버그 수정 시마다 케이스 추가.
_THERAPEUTIC_SELFTEST_CASES = [
    # (completeness, life_stage, line, 기대값, 메모)
    (None, "Adult", {"line_name_en": "Sanabelle Care — Urinary (Dry, gluten-free)",
                     "positioning": "성묘 요로 배려 기능식(처방식 아님) — 저마그네슘(0.06%)"},
     False, "부정문 오인 회귀: OTC 기능식(L1013 S1931, 2026-07-26)"),
    (None, "Adult", {"line_name_en": "Reflex Plus Urinary",
                     "positioning": "요로 건강 지원 기능식 — 처방 전용이 아님"},
     False, "부정문 오인 회귀(L1016 S1936, KR-EXP-24a 발단)"),
    (None, "Adult", {"line_name_en": "Sanabelle Care — Urinary",
                     "positioning": "비처방 요로 배려식"},
     False, "'비처방' 접두 부정"),
    (None, "Adult", {"line_name_en": "Generic Care", "positioning": "요로 기능식입니다. 처방식 아닙니다."},
     False, "'아닙니다' 활용형 — '아니'만 보면 놓친다"),
    (None, "Adult", {"line_name_en": "Vet Diet Renal", "positioning": "수의사 처방 없이 급여 금지"},
     True, "'없이'는 부정어에서 제외 — 오히려 처방식 신호"),
    (None, "Adult", {"line_name_en": "Calibra Veterinary Diets (VD) Cat",
                     "positioning": "처방식(complete dietetic) — 요로/신장/소화 등. 수의사 관리 하 급여."},
     True, "정상 처방식은 그대로 True (L0230)"),
    (None, "Adult", {"line_name_en": "Integra Protect Urinary Struvite — Dry (Veterinary Diet)",
                     "positioning": "성묘 스트루바이트 결석 재발 억제용 처방식(식이요법식)"},
     True, "정상 처방식 (L1007)"),
    ("Complete (therapeutic)", "Adult", {"line_name_en": "Vet Life", "positioning": None},
     True, "completeness 신호는 positioning과 무관하게 유지"),
    (None, "Adult", {"line_name_en": "Sanabelle Adult", "positioning": "일반 성묘식"},
     False, "일반식"),
]


def selftest_derive_is_therapeutic():
    fails = []
    for completeness, life_stage, line, expect, memo in _THERAPEUTIC_SELFTEST_CASES:
        got = derive_is_therapeutic(completeness, life_stage, line)
        if got != expect:
            fails.append(f"  {line.get('line_name_en')!r} / {line.get('positioning')!r} "
                         f"→ {got}, 기대 {expect} [{memo}]")
    if fails:
        print("❌ derive_is_therapeutic 셀프테스트 실패:", file=sys.stderr)
        print("\n".join(fails), file=sys.stderr)
        sys.exit(1)


def derive_condition_fit(is_therapeutic, sku_name_en, sku_name_ko, life_stage):
    """처방식만, SKU 고유 텍스트(이름+life_stage)로 한정 매핑."""
    if not is_therapeutic:
        return []
    blob = " ".join(t for t in (sku_name_en, sku_name_ko, life_stage) if t).lower()
    out = []
    for keys, conds in CONDITION_RULES:
        if any(k in blob for k in keys):
            for c in conds:
                if c not in out:
                    out.append(c)
    return out


# 곡물 판별은 명시 토큰만 사용한다. 한글 '밀'은 'meal'(치킨 밀=chicken meal)의
# 음역으로도 쓰여 bare '밀'을 wheat로 보면 무곡물 사료에 오탐이 난다. 따라서
# wheat은 '통밀/밀가루/밀 글루텐/소맥/wheat' 형태로만 인식한다.
GRAIN_TOKENS = [
    "곡물", "옥수수", "corn", "쌀", "rice", "현미", "보리", "barley",
    "wheat", "통밀", "밀가루", "밀 글루텐", "소맥", "귀리", "oat", "수수", "sorghum",
]


def derive_keywords_and_summary(ings):
    """원재료 → 정규화 키워드(avoid 매칭용, 소문자) + 상위 요약."""
    ings_sorted = sorted(
        ings, key=lambda i: (i.get("order_index") if isinstance(i.get("order_index"), (int, float)) else 999)
    )
    names_ko = [i.get("ingredient_name_ko") or i.get("ingredient_name_en") for i in ings_sorted]
    names_ko = [n for n in names_ko if n]
    summary = ", ".join(names_ko[:6]) if names_ko else None

    blob = " ".join(
        f"{i.get('ingredient_name_ko') or ''} {i.get('ingredient_name_en') or ''}" for i in ings
    ).lower()
    kw = set()
    for canon, syns in INGREDIENT_SYNONYMS.items():
        if canon == "곡물":
            matched = [t for t in GRAIN_TOKENS if t.lower() in blob]
        else:
            matched = [s for s in syns if s.lower() in blob]
        if matched:
            kw.add(canon.lower())
            for m in matched:
                kw.add(m.lower())
    return sorted(kw), summary


def build_nutrition(n, category):
    """as-fed 우선. 건식이고 as-fed 없으면 DM값을 수분 8% 가정으로 환산.

    일부 제품(Hill's Typical Nutrient Profile 등)은 DM(건물기준)만 공개한다.
    건식 사료는 수분이 ~8%로 일정해 as-fed ≈ DM × 0.92 로 환산 가능.
    환산한 행은 호출부에서 '영양추정(DM환산)' 태그로 표시한다.
    반환: (값 dict, estimated bool)
    """
    AF_TO_DM = {
        "protein_pct": ("crude_protein_pct", "crude_protein_dm_pct"),
        "fat_pct": ("crude_fat_pct", "crude_fat_dm_pct"),
        "fiber_pct": ("crude_fiber_pct", "crude_fiber_dm_pct"),
        "ash_pct": ("ash_pct", "ash_dm_pct"),
        "phosphorus_pct": ("phosphorus_pct", "phosphorus_dm_pct"),
        "omega3_pct": ("omega3_pct", "omega3_dm_pct"),
        # 미네랄·지방산 레버(데이터스키마 §영양 — CKD·요로·노령) — 2026-06-11 nnenn2 스키마 확장분
        "sodium_pct": ("sodium_pct", "sodium_dm_pct"),
        "potassium_pct": ("potassium_pct", "potassium_dm_pct"),
        "chloride_pct": ("chloride_pct", "chloride_dm_pct"),
        "taurine_pct": ("taurine_pct", "taurine_dm_pct"),
        "epa_dha_pct": ("epa_dha_pct", "epa_dha_dm_pct"),
    }
    DRY_MOISTURE = 8.0
    factor = (100 - DRY_MOISTURE) / 100.0

    out = {}
    moisture = num(n.get("moisture_pct"))
    has_asfed = num(n.get("crude_protein_pct")) is not None
    estimated = False

    for af_key, (af_col, dm_col) in AF_TO_DM.items():
        v = num(n.get(af_col))
        if v is None and category == "건식":
            dm = num(n.get(dm_col))
            if dm is not None:
                v = round(dm * factor, 1) if af_key in ("protein_pct", "fat_pct", "fiber_pct", "ash_pct") else round(dm * factor, 2)
                estimated = True
        out[af_key] = v

    # EPA+DHA 합산값이 없고 개별 EPA·DHA가 둘 다 있으면 합산(as-fed).
    if out.get("epa_dha_pct") is None:
        epa, dha = num(n.get("epa_pct")), num(n.get("dha_pct"))
        if epa is not None and dha is not None:
            out["epa_dha_pct"] = round(epa + dha, 3)

    # 건식인데 as-fed 영양을 DM에서 환산했고 수분도 없으면 가정값(8%)으로 채워 내부 정합성 유지
    if estimated and moisture is None and category == "건식":
        moisture = DRY_MOISTURE
    out["moisture_pct"] = moisture
    out["kcal_per_100g"] = num(n.get("kcal_per_100g"))
    return out, estimated


def nutrition_rank(analysis_type):
    """영양행 우선순위(낮을수록 우선) — nnenn2 확정 정책 2 '실측 평균 > Typical >
    Guaranteed/Analytical Constituents'. 등록·보증성분(min/max 규제값)은 맨 뒤.

    검사 순서가 중요: 'Analytical constituents (typical)'은 typical로 분류한다.
    """
    a = (analysis_type or "").lower()
    if "measured" in a or "실측" in a:
        return 0
    if "typical" in a:
        return 1
    if "guaranteed" in a or "등록성분" in a or "보증성분" in a or "保証成分" in a:
        return 3
    return 2  # analytical constituents · 표시성분 등 선언값


def select_nutrition(rows):
    """SKU의 영양행 여러 개 → 대표 1개 dict로 병합.

    🔴 왜 필요한가(2026-08-24 실측): 종전엔 `{sku_id: n}` dict라 **시트의 마지막 행이
    조용히 이겼다.** Feline Natural S0996~S0998(GA 매크로 행 + Typical 미네랄 행의 상보
    구성)에서 뒤의 Typical 행이 GA를 덮어 시드의 단백·지방·수분·kcal이 전부 null로
    빠져 있었다(발견 계기 = 24l에서 KR 등록성분 행 append가 같은 경로로 EU 값을 뒤집는
    것을 시드 diff가 검출).

    규칙:
    - primary = 우선순위(nutrition_rank) 최상위 행. 동순위면 시트 순서(안정 정렬).
    - 필드 보충은 **primary와 data_region이 같은 행만** 참여 — 지역이 다른 행(예: EU
      현행 행 + KR 등록성분 행)을 섞으면 그 자체가 cross-attribution(정책 4)이고,
      KR/JP 등록·보증성분의 min/max 규제값이 CKD 인 레버 같은 수치 레버로 새어든다.
      기록 목적으로 append된 행은 시드에 반영되지 않는 게 맞다.
    - 보충은 필드 단위: primary에 비어 있는 필드만 차순위 행 값으로 채운다.
    """
    if len(rows) == 1:
        return rows[0]
    ordered = sorted(rows, key=lambda r: nutrition_rank(r.get("analysis_type")))
    primary = ordered[0]
    region = (primary.get("data_region") or "").strip()
    merged = dict(primary)
    for r in ordered[1:]:
        if (r.get("data_region") or "").strip() != region:
            continue
        for k, v in r.items():
            if v in (None, "") :
                continue
            if merged.get(k) in (None, ""):
                merged[k] = v
    return merged


# select_nutrition 회귀 셀프테스트 — 실제 사고 사례 기반.
_NUTRITION_SELECT_CASES = [
    # (rows, 기대 필드값, 메모)
    ([{"analysis_type": "Guaranteed Analysis (as-fed)", "data_region": "NZ",
       "crude_protein_pct": "48", "kcal_per_100g": "487"},
      {"analysis_type": "Typical Analysis (as-fed)", "data_region": "NZ",
       "calcium_pct": "1.7"}],
     {"crude_protein_pct": "48", "calcium_pct": "1.7", "kcal_per_100g": "487"},
     "S0996 상보 병합 — Typical(primary) 미네랄 + GA 매크로 복원(2026-08-24 회귀)"),
    ([{"analysis_type": "Analytische Bestandteile (FEDIAF, as-fed)", "data_region": "EU(DE)",
       "crude_protein_pct": "8", "calcium_pct": ""},
      {"analysis_type": "KR 등록성분 (한글표시사항, min/max)", "data_region": "KR",
       "crude_protein_pct": "6.0", "calcium_pct": "0.09"}],
     {"crude_protein_pct": "8", "calcium_pct": ""},
     "S1983 — KR 등록성분(min/max·타지역)은 primary를 덮지도, 빈 필드를 채우지도 않는다"),
    ([{"analysis_type": "Guaranteed Analysis (as-fed)", "data_region": "US",
       "crude_protein_pct": "30"},
      {"analysis_type": "Measured Average", "data_region": "US",
       "crude_protein_pct": "32"}],
     {"crude_protein_pct": "32"},
     "실측 평균 > GA (확정 정책 2)"),
]


def selftest_select_nutrition():
    fails = []
    for rows, expect, memo in _NUTRITION_SELECT_CASES:
        got = select_nutrition([dict(r) for r in rows])
        for k, v in expect.items():
            if (got.get(k) or "") != v:
                fails.append(f"  {memo}: {k} → {got.get(k)!r}, 기대 {v!r}")
    if fails:
        print("❌ select_nutrition 셀프테스트 실패:", file=sys.stderr)
        print("\n".join(fails), file=sys.stderr)
        sys.exit(1)


def derive_rec_daily_g(feeds):
    """4kg 성묘 기준 행의 min/max 중간값. 깔끔한 행 없으면 None."""
    best = None
    best_dist = 999
    for f in feeds:
        kg = num(f.get("cat_weight_kg_range"))
        gmin = num(f.get("daily_amount_g_min"))
        gmax = num(f.get("daily_amount_g_max"))
        if kg is None or (gmin is None and gmax is None):
            continue
        dist = abs(kg - 4.0)
        if dist < best_dist:
            best_dist = dist
            vals = [v for v in (gmin, gmax) if v is not None]
            best = round(sum(vals) / len(vals))
    return best


def derive_tags(role, life_stage, sku_name_en, sku_name_ko, is_therapeutic):
    # SKU 고유 필드만 사용 (Line.positioning은 라인 전체 범위가 들어와 오탐 유발)
    tags = [role]
    text = f"{life_stage or ''} {sku_name_en or ''} {sku_name_ko or ''}".lower()
    if is_therapeutic:
        tags.append("처방식")
    if any(k in text for k in ["kitten", "키튼", "growth"]):
        tags.append("키튼")
    if any(k in text for k in ["indoor", "인도어", "실내"]):
        tags.append("인도어")
    if any(k in text for k in ["steril", "neuter", "중성화", "sterilised", "sterilized"]):
        tags.append("중성화")
    if any(k in text for k in ["grain-free", "grain free", "그레인프리", "무곡물"]):
        tags.append("그레인프리")
    if any(k in text for k in ["all life", "all ages", "전연령"]):
        tags.append("전연령")
    # 중복 제거, 순서 유지
    seen, out = set(), []
    for t in tags:
        if t not in seen:
            seen.add(t)
            out.append(t)
    return out


def main():
    selftest_derive_category()
    selftest_derive_is_therapeutic()
    selftest_select_nutrition()
    xlsx = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XLSX
    if not os.path.exists(xlsx):
        print(f"ERROR: xlsx not found: {xlsx}", file=sys.stderr)
        sys.exit(1)
    wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)

    # 브랜드 KR 유통(02_Brands.kr_distributed) — 2026-06 네이버 Open API 전수검증 완료값.
    brands_kr = {b["brand_id"]: (b.get("kr_distributed") or "").strip()
                 for b in read_sheet(wb, "02_Brands")}
    lines = {l["line_id"]: l for l in read_sheet(wb, "03_Lines")}
    skus = read_sheet(wb, "04_SKUs")
    _nut_rows = {}
    for n in read_sheet(wb, "06_Nutrition"):
        _nut_rows.setdefault(n["sku_id"], []).append(n)
    # SKU당 복수 영양행은 우선순위 병합(select_nutrition) — last-wins 금지
    nut = {sid: select_nutrition(rows) for sid, rows in _nut_rows.items()}
    ings_by_sku = {}
    for i in read_sheet(wb, "05_Ingredients"):
        ings_by_sku.setdefault(i["sku_id"], []).append(i)
    feeds_by_sku = {}
    for f in read_sheet(wb, "07_FeedingGuide"):
        feeds_by_sku.setdefault(f["sku_id"], []).append(f)

    rows = []
    warnings = []
    for s in skus:
        sid = s["sku_id"]
        line = lines.get(s.get("line_id"), {})
        n = nut.get(sid, {})
        ings = ings_by_sku.get(sid, [])
        feeds = feeds_by_sku.get(sid, [])

        life_stage = s.get("life_stage")
        completeness = n.get("completeness")
        moisture = num(n.get("moisture_pct"))
        # form: SKU 단위 값(04_SKUs.form — 있으면 원본 명시가 최우선)이 라인 값보다 우선.
        # 라인 form은 'dry/wet' 혼합이 많아 이름 추측이 필요해지는 근본 원인 — T2부터
        # 수집 시 SKU 단위로 기록한다(KR_SKU_EXPANSION_PLAN §수집 규칙).
        sku_form = s.get("form") or line.get("form")
        category = derive_category(s.get("sku_name_en") or s.get("sku_name_ko"),
                                   sku_form, moisture)
        role = derive_food_role(completeness, s.get("sku_name_en"), life_stage)
        age_fit = derive_age_fit(life_stage)

        is_therapeutic = derive_is_therapeutic(completeness, life_stage, line)
        condition_fit = derive_condition_fit(
            is_therapeutic, s.get("sku_name_en"), s.get("sku_name_ko"), life_stage,
        )
        nutri, estimated = build_nutrition(n, category)
        keywords, summary = derive_keywords_and_summary(ings)

        # 한국 구매 가능 — 브랜드 Yes × 라인 Yes 만 true (데이터스키마 §유통 kr_distributed).
        brand_kr = brands_kr.get(line.get("brand_id"), "")
        line_kr = (line.get("kr_line_available") or "").strip()
        kr_available = brand_kr == "Yes" and line_kr == "Yes"
        # SKU 단위 미유통 확정(사용자 3차 확인) — 04_SKUs notes 태그로 오버라이드.
        # 라인은 유통 중이나 특정 SKU만 미수입/판매중단인 경우(예: 지위픽 스팀드라이 생선).
        if kr_available and "[KR-NOT-DISTRIBUTED" in str(s.get("notes") or ""):
            kr_available = False
        rec_daily_g = derive_rec_daily_g(feeds)
        tags = derive_tags(role, life_stage, s.get("sku_name_en"),
                           s.get("sku_name_ko"), is_therapeutic)
        if estimated:
            tags.append("영양추정(DM환산)")

        row = {
            "source_sku_id": sid,
            "brand": line.get("brand_name"),
            "product_name": s.get("sku_name_ko") or s.get("sku_name_en"),
            "category": category,
            "age_fit": age_fit,
            "condition_fit": condition_fit,
            "protein_pct": nutri["protein_pct"],
            "fat_pct": nutri["fat_pct"],
            "fiber_pct": nutri["fiber_pct"],
            "ash_pct": nutri["ash_pct"],
            "moisture_pct": nutri["moisture_pct"],
            "phosphorus_pct": nutri["phosphorus_pct"],
            "sodium_pct": nutri["sodium_pct"],
            "potassium_pct": nutri["potassium_pct"],
            "chloride_pct": nutri["chloride_pct"],
            "taurine_pct": nutri["taurine_pct"],
            "epa_dha_pct": nutri["epa_dha_pct"],
            "omega3_pct": nutri["omega3_pct"],
            "kcal_per_100g": nutri["kcal_per_100g"],
            "ingredient_summary": summary,
            "ingredient_keywords": keywords,
            "form": sku_form,
            "rec_daily_g": rec_daily_g,
            "tags": tags,
            "image_url": None,
            "affiliate_links": None,
            "price_per_kg_krw": None,
            "active": True,
            "kr_available": kr_available,
            "food_role": role,
            "life_stage_raw": life_stage,
        }
        rows.append(row)

        # 브랜드 Yes인데 라인 KR 미확정(Unknown/공란) → 검토 대상으로 경고
        if brand_kr == "Yes" and line_kr not in ("Yes", "No"):
            warnings.append(f"{sid}: 브랜드 KR=Yes인데 라인 kr_line_available='{line_kr}' (미확정 → kr_available=false 처리)")

        # 데이터 품질 경고
        if not row["brand"]:
            warnings.append(f"{sid}: brand 누락 (line_id={s.get('line_id')})")
        if not row["product_name"]:
            warnings.append(f"{sid}: product_name 누락")
        if sid not in nut:
            warnings.append(f"{sid}: 영양 데이터 없음 (nutrition null)")
        if is_therapeutic and not condition_fit:
            warnings.append(f"{sid}: 처방식인데 condition_fit 매핑 실패 — '{life_stage}' / '{line.get('positioning')}'")

    # 불변식 감사 — 위반이면 시드를 쓰지 않고 실패 (allowlist 예외는 AUDIT_ALLOWLIST).
    violations = audit_rows(rows)
    if violations:
        print(f"❌ 카테고리 불변식 위반 {len(violations)}건 — 시드 미생성:", file=sys.stderr)
        print("\n".join(violations), file=sys.stderr)
        print("   (데이터가 맞다면 사유와 함께 AUDIT_ALLOWLIST에 추가)", file=sys.stderr)
        sys.exit(1)

    # 기존 시드 대비 변경 요약 (덮어쓰기 전에 비교).
    diff_against_previous(rows)

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)

    # 요약 리포트
    from collections import Counter
    print(f"✅ {len(rows)} foods → {OUT_PATH}")
    print("  category:", dict(Counter(r["category"] for r in rows)))
    print("  food_role:", dict(Counter(r["food_role"] for r in rows)))
    print("  age_fit empty(키튼):", sum(1 for r in rows if not r["age_fit"]))
    print("  condition_fit 매핑됨:", sum(1 for r in rows if r["condition_fit"]))
    print("  rec_daily_g null:", sum(1 for r in rows if r["rec_daily_g"] is None))
    if warnings:
        print(f"\n⚠️  경고 {len(warnings)}건:")
        for w in warnings:
            print("   -", w)


if __name__ == "__main__":
    main()
