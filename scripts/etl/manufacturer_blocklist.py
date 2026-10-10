#!/usr/bin/env python3
"""
제조원 차단 레지스트리(manufacturer_blocklist.json) 매처 — ETL·nnenn2 수집 공용.

두 종류로 매칭한다.
  ① 브랜드 — 브랜드명 필드는 정규화 후 **완전 일치**(러시아 'Sirius' ≠ 'Sirius Will').
     상품명은 4글자 이상 한글 브랜드명만 부분 일치(짧은 이름은 일반어 오탐 위험).
  ② 제조원 — 제조사 별칭·사업자번호·공장 주소 키워드가 텍스트 필드에 들어 있으면 일치.
     행 notes에 `[MFR-CLEARED:<사유>]`가 있으면 그 행의 ②만 해제한다(①은 해제 불가).

사용:
    from manufacturer_blocklist import load, check
    bl = load()
    hits = check(bl, brand_names=["Natural Core"], product_names=[...], texts=[...], notes=[...])
    python3 scripts/etl/manufacturer_blocklist.py   # 셀프테스트
"""
import json
import os
import re
import sys

REGISTRY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "manufacturer_blocklist.json")


def _norm(s):
    return re.sub(r"[\s\-_.'’·,()/&]+", "", str(s or "")).lower()


def load(path=REGISTRY_PATH):
    with open(path, encoding="utf-8") as f:
        bl = json.load(f)
    bl["_brand_exact"] = {}
    bl["_brand_sub"] = {}
    for b in bl["brands"]:
        label = (b["en"] or b["ko"])[0]
        for name in b["en"] + b["ko"]:
            bl["_brand_exact"][_norm(name)] = label
        for name in b["ko"]:
            if len(_norm(name)) >= 4:
                bl["_brand_sub"][_norm(name)] = label
    bl["_mfr_keys"] = []
    for m in bl["manufacturers"]:
        for k in m["aliases"] + [m["biz_no"]]:
            bl["_mfr_keys"].append((_norm(k), m["name"]))
    for a in bl["address_keywords"]:
        bl["_mfr_keys"].append((_norm(a), "공장 주소 '" + a + "'"))
    return bl


def check(bl, brand_names=(), product_names=(), texts=(), notes=()):
    """일치 사유 목록을 반환한다(빈 목록 = 통과).

    brand_names   — 브랜드명 필드(완전 일치)
    product_names — 상품명(긴 한글 브랜드명 부분 일치 + 제조원 키워드)
    texts         — 모회사·수입원·제조 표시 등 제조원이 적힐 수 있는 필드
    notes         — 자유 서술 notes(제조원 키워드 검사, CLEARED 태그 반영)
    """
    hits = []
    for b in brand_names:
        lab = bl["_brand_exact"].get(_norm(b))
        if lab:
            hits.append(f"차단 브랜드 '{b}'(={lab})")
    for p in product_names:
        np_ = _norm(p)
        for key, lab in bl["_brand_sub"].items():
            if key in np_:
                hits.append(f"상품명에 차단 브랜드 '{lab}' — {p}")
                break
    cleared = any(bl["clear_tag"] in str(n or "") for n in notes)
    if not cleared:
        for t in list(product_names) + list(texts) + list(notes):
            nt = _norm(t)
            if not nt:
                continue
            for key, who in bl["_mfr_keys"]:
                if key and key in nt:
                    hits.append(f"차단 제조원 {who} — '{str(t)[:80]}'")
                    break
    return list(dict.fromkeys(hits))


def selftest(bl=None):
    bl = bl or load()
    cases = [
        # (설명, kwargs, 기대: 차단?)
        ("국내 브랜드명 완전 일치", dict(brand_names=["Natural Core"]), True),
        ("한글 브랜드명", dict(brand_names=["네츄럴코어"]), True),
        ("러시아 Sirius는 Sirius Will 아님", dict(brand_names=["Sirius"]), False),
        ("Sirius Will", dict(brand_names=["Sirius Will"]), True),
        ("상품명 부분 일치(긴 한글명)", dict(product_names=["이레본 보노네이처 캣 스킨앤코트 연어 6kg"]), True),
        ("짧은 이름은 상품명 부분 일치 안 함", dict(product_names=["아미오레 캣 연어"]), False),
        ("제조원 별칭 in 수입원 필드", dict(texts=["제조원: (주)이레본 / 판매원: OO"]), True),
        ("하이원 회사 표기", dict(texts=["제조자 ㈜하이원"]), True),
        ("공장 주소", dict(texts=["경기도 이천시 모가면 공원로 288-170"]), True),
        ("마미닥터 주소", dict(notes=["제조: 경기 이천시 모가면 원두리 산 53"]), True),
        ("CLEARED 태그는 텍스트 매칭만 해제", dict(notes=["이레본 OEM 아님 확인 [MFR-CLEARED:라벨 확인 2026-10-07]"]), False),
        ("CLEARED 태그로 브랜드는 해제 안 됨",
         dict(brand_names=["Finiki"], notes=["[MFR-CLEARED:x]"]), True),
        ("무관 브랜드", dict(brand_names=["Royal Canin"], product_names=["로얄캐닌 인도어 4kg"],
                          texts=["Royal Canin SAS"], notes=["프랑스 제조"]), False),
        ("무관 '하이원' 단어 단독은 회사 표기 아님", dict(texts=["하이원리조트 협찬"]), False),
    ]
    fails = []
    for memo, kw, expect in cases:
        got = bool(check(bl, **kw))
        if got != expect:
            fails.append(f"  {memo}: 차단={got}, 기대 {expect} — {check(bl, **kw)}")
    if fails:
        print("❌ manufacturer_blocklist 셀프테스트 실패:", file=sys.stderr)
        print("\n".join(fails), file=sys.stderr)
        sys.exit(1)
    return len(cases)


if __name__ == "__main__":
    n = selftest()
    print(f"✅ manufacturer_blocklist 셀프테스트 {n}건 통과 (브랜드 {len(load()['brands'])}개)")
