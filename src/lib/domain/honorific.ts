/**
 * 호칭 규칙(2026-10-22 사용자 결정): 사용자는 카카오 닉네임이 아니라 **"{고양이 이름}집사님"** 으로 부른다.
 * 예) 낭낭 → 낭낭이집사님 · 베리 → 베리집사님. 고양이 자체는 "님" 없이 "낭낭이" / "베리"로 부른다.
 *
 * 한글 이름의 마지막 글자에 받침이 있으면 호칭용 '이'를 붙인다(낭낭→낭낭이, 하늘→하늘이, 베리→베리).
 * 한글이 아니면(영문·숫자) 붙이지 않는다.
 */

/** 마지막 글자가 받침 있는 한글 음절인가. */
function endsWithBatchim(name: string): boolean {
  const ch = name.trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

/** 고양이 이름의 호칭형 — 받침 있으면 '이'를 붙인다. ("낭낭" → "낭낭이", "베리" → "베리") */
export function catCallName(name: string): string {
  const n = name.trim();
  if (!n) return n;
  return endsWithBatchim(n) ? `${n}이` : n;
}

/** 사용자 호칭 — "{고양이 호칭형}집사님". 고양이가 없으면 "집사님". 여러 마리면 첫 번째(등록 순). */
export function butlerName(catNames: ReadonlyArray<string>): string {
  const first = catNames.map((s) => s.trim()).find((s) => s.length > 0);
  return first ? `${catCallName(first)}집사님` : '집사님';
}
