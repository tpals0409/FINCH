import { type z } from 'zod';

import { AiUnknownContentResponseSchema } from './envelope';

/**
 * 종목 AI 분석 (`ai/docs/api-spec.md` §3 종목 AI 분석,
 * `POST /ai/stocks/{stockCode}/analysis`).
 *
 * **본문 스키마를 만들지 않았다. 자리만 남긴다.**
 *
 * ## 왜 만들지 않았나
 *
 * `AnalysisSection` 이 `ai/docs/openapi.json` 에
 * `{"additionalProperties": true, "type": "object"}` 인 **빈 object 로 떨어진다.**
 * 구현 스키마가 키를 하나도 알려주지 않는다는 뜻이다 (GitLab 이슈 #15, 계약 원장 P8).
 * 계약 원장은 "AI 파트 문서와 어긋나면 구현이 맞고 문서가 틀린 것"으로 정했으므로,
 * 문서 §3 의 예시를 보고 손으로 열 키를 적으면 **틀린 것을 계약처럼 굳히는 것**이 된다.
 *
 * 섹션 키 이름 일곱(`current`·`changes`·`attention`·`risks`·`my_impact`·
 * `thesis_check`·`next_events`)도 계약이 아니라 **소스에서 읽은 값**이라
 * 요청 스키마의 `sections` 도 열거하지 않았다. 열거하면 그 일곱이 계약처럼 읽힌다.
 *
 * MR !23 이 머지돼도 이 구멍은 남는다 (원장 P8). **M1(8/28) 목표 화면이 종목 상세라
 * 지금 가장 아픈 자리다.**
 *
 * ## 그래서 지금 무엇을 쓸 수 있나
 *
 * 재포장 후에도 보존되는 필드(`requestId`·`dataAsOf`·`citations`·`disclaimer`)는
 * 확정이므로 그것만 검증하고 나머지는 통과시킨다. 화면은 AI 분석 슬롯을 만들어 두고
 * 본문 렌더링은 키 구성이 확정된 뒤에 붙인다.
 *
 * **여기에 손으로 섹션 스키마를 적어 넣지 마라.** 회신이 오면 그때 이 파일을 채운다.
 */
export const AiAnalysisResponseSchema = AiUnknownContentResponseSchema;
export type AiAnalysisResponse = z.infer<typeof AiAnalysisResponseSchema>;
