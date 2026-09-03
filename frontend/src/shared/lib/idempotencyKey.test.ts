import { describe, expect, it } from 'vitest';

import { IdempotencyKeySchema } from '@/shared/types/primitives';

import { createIdempotencyKey } from './idempotencyKey';
import { createUuidV4 } from './uuid';

/**
 * `IdempotencyKeySchema`는 `z.uuid()`다. `crypto.getRandomValues`로 직접 뽑은
 * hex 는 이 형식이 아니라서 예전엔 조용히 막혔다 — 생성기가 실제로 통과하는지 본다.
 */
describe('createIdempotencyKey', () => {
  it('IdempotencyKeySchema(z.uuid())를 통과한다', () => {
    const key = createIdempotencyKey();
    expect(IdempotencyKeySchema.safeParse(key).success).toBe(true);
  });

  it('호출마다 다른 값을 낸다', () => {
    expect(createIdempotencyKey()).not.toBe(createIdempotencyKey());
  });
});

describe('createUuidV4', () => {
  it('버전 니블이 4, variant 니블이 8~b다 (RFC 4122 §4.4)', () => {
    // 3번째 그룹의 첫 글자가 버전(4), 4번째 그룹의 첫 글자가 variant(8~b)다.
    expect(createUuidV4()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('보안 컨텍스트 없이도 동작한다 — crypto.randomUUID 가 아니라 getRandomValues 를 쓴다', () => {
    // crypto.randomUUID 를 제거해도 createUuidV4 는 getRandomValues 만으로 동작해야 한다.
    // 폰에서 http://192.168.x.x:5173 으로 여는 상황(보안 컨텍스트 아님)의 재현이다.
    const original = crypto.randomUUID;
    // @ts-expect-error 테스트를 위해 일부러 제거한다
    delete crypto.randomUUID;
    try {
      expect(() => createUuidV4()).not.toThrow();
    } finally {
      crypto.randomUUID = original;
    }
  });
});
