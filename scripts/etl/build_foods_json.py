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


def derive_category(sku_name, line_form, moisture):
    """습식/건식 판별: moisture>50 우선, 이름/form 보조."""
    text = f"{sku_name or ''} {line_form or ''}".lower()
    wet_kw = ["wet", "습식", "can", "캔", "pouch", "파우치", "pate", "pâté", "paté",
              "purée", "puree", "퓨레", "churu", "츄루", "jelly", "젤리", "gravy",
              "그레이비", "broth", "음료", "stew", "mousse", "무스"]
    dry_kw = ["dry", "드라이", "kibble", "freeze-dried", "동결건조"]
    if moisture is not None and moisture > 50:
        return "습식"
    if any(k in text for k in wet_kw) and not any(k in text for k in ["dry", "드라이", "kibble"]):
        return "습식"
    if moisture is not None and moisture <= 50:
        return "건식"
    if any(k in text for k in dry_kw):
        return "건식"
    # moisture 없음 + 단서 없음 → 보수적으로 건식
    return "건식"


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
    nut = {n["sku_id"]: n for n in read_sheet(wb, "06_Nutrition")}
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
        category = derive_category(s.get("sku_name_en") or s.get("sku_name_ko"),
                                   line.get("form"), moisture)
        role = derive_food_role(completeness, s.get("sku_name_en"), life_stage)
        age_fit = derive_age_fit(life_stage)

        is_therapeutic = bool(
            (completeness and "therapeutic" in completeness.lower())
            or "therapeutic" in (life_stage or "").lower()
            or "처방" in f"{life_stage or ''}{line.get('positioning') or ''}"
            or "veterinary" in (line.get("line_name_en") or "").lower()
            or "rx" in (line.get("line_name_en") or "").lower()
        )
        condition_fit = derive_condition_fit(
            is_therapeutic, s.get("sku_name_en"), s.get("sku_name_ko"), life_stage,
        )
        nutri, estimated = build_nutrition(n, category)
        keywords, summary = derive_keywords_and_summary(ings)

        # 한국 구매 가능 — 브랜드 Yes × 라인 Yes 만 true (데이터스키마 §유통 kr_distributed).
        brand_kr = brands_kr.get(line.get("brand_id"), "")
        line_kr = (line.get("kr_line_available") or "").strip()
        kr_available = brand_kr == "Yes" and line_kr == "Yes"
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
            "form": line.get("form"),
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
