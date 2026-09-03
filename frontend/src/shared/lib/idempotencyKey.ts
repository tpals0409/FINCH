import {
  IdempotencyKeySchema,
  type IdempotencyKey,
} from '@/shared/types/primitives';

import { createUuidV4 } from './uuid';

/**
 * 멱등성 키 생성기 (apiSpec §1.4 · contracts C30).
 * `POST /deposits`·`POST /orders` 호출부가 클릭마다 새로 부른다 —
 * **같은 클릭의 재시도는 호출부가 값을 재사용하고, 새 클릭마다 이 함수를 다시 부른다.**
 * `IdempotencyKeySchema`(`z.uuid()`)를 통과하는 UUID v4 형식으로 만들어야 하므로
 * `createUuidV4`(`shared/lib/uuid.ts`) 위에 브랜드만 씌운다.
 */
export function createIdempotencyKey(): IdempotencyKey {
  return IdempotencyKeySchema.parse(createUuidV4());
}
