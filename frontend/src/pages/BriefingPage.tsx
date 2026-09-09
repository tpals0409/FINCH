import { Link } from 'react-router-dom';

import {
  AiErrorNotice,
  AiResponseFooter,
  AiSectionText,
  useAiBriefing,
} from '@/features/ai';
import { AppBar } from '@/shared/ui/AppBar';
import { Card } from '@/shared/ui/Card';
import { PageMain } from '@/shared/ui/PageMain';
import { Skeleton } from '@/shared/ui/Skeleton';
import { SupportingText } from '@/shared/ui/SupportingText';

/**
 * 브리핑 전체 (ia.md §1 · AI 명세 §8).
 *
 * **`status: 'empty'` 는 오류가 아니다.** 보유 종목이 없거나 내보낼 항목이 없으면 정상적으로
 * 비어 온다 — 신규 가입자에게는 이쪽이 기본 상태다. 에러 화면을 띄우면 멀쩡한 서비스가
 * 고장난 것처럼 보인다.
 *
 * **`status: 'generating'` 갈래를 만들지 않는다** (contracts C56). 현재 구현은 요청 시점에
 * 생성하므로 이 값을 내보내지 않는다. 스켈레톤 + 재조회 경로를 미리 만들면 아무도 안 타는
 * 코드가 남는다. 스키마에는 값이 남아 있어 배치가 붙어도 파싱은 깨지지 않는다.
 *
 * `deeplink` 는 AI 가 만든 경로 문자열이다. 라우터 경로와 대조하지 않고 그대로 `Link` 에 넣는다 —
 * `ROUTES.stockDetail` 을 바꾸면 이 링크가 조용히 404 가 되므로 경로를 바꿀 땐 AI 파트에 먼저 알린다
 * (`shared/config/routes.ts` 머리말).
 */
export function BriefingPage() {
  const { data, isPending, isError, error, refetch } = useAiBriefing();

  return (
    <PageMain>
      <AppBar title="오늘의 브리핑" />

      {isPending ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : isError ? (
        <Card className="mt-4">
          <AiErrorNotice error={error} onRetry={() => void refetch()} />
        </Card>
      ) : data.content.items.length === 0 ? (
        <Card className="mt-4">
          <SupportingText>오늘 알려드릴 소식이 없어요</SupportingText>
          <SupportingText size="caption" className="mt-1">
            종목을 담으면 그 종목의 소식을 모아 드려요
          </SupportingText>
        </Card>
      ) : (
        <div className="finch-content-reveal">
          <ul className="mt-4 space-y-3">
            {data.content.items.map((item) => (
              <li key={item.rank}>
                <Link
                  to={item.deeplink}
                  viewTransition
                  className="block rounded-card border border-stroke-neutral-weak bg-bg-layer-default p-5 active:bg-bg-transparent-pressed"
                >
                  <h2 className="text-title-3 text-fg-neutral">{item.title}</h2>
                  <AiSectionText
                    text={item.text}
                    segments={item.segments}
                    className="mt-2"
                  />
                </Link>
              </li>
            ))}
          </ul>

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
