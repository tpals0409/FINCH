import { type FormEvent, useRef, useState } from 'react';

import { AiErrorNotice, AiResponseFooter, useAiChat } from '@/features/ai';
import type { AiChatResponse } from '@/shared/types/ai/chat';
import { AiSectionText } from '@/shared/ui/AiSectionText';
import { AppBar } from '@/shared/ui/AppBar';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageMain } from '@/shared/ui/PageMain';
import { SupportingText } from '@/shared/ui/SupportingText';

const MESSAGE_MAX_LENGTH = 2000;

type Turn =
  { role: 'user'; text: string } | { role: 'ai'; answer: AiChatResponse };

/**
 * AI 채팅 (ia.md §1 · AI 명세 §4).
 *
 * **단발 요청/응답이다. SSE 는 폐기됐다** (contracts C4) — 답이 올 때까지 로딩으로 기다린다.
 * 백엔드 중계 타임아웃이 60초라 그만큼 걸릴 수 있고, 그동안 입력을 막는다.
 *
 * **대화를 서버가 기억하지 않는다.** 이어 가는 열쇠는 `conversationId` 하나뿐이라 화면을 나가면
 * 지금까지의 말풍선이 사라진다. 그래서 목록을 캐시가 아니라 컴포넌트 상태로 든다 —
 * TanStack Query 에 넣으면 되살아나는 것처럼 보이지만 실제로 되살아나는 건 마지막 응답 하나다.
 *
 * `answer.title` 은 항상 `null` 이라 말풍선 제목은 화면이 정한다 (contracts C53).
 */
export function ChatPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  // 서버가 발급한 값을 그대로 이어 쓴다. 없으면 새 대화가 시작된다.
  const conversationId = useRef<string | null>(null);
  const chat = useAiChat();

  const message = draft.trim();
  const canSend = message !== '' && message.length <= MESSAGE_MAX_LENGTH;

  function send(event: FormEvent) {
    event.preventDefault();
    if (!canSend || chat.isPending) {
      return;
    }

    setTurns((previous) => [...previous, { role: 'user', text: message }]);
    setDraft('');

    chat.mutate(
      { message, conversationId: conversationId.current },
      {
        onSuccess: (answer) => {
          conversationId.current = answer.content.conversationId;
          setTurns((previous) => [...previous, { role: 'ai', answer }]);
        },
      },
    );
  }

  return (
    <PageMain className="flex min-h-dvh flex-col">
      <AppBar title="AI에게 묻기" />

      <ul className="flex-1 space-y-3">
        {turns.length === 0 ? (
          <li>
            <Card>
              <SupportingText>
                보유 종목이나 투자 용어를 물어보세요
              </SupportingText>
              <SupportingText size="caption" className="mt-1">
                가격을 예측하거나 사고팔라고 권하지는 않아요
              </SupportingText>
            </Card>
          </li>
        ) : null}

        {turns.map((turn, index) =>
          turn.role === 'user' ? (
            <li key={index} className="flex justify-end">
              <p className="max-w-[85%] rounded-card bg-bg-neutral-solid px-4 py-3 text-body-1 whitespace-pre-line text-fg-neutral-inverted">
                {turn.text}
              </p>
            </li>
          ) : (
            <li key={index}>
              <Card>
                <AiSectionText
                  text={turn.answer.content.answer.text}
                  segments={turn.answer.content.answer.segments}
                />
                <AiResponseFooter
                  dataAsOf={turn.answer.dataAsOf}
                  citations={turn.answer.citations}
                  disclaimer={turn.answer.disclaimer}
                />
              </Card>
            </li>
          ),
        )}

        {chat.isPending ? (
          <li>
            <Card>
              <SupportingText>답을 만들고 있어요</SupportingText>
            </Card>
          </li>
        ) : null}

        {chat.isError ? (
          <li>
            <Card>
              {/* 재시도는 사용자가 같은 질문을 다시 보내는 것이다. 자동 재시도는 걸지 않는다 */}
              <AiErrorNotice error={chat.error} />
            </Card>
          </li>
        ) : null}
      </ul>

      {/* sticky 로 띄우지 않는다. 그러려면 페이지 배경색을 폼에도 칠해야 하는데
          basement 면색은 유틸리티 별칭이 없다 — 토큰을 만드는 것은 디자이너 몫이다.
          `flex-1` 목록이 남는 높이를 먹으므로 폼은 그냥 아래에 놓인다. */}
      <form onSubmit={send} className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="chat-message">
          질문
        </label>
        <input
          id="chat-message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={MESSAGE_MAX_LENGTH}
          disabled={chat.isPending}
          placeholder="무엇이든 물어보세요"
          className="min-h-control-height flex-1 rounded-md border border-stroke-neutral-weak bg-bg-layer-default px-4 text-body-1 text-fg-neutral placeholder:text-fg-placeholder disabled:bg-bg-disabled"
        />
        <Button
          type="submit"
          disabled={!canSend || chat.isPending}
          className="w-auto shrink-0 px-5"
        >
          보내기
        </Button>
      </form>
    </PageMain>
  );
}
