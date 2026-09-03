/**
 * UUID v4 생성기. `features/auth/lib/oauthState.ts`의 OAuth state 난수와
 * `shared/lib/idempotencyKey.ts`의 멱등성 키가 여기를 함께 쓴다 — 둘 다
 * `crypto.getRandomValues` 위에서 난수를 만드는 같은 문제라 나눠 둘 이유가 없다.
 *
 * 두 제약을 동시에 만족해야 한다.
 * 1. **비보안 컨텍스트에서 동작해야 한다.** `crypto.randomUUID()`는 보안 컨텍스트
 *    (HTTPS·localhost)에서만 있다. 폰에서 `http://192.168.x.x:5173`으로 열면
 *    없어서 그 자리에서 터진다(`oauthState.ts`가 먼저 부딪힌 문제). `getRandomValues`는
 *    그 제약이 없다.
 * 2. **결과가 `z.uuid()`를 통과해야 한다.** `getRandomValues`로 뽑은 순수 난수 hex는
 *    UUID v4 형식이 아니라 `IdempotencyKeySchema`(`z.uuid()`)를 통과하지 못한다.
 *    RFC 4122 §4.4 대로 버전 니블을 `4`, variant 니블을 `8~b`로 강제해야 한다.
 */
export function createUuidV4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // noUncheckedIndexedAccess 때문에 인덱스 접근이 `number | undefined`다.
  // 길이 16 고정 배열이라 실제로 undefined 일 수 없다 — ?? 0 은 타입을 좁히는 용도다.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // 버전 4
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // variant 10xx

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}
