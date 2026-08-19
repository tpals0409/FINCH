/**
 * 날짜 포매터 (컨벤션 §6).
 * 서버는 ISO 8601 로 주고 화면은 KST 로 표시한다.
 */

const KST_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** ISO 8601 문자열을 KST 시:분:초로 표시한다. */
export function formatKstTime(isoString: string): string {
  return KST_TIME_FORMATTER.format(new Date(isoString));
}
