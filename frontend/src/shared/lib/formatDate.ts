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

const KST_PARTS_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function kstParts(isoString: string): Record<string, string> {
  return Object.fromEntries(
    KST_PARTS_FORMATTER.formatToParts(new Date(isoString)).map((part) => [
      part.type,
      part.value,
    ]),
  );
}

/**
 * ISO 8601 을 `2026.09.04` 로. 매매 내역의 날짜 구분선에 쓴다.
 *
 * **묶는 기준도 이 값이다.** 응답에 그룹 필드가 없어 화면이 `occurredAt` 으로 묶는데
 * (apiSpec §8.2), 표시와 묶기가 다른 함수를 쓰면 자정 근처에서 구분선과 행이 어긋난다.
 */
export function formatKstDateLabel(isoString: string): string {
  const parts = kstParts(isoString);
  return `${parts.year}.${parts.month}.${parts.day}`;
}

/** ISO 8601 을 `14:31` 로. 날짜는 구분선이 이미 말하므로 행에는 시각만 남긴다. */
export function formatKstHourMinute(isoString: string): string {
  const parts = kstParts(isoString);
  return `${parts.hour}:${parts.minute}`;
}

/**
 * ISO 8601 문자열을 `2026-09-04 14:31` 로 표시한다.
 *
 * 초를 빼는 이유 — 이 포맷이 쓰이는 자리는 잔고 화면의 "갱신 시각"(`asOf`)이다.
 * 초 단위가 의미를 갖지 않고, 초가 보이면 값이 계속 바뀌는 것처럼 읽힌다.
 * 초까지 필요한 자리는 [formatKstTime] 을 쓴다.
 */
export function formatKstDateTime(isoString: string): string {
  const parts = kstParts(isoString);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}
