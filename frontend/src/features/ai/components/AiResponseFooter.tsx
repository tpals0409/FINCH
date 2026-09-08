import { formatKstDateTime } from '@/shared/lib/formatDate';
import type { AiCitation, AiDataAsOf } from '@/shared/types/ai/envelope';
import { SupportingText } from '@/shared/ui/SupportingText';

/** `dataAsOf` 키를 화면 이름으로 옮긴다. 키 순서가 표시 순서다. */
const SOURCE_LABEL: Record<keyof AiDataAsOf, string> = {
  price: '시세',
  portfolio: '보유',
  filings: '공시',
  news: '뉴스',
  macro: '지표',
};

/**
 * 모든 AI 응답 아래에 붙는 꼬리 (apiSpec §10.3 보존 필드).
 *
 * 셋 다 화면 노출이 **필수**다.
 *
 * - `dataAsOf` — "몇 시 기준" 이 없으면 오래된 수치를 지금 값으로 읽는다. 읽지 않은 원천은
 *   키가 빠지는 게 아니라 값이 `null` 이므로 그 줄만 뺀다
 * - `citations` — 근거가 없으면 LLM 출력이 사실처럼 보인다. 빈 배열은 실패가 아니다
 *   (브리핑은 문서를 조회하지 않아 항상 비어 있다)
 * - `disclaimer` — **하드코딩하지 않고 응답 값을 쓴다.** 규제 문구가 바뀌면 서버만 고치게 한다
 */
export function AiResponseFooter({
  dataAsOf,
  citations,
  disclaimer,
}: {
  dataAsOf: AiDataAsOf;
  citations: AiCitation[];
  disclaimer: string;
}) {
  const stamps = (Object.keys(SOURCE_LABEL) as (keyof AiDataAsOf)[]).flatMap(
    (key) => {
      const at = dataAsOf[key];
      return at === null
        ? []
        : [`${SOURCE_LABEL[key]} ${formatKstDateTime(at)}`];
    },
  );

  return (
    <div className="mt-4 border-t border-stroke-neutral-weak pt-3">
      {stamps.length > 0 ? (
        <SupportingText size="caption">
          {stamps.join(' · ')} 기준
        </SupportingText>
      ) : null}

      {citations.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {citations.map((citation) => (
            <li key={citation.id} className="text-supporting-caption">
              {citation.url === null ? (
                <span>{citation.title}</span>
              ) : (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline"
                >
                  {citation.title}
                </a>
              )}
              <span> · {citation.source}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <SupportingText size="caption" className="mt-2">
        {disclaimer}
      </SupportingText>
    </div>
  );
}
