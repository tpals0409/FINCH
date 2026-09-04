import { describe, expect, it } from 'vitest';

import { TransactionFilterSchema } from '@/shared/types/portfolio';

import { emptyTransactionsMessage } from './emptyTransactionsMessage';

/**
 * MSW 목이 네 필터 전부에 데이터를 심어 이 분기를 화면으로 띄울 수 없다.
 * 문구가 필터마다 갈리는 것이 계약(featureSpec §8)이므로 여기서 고정한다.
 */
describe('emptyTransactionsMessage', () => {
  it('필터 넷 모두에 문구가 있다 — 값이 늘면 여기서 먼저 깨진다', () => {
    for (const filter of TransactionFilterSchema.options) {
      expect(emptyTransactionsMessage(filter)).not.toBe('');
    }
  });

  it('필터마다 문구가 다르다 — 같으면 사용자가 어느 탭인지 못 가린다', () => {
    const messages = TransactionFilterSchema.options.map(
      emptyTransactionsMessage,
    );

    expect(new Set(messages).size).toBe(messages.length);
  });

  it('"충전" 이지 "입금" 이 아니다 — 초기 지급이 그 안에 없어 이름이 계약과 어긋난다', () => {
    expect(emptyTransactionsMessage('DEPOSIT')).toContain('충전');
    expect(emptyTransactionsMessage('DEPOSIT')).not.toContain('입금');
  });
});
