import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AccountSummaryResponseSchema } from '@/shared/types/account';

import { AccountSummaryCard } from './AccountSummaryCard';

function renderCard(summary: unknown) {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(
    <MemoryRouter>
      <AccountSummaryCard
        summary={AccountSummaryResponseSchema.parse(summary)}
      />
    </MemoryRouter>,
  );
  return container;
}

describe('AccountSummaryCard 평가금액', () => {
  it('평가를 완성할 수 없으면 금액 대신 값 없음 표시를 그린다', () => {
    const card = renderCard({
      cashBalance: 1_250_000,
      evaluationAmount: null,
      totalAsset: null,
      asOf: null,
    });
    const labels = [...card.querySelectorAll('p, dt')];
    const totalAsset = labels.find(
      (element) => element.textContent === '총자산',
    );
    const evaluationAmount = labels.find(
      (element) => element.textContent === '평가금액',
    );

    expect(totalAsset?.nextElementSibling?.textContent).toBe('—');
    expect(evaluationAmount?.nextElementSibling?.textContent).toBe('—');
    expect(card.textContent).not.toContain('기준');
  });

  it('평가를 완성하면 기존 금액과 갱신 시각을 그대로 그린다', () => {
    const card = renderCard({
      cashBalance: 1_250_000,
      evaluationAmount: 735_000,
      totalAsset: 1_985_000,
      asOf: '2026-08-20T14:30:00+09:00',
    });

    expect(card.textContent).toContain('1,985,000원');
    expect(card.textContent).toContain('735,000원');
    expect(card.textContent).toContain('2026-08-20 14:30 기준');
  });
});
