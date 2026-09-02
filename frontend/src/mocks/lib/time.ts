/**
 * 목 응답의 시각 표기. **ISO 8601 + KST 오프셋이다** (apiSpec §1.1 · contracts C16).
 *
 * `Date.prototype.toISOString()` 은 `Z` 로 끝나 백엔드가 실제로 주는 표기와 다르다.
 * 목이 `Z` 를 주면 화면이 `Z` 를 전제로 만들어지고, 실제 백엔드에 붙일 때 조용히 어긋난다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** `2026-08-20T14:30:00+09:00` */
export function toKstIsoString(date: Date): string {
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);
  return `${shifted.toISOString().slice(0, 19)}+09:00`;
}

/** `2026-08-20` — 캔들·브리핑처럼 날짜만 쓰는 자리 (apiSpec §5.3 · AI 명세 §8). */
export function toKstDateString(date: Date): string {
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

/** 지금 시각을 KST 표기로 준다. */
export function nowKstIso(): string {
  return toKstIsoString(new Date());
}

/** `days` 일 전 자정 기준 KST 날짜. 캔들 생성에 쓴다. */
export function kstDateStringDaysAgo(days: number): string {
  return toKstDateString(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}
