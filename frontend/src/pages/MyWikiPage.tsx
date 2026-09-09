import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  AiErrorNotice,
  AiResponseFooter,
  useAiWiki,
  useDeleteAiWikiFact,
  useUpdateAiThesis,
} from '@/features/ai';
import { ROUTES } from '@/shared/config/routes';
import { formatKstDateLabel } from '@/shared/lib/formatDate';
import {
  AI_THESIS_TEXT_MAX_LENGTH,
  type AiWikiFact,
  type AiWikiThesis,
  isUserStated,
} from '@/shared/types/ai/wiki';
import { AppBar } from '@/shared/ui/AppBar';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageMain } from '@/shared/ui/PageMain';
import { Skeleton } from '@/shared/ui/Skeleton';
import { SupportingText } from '@/shared/ui/SupportingText';

/**
 * AI가 이해한 나 (ia.md §1 · AI 명세 §9).
 *
 * **`source` 가 렌더링 어투를 가른다** (AI 응답 정책 §4.2). 사용자가 직접 말한 것만 단정투로
 * 보여주고, 거래에서 유도했거나 AI 가 추측한 것은 "…가 맞나요?" 로 묻는다. 추측을 단정으로
 * 보여주면 사용자는 자기가 말한 적 없는 문장을 자기 것으로 읽는다.
 *
 * **"맞아요/아니에요" 확인 버튼은 없다.** 그 동작이 ia.md §7 의 미확인 항목이고 API 도 없다
 * (`DELETE /wiki/facts/{factId}` 만 있다). 지금 만들면 없는 계약이 화면에 굳는다 —
 * 틀린 항목은 지우는 것으로 대신한다.
 *
 * 삭제는 **소프트 삭제**라 행은 남고 목록에서만 사라진다 (contracts C61).
 */
export function MyWikiPage() {
  const { data, isPending, isError, error, refetch } = useAiWiki();

  return (
    <PageMain>
      <AppBar title="AI가 이해한 나" />
      <SupportingText>
        거래와 대화에서 알게 된 것들이에요. 틀린 건 지워 주세요
      </SupportingText>

      {isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : isError ? (
        <Card className="mt-4">
          <AiErrorNotice error={error} onRetry={() => void refetch()} />
        </Card>
      ) : (
        <div className="finch-content-reveal">
          <WikiFactSection facts={data.content.profile} />
          <WikiThesisSection theses={data.content.theses} />
          <AiResponseFooter
            dataAsOf={data.dataAsOf}
            citations={data.citations}
            disclaimer={data.disclaimer}
          />
        </div>
      )}
    </PageMain>
  );
}

function WikiFactSection({ facts }: { facts: AiWikiFact[] }) {
  const remove = useDeleteAiWikiFact();

  return (
    <section className="mt-6">
      <h2 className="text-title-3 text-fg-neutral">알게 된 것</h2>

      {facts.length === 0 ? (
        <Card className="mt-2">
          <SupportingText>아직 아는 게 없어요</SupportingText>
        </Card>
      ) : (
        <ul className="mt-2 space-y-2">
          {facts.map((fact) => (
            <li key={fact.id}>
              <Card className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-1 text-fg-neutral">
                    {isUserStated(fact.source)
                      ? fact.text
                      : `${fact.text} — 맞나요?`}
                  </p>
                  <SupportingText size="caption" className="mt-1">
                    {formatKstDateLabel(fact.asOf)}
                  </SupportingText>
                </div>
                {/* editable 이 false 면 서버가 지우지 못하게 한 항목이다. 버튼을 주면 눌러도 실패한다 */}
                {fact.editable ? (
                  <button
                    type="button"
                    onClick={() => remove.mutate(fact.id)}
                    disabled={remove.isPending}
                    aria-label="이 항목 지우기"
                    className="text-supporting shrink-0 underline disabled:text-fg-disabled"
                  >
                    지우기
                  </button>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WikiThesisSection({ theses }: { theses: AiWikiThesis[] }) {
  return (
    <section className="mt-6">
      <h2 className="text-title-3 text-fg-neutral">내가 적은 이유</h2>

      {theses.length === 0 ? (
        <Card className="mt-2">
          <SupportingText>아직 적어 둔 이유가 없어요</SupportingText>
        </Card>
      ) : (
        <ul className="mt-2 space-y-2">
          {theses.map((thesis) => (
            <li key={thesis.id}>
              <ThesisCard thesis={thesis} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** 논지 한 장. 수정은 이 카드 안에서 끝난다 — 별도 화면을 두면 목록으로 돌아오는 길이 하나 더 생긴다. */
function ThesisCard({ thesis }: { thesis: AiWikiThesis }) {
  const [draft, setDraft] = useState<string | null>(null);
  const update = useUpdateAiThesis();

  function save() {
    if (draft === null || draft.trim() === '') {
      return;
    }
    update.mutate(
      {
        // 서버는 경로의 종목코드를 기준으로 처리하지만 본문에도 채워 보낸다 (contracts C60).
        ticker: thesis.ticker,
        text: draft.trim(),
        horizon: thesis.horizon,
        linkedTradeId: thesis.linkedTradeId,
      },
      { onSuccess: () => setDraft(null) },
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <Link
          to={ROUTES.stockDetail(thesis.ticker)}
          viewTransition
          className="text-supporting tabular-nums underline"
        >
          {thesis.ticker}
        </Link>
        <SupportingText as="span" size="caption">
          {formatKstDateLabel(thesis.recordedAt)}
        </SupportingText>
      </div>

      {draft === null ? (
        <>
          <p className="mt-2 text-body-1 whitespace-pre-line text-fg-neutral">
            {thesis.text}
          </p>
          <button
            type="button"
            onClick={() => setDraft(thesis.text)}
            className="text-supporting mt-2 underline"
          >
            고치기
          </button>
        </>
      ) : (
        <>
          <label className="sr-only" htmlFor={`thesis-${thesis.id}`}>
            투자 이유
          </label>
          <textarea
            id={`thesis-${thesis.id}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={AI_THESIS_TEXT_MAX_LENGTH}
            rows={3}
            className="mt-2 w-full rounded-md border border-stroke-neutral-weak bg-bg-layer-default p-3 text-body-1 text-fg-neutral"
          />
          <div className="mt-2 flex gap-2">
            <Button onClick={save} disabled={update.isPending}>
              저장
            </Button>
            <Button
              variant="secondary"
              onClick={() => setDraft(null)}
              disabled={update.isPending}
            >
              취소
            </Button>
          </div>
          {update.isError ? (
            <div className="mt-2">
              <AiErrorNotice error={update.error} />
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
