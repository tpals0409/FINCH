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

const KST_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * 시세 신선도 표기용. `08.24 14:30`
 * 데이터가 늦거나 없는 상태가 정상 범위 안에 있고, 신선도는 `asOf` 로만 드러난다.
 *
 * 로케일이 붙여 주는 구두점(`08. 24. 14:30`)에 정규식을 걸지 않고
 * 파트에서 값만 꺼내 조립한다. 로케일 데이터가 바뀌어도 결과가 변하지 않는다.
 */
export function formatKstDateTime(isoString: string): string {
  const parts = KST_DATE_TIME_FORMATTER.formatToParts(new Date(isoString));
  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '--';

  return `${pick('month')}.${pick('day')} ${pick('hour')}:${pick('minute')}`;
}
