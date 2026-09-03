import { z } from 'zod';

import {
  CURSOR_PAGE_MAX_SIZE,
  CURSOR_PAGE_DEFAULT_SIZE,
} from '@/shared/config/apiContract';

import { CursorSchema } from './primitives';

/**
 * 커서 페이징 (`docs/api/apiSpec.md` §1.5 페이징 · `frontend/docs/contracts.md` C27·C28).
 *
 * 응답은 `{items, nextCursor, hasNext}` 다. `nextCursor` 가 `null` 이면 마지막 페이지다.
 * 종료 판정은 `hasNext` 로 한다. `items.length` 로 판정하지 않는다.
 */
export function createCursorPageSchema<TItem extends z.ZodType>(
  itemSchema: TItem,
) {
  return z.object({
    items: z.array(itemSchema),
    nextCursor: CursorSchema.nullable(),
    hasNext: z.boolean(),
  });
}

/**
 * 커서가 없는 목록 응답. 배열을 그대로 주지 않고 `{items}` 로 감싸 내려준다
 * (apiSpec §5.1 종목 검색 · §6.1 최근 본 종목 · §6.2 최근 검색어).
 */
export function createItemsSchema<TItem extends z.ZodType>(itemSchema: TItem) {
  return z.object({ items: z.array(itemSchema) });
}

/** 목록 요청의 커서 파라미터. `size` 는 화면에서 임의로 늘리지 않는다. */
export const CursorPageQuerySchema = z.object({
  cursor: CursorSchema.nullish(),
  size: z
    .number()
    .int()
    .min(1)
    .max(CURSOR_PAGE_MAX_SIZE)
    .default(CURSOR_PAGE_DEFAULT_SIZE),
});
export type CursorPageQuery = z.infer<typeof CursorPageQuerySchema>;
