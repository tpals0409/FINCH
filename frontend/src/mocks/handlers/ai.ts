import { http, HttpResponse } from 'msw';

import { API_PATHS } from '@/shared/config/apiContract';
import {
  AI_FEEDBACK_COMMENT_MAX_LENGTH,
  AI_FEEDBACK_REASONS,
} from '@/shared/types/ai/feedback';
import {
  AI_RELAY_ERROR_CODES,
  AI_SERVICE_ERROR_CODES,
} from '@/shared/types/errorCodes';

import {
  aiResponse,
  metricSegment,
  nextAiRequestId,
  section,
  textSegment,
} from '../lib/ai';
import { findStock } from '../lib/catalog';
import {
  aiErrorResponse,
  errorResponse,
  mockPath,
  readJsonBody,
  searchParam,
} from '../lib/http';
import { requireAuth } from '../lib/session';
import { store } from '../lib/store';
import { nowKstIso, toKstDateString } from '../lib/time';

/**
 * AI 중계 6종 (apiSpec §10 · AI 명세 §3~§8). **`briefing` 만 GET 이다** (contracts C3).
 *
 * **`POST /ai/feedback` 은 접수만 하는 일곱 번째 경로다** (contracts C3). 요청·응답 본문은
 * 이슈 #13 11:02 회신과 `ai/docs/openapi.json` 의 `FeedbackIn`·`FeedbackContent` 로 확정됐다.
 *
 * **(나) `content` 키 유지** — 백엔드는 봉투 필드만 걷어내고 `content` 컨테이너를 그대로 남긴다
 * (GitLab 이슈 #22 회신, 2026-09-02). 각 핸들러는 `content` 본문만 만들고, 재포장 형태는
 * `lib/ai.ts` 의 `aiResponse()` 한 곳에 갇혀 있다.
 *
 * **상태 유지 범위** — 보유 종목이 0개면 진단·원인 분석이 `INSUFFICIENT_DATA` 로 갈린다.
 * 계좌 리셋 뒤 그 갈래를 볼 수 있다. `POST /ai/feedback` 이 접수한 평가는 `store.aiFeedback` 에
 * `requestId` 를 키로 남는다 — **누적하지 않고 덮어쓴다**(contracts C66). 그 밖의 본문은
 * 고정 픽스처다.
 *
 * ## 어느 입력이 어느 응답을 내는가
 *
 * | 입력 | 응답 |
 * | --- | --- |
 * | `POST /ai/chat` `message` 가 `upstream` 으로 시작 | `502 AI_UPSTREAM_UNAVAILABLE` — **`requestId` 가 없다** (§10.4) |
 * | `POST /ai/chat` `message` 가 `timeout` 으로 시작 | `504 AI_UPSTREAM_TIMEOUT` — `requestId` 없음 |
 * | `POST /ai/chat` `message` 가 `guardrail` 로 시작 | `422 GUARDRAIL_BLOCKED` — `requestId` 있음 |
 * | `POST /ai/chat` 빈 `message` 나 2,000자 초과 | `400 INVALID_REQUEST` |
 * | `POST /ai/stocks/{stockCode}/analysis` 카탈로그에 없는 종목 | `404 INSTRUMENT_NOT_FOUND` (AI 서버 코드가 그대로 통과) |
 * | 진단·원인 분석 · 보유 종목 0개 | `409 INSUFFICIENT_DATA` — 에러가 아니라 정상 거절이다 (contracts C12) |
 * | `GET /ai/briefing?date=` 에 오늘이 아닌 날짜 | `status: 'empty'` + 빈 `items` (200) |
 * | `POST /ai/orders/preview` 주문 금액이 예수금 초과 | `feasible: false` + `shortfall` — **200 응답의 본문이다** |
 * | `POST /ai/feedback` `requestId` 누락 · `rating` 열거값 밖 · `reasons` 열거값 밖 · `comment` 1,000자 초과 | `400 INVALID_REQUEST` |
 * | `POST /ai/feedback` 정상 | `content: {recorded: true}` — 같은 `requestId` 로 다시 보내면 앞의 평가를 덮어쓴다 |
 * | `POST /ai/feedback` 모르는 `requestId` | **갈래를 만들지 않았다.** 정상 접수로 답한다 — 아래 참고 |
 *
 * `requestId` 유무가 피드백 슬롯을 붙일 수 있는지를 가른다 (contracts C14). 목이 그 두 갈래를
 * 모두 낸다.
 *
 * **모르는 `requestId` 의 에러 갈래는 만들지 않았다.** apiSpec §11.2 가 그 처리를 "AI 서버 몫"
 * 이라고만 적고 발행 코드를 정하지 않았다. 목이 코드를 골라 버리면 없는 계약이 굳는다.
 * 목은 어느 `requestId` 든 접수하고, 화면은 성공 경로만 이 목으로 확인한다.
 */

/**
 * `segments[].raw` 의 `unit: 'ratio'` 는 **0~1 소수**다 (AI 명세 §2.1). 화면에 보이는
 * `value` 문자열("1.21%")과 계열이 다르다 — 백엔드 `changeRate` 계열의 백분율이 아니다.
 */

const CHAT_UPSTREAM_UNAVAILABLE_PREFIX = 'upstream';
const CHAT_UPSTREAM_TIMEOUT_PREFIX = 'timeout';
const CHAT_GUARDRAIL_PREFIX = 'guardrail';

/** 보유 종목이 없을 때의 정상 거절 (AI 명세 §2.6). `detail.reason` 열거값은 미확정이다 (P5). */
function insufficientData(requestId: string) {
  return aiErrorResponse(
    AI_SERVICE_ERROR_CODES.INSUFFICIENT_DATA,
    '보유 종목이 없어 분석할 수 없어요',
    409,
    requestId,
    { holdingCount: 0 },
  );
}

export const aiHandlers = [
  http.post(
    mockPath(API_PATHS.ai.analysis(':stockCode')),
    ({ request, params }) => {
      const unauthorized = requireAuth(request);
      if (unauthorized !== null) {
        return unauthorized;
      }

      const requestId = nextAiRequestId();
      const stock = findStock(String(params.stockCode));

      if (stock === undefined) {
        // 백엔드는 종목 존재를 미리 검사하지 않는다. AI 서버 코드가 그대로 내려간다 (apiSpec §11.2).
        return aiErrorResponse(
          AI_SERVICE_ERROR_CODES.INSTRUMENT_NOT_FOUND,
          '분석할 수 없는 종목이에요',
          404,
          requestId,
        );
      }

      /*
       * **본문 섹션을 지어내지 않았다.** `AnalysisSection` 이 `ai/docs/openapi.json` 에
       * 빈 object 로 떨어져 키 구성이 하나도 확정되지 않았다 (contracts P8, 이슈 #15).
       * 손으로 일곱 섹션을 적으면 틀린 것을 계약처럼 굳힌다.
       * `shared/types/ai/analysis.ts` 도 같은 이유로 보존 필드만 검증한다.
       * 회신이 오면 그때 이 자리를 채운다.
       */
      return HttpResponse.json(
        aiResponse({}, requestId, {
          price: nowKstIso(),
          filings: '2026-08-14T09:00:00+09:00',
        }),
      );
    },
  ),

  http.post(mockPath(API_PATHS.ai.chat), async ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const body = await readJsonBody(request);
    const message =
      typeof body?.message === 'string' ? body.message.trim() : '';

    if (message === '' || message.length > 2000) {
      return errorResponse(
        AI_SERVICE_ERROR_CODES.INVALID_REQUEST,
        '질문을 확인해 주세요',
        400,
        { message: '1자 이상 2,000자 이하여야 합니다' },
      );
    }

    // AI 서버에 닿지 못한 두 코드에는 requestId 가 없다
    // (apiSpec §10.4 · GitLab 이슈 #12 4번 회신, 2026-09-02).
    if (message.startsWith(CHAT_UPSTREAM_UNAVAILABLE_PREFIX)) {
      return errorResponse(
        AI_RELAY_ERROR_CODES.UPSTREAM_UNAVAILABLE,
        'AI 응답을 불러오지 못했어요',
        502,
      );
    }

    if (message.startsWith(CHAT_UPSTREAM_TIMEOUT_PREFIX)) {
      return errorResponse(
        AI_RELAY_ERROR_CODES.UPSTREAM_TIMEOUT,
        'AI 응답이 지연되고 있어요',
        504,
      );
    }

    const requestId = nextAiRequestId();

    if (message.startsWith(CHAT_GUARDRAIL_PREFIX)) {
      return aiErrorResponse(
        AI_SERVICE_ERROR_CODES.GUARDRAIL_BLOCKED,
        '투자 권유나 가격 예측에는 답할 수 없어요',
        422,
        requestId,
      );
    }

    return HttpResponse.json(
      aiResponse(
        {
          conversationId:
            typeof body?.conversationId === 'string' &&
            body.conversationId !== ''
              ? body.conversationId
              : 'conv_mock_0001',
          // answer.title 은 항상 null 이다. 말풍선 제목은 프론트가 정한다 (contracts C53).
          answer: section(
            null,
            '보유 중인 삼성전자는 어제보다 1.21% 내렸어요. 반도체 비중이 62.4%로 높은 편이라 같은 방향으로 함께 움직이기 쉬워요.',
            [
              textSegment('보유 중인 삼성전자는 어제보다 '),
              metricSegment('1.21%', -0.0121, 'ratio', 'price', 'down'),
              textSegment(' 내렸어요. 반도체 비중이 '),
              metricSegment('62.4%', 0.624, 'ratio', 'portfolio_engine', 'up'),
              textSegment('로 높은 편이라 같은 방향으로 함께 움직이기 쉬워요.'),
            ],
          ),
          toolsUsed: ['get_quote', 'get_portfolio'],
        },
        requestId,
        { price: nowKstIso(), portfolio: nowKstIso() },
      ),
    );
  }),

  http.post(mockPath(API_PATHS.ai.diagnosis), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const requestId = nextAiRequestId();
    if (store.holdings.length === 0) {
      return insufficientData(requestId);
    }

    return HttpResponse.json(
      aiResponse(
        {
          riskLevel: 'moderate',
          /** 0~100 정수다. 비율이 아니다 */
          riskScore: 62,
          insufficientHistory: null,
          summary: section(
            '포트폴리오 진단',
            '반도체 두 종목이 전체의 62.4%를 차지해 집중도가 높아요. 최근 1년 최대 낙폭은 -22.14%였어요.',
            [
              textSegment('반도체 두 종목이 전체의 '),
              metricSegment('62.4%', 0.624, 'ratio', 'risk_engine', 'up'),
              textSegment('를 차지해 집중도가 높아요. 최근 1년 최대 낙폭은 '),
              metricSegment('-22.14%', -0.2214, 'ratio', 'risk_engine', 'down'),
              textSegment('였어요.'),
            ],
          ),
          findings: [
            {
              id: 'ticker_concentration',
              category: 'concentration',
              severity: 'high',
              title: '종목 집중도가 높아요',
              text: '가장 비중이 큰 종목 하나가 41.68%예요.',
              segments: [
                textSegment('가장 비중이 큰 종목 하나가 '),
                metricSegment('41.68%', 0.4168, 'ratio', 'risk_engine', 'up'),
                textSegment('예요.'),
              ],
              evidence: {
                tickers: ['005930', '000660'],
                metric: 'top1_weight',
                value: 0.4168,
                threshold: 0.3,
                hhi: 0.3421,
              },
            },
            {
              id: 'sector_concentration',
              category: 'concentration',
              severity: 'medium',
              title: '섹터가 한쪽에 쏠려 있어요',
              text: '반도체 섹터 비중이 62.4%예요.',
              segments: [
                textSegment('반도체 섹터 비중이 '),
                metricSegment('62.4%', 0.624, 'ratio', 'risk_engine', 'up'),
                textSegment('예요.'),
              ],
              evidence: { sector: '반도체', value: 0.624, threshold: 0.4 },
            },
          ],
          // 여기 비율은 전부 0~1 소수다. 등락률 계열이 아니다 (contracts C18 대비).
          indicators: {
            hhi: 0.3421,
            top1Weight: 0.4168,
            top3Weight: 0.9312,
            sectorHhi: 0.4102,
            annualizedVolatility: 0.2841,
            maxDrawdown1y: -0.2214,
            cashRatio: 0.3812,
            /** 배수다. 비율이 아니다 */
            beta: 1.14,
            largeCapWeight: 0.7421,
            /** 배수다. 비율이 아니다 */
            diversificationRatio: 1.08,
            rateSensitivity: 'moderate',
          },
        },
        requestId,
        { portfolio: nowKstIso(), price: nowKstIso() },
      ),
    );
  }),

  http.post(mockPath(API_PATHS.ai.attribution), async ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const body = await readJsonBody(request);
    const period = typeof body?.period === 'string' ? body.period : '1d';

    const requestId = nextAiRequestId();
    if (store.holdings.length === 0) {
      return insufficientData(requestId);
    }

    const summary = section(
      '수익률 원인',
      '이 기간 수익률은 +2.13%였고 그중 종목 선택이 +1.42%를 만들었어요. 카카오는 -0.31%로 발목을 잡았어요.',
      [
        textSegment('이 기간 수익률은 '),
        metricSegment('+2.13%', 0.0213, 'ratio', 'attribution_engine', 'up'),
        textSegment('였고 그중 종목 선택이 '),
        metricSegment('+1.42%', 0.0142, 'ratio', 'attribution_engine', 'up'),
        textSegment('를 만들었어요. 카카오는 '),
        metricSegment('-0.31%', -0.0031, 'ratio', 'attribution_engine', 'down'),
        textSegment('로 발목을 잡았어요.'),
      ],
    );

    return HttpResponse.json(
      aiResponse(
        {
          period,
          start: '2026-08-03',
          end: toKstDateString(new Date()),
          tradingDays: 21,
          // 0~1 소수다. 백엔드 changeRate 의 백분율과 계열이 다르다
          portfolioReturn: 0.0213,
          totalReturn: 0.0213,
          benchmarkReturn: 0.0089,
          excessReturn: 0.0124,
          breakdown: { market: 0.0089, sector: -0.0018, selection: 0.0142 },
          contributors: [
            {
              ticker: '000660',
              name: 'SK하이닉스',
              sector: '반도체',
              weight: 0.2214,
              return: 0.0912,
              contribution: 0.0202,
              heldAtStart: true,
              events: [
                {
                  citationId: 'cit_1',
                  type: 'earnings',
                  title: '2분기 영업이익 시장 기대치 상회',
                  summary: '2분기 영업이익 시장 기대치 상회',
                  eventDate: '2026-08-14',
                  matchedConfidence: 0.81,
                },
              ],
            },
          ],
          detractors: [
            {
              ticker: '035720',
              name: '카카오',
              sector: '인터넷',
              weight: 0.1102,
              return: -0.0281,
              contribution: -0.0031,
              heldAtStart: true,
              events: [],
            },
          ],
          sectors: [
            {
              sector: '반도체',
              portfolioWeight: 0.624,
              benchmarkWeight: 0.412,
              allocation: 0.0031,
              selection: 0.0111,
              proxy: false,
            },
            {
              sector: '인터넷',
              portfolioWeight: 0.1102,
              benchmarkWeight: 0.1841,
              allocation: -0.0018,
              selection: -0.0013,
              proxy: true,
            },
          ],
          notes: ['일부 섹터 벤치마크를 대체 지표로 채웠어요'],
          summary,
          // summary.text · summary.segments 와 같은 값이다. 프론트는 한쪽만 읽는다 (contracts C56)
          text: summary.text,
          segments: summary.segments,
        },
        requestId,
        { portfolio: nowKstIso(), price: nowKstIso(), news: nowKstIso() },
      ),
    );
  }),

  http.post(mockPath(API_PATHS.ai.orderPreview), async ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const body = await readJsonBody(request);
    const orders = Array.isArray(body?.orders) ? body.orders : [];

    const requestId = nextAiRequestId();

    if (orders.length === 0) {
      return errorResponse(
        AI_SERVICE_ERROR_CODES.INVALID_REQUEST,
        '점검할 주문이 없어요',
        400,
        { orders: '1건 이상이어야 합니다' },
      );
    }

    const orderSummary = orders.map((order) => {
      const row = order as {
        ticker?: unknown;
        side?: unknown;
        quantity?: unknown;
        price?: unknown;
      };
      const ticker = typeof row.ticker === 'string' ? row.ticker : '005930';
      const quantity = typeof row.quantity === 'number' ? row.quantity : 1;
      const price =
        typeof row.price === 'number'
          ? row.price
          : (findStock(ticker)?.currentPrice ?? 0);

      return {
        ticker,
        // side 는 소문자다. 백엔드 주문 API 의 BUY/SELL 과 값이 다르다 (AI 명세 §7)
        side: row.side === 'sell' ? 'sell' : 'buy',
        quantity,
        price,
        amount: price * quantity,
      };
    });

    const ordersValue = orderSummary.reduce((sum, row) => sum + row.amount, 0);
    const feasible = ordersValue <= store.cashBalance;

    return HttpResponse.json(
      aiResponse(
        {
          orderSummary,
          ordersValue,
          // 에러가 아니라 200 응답의 본문이다 (AI 명세 §7)
          feasible,
          shortfall: feasible ? null : ordersValue - store.cashBalance,
          before: {
            hhi: 0.3421,
            top1Weight: 0.4168,
            top3Weight: 0.9312,
            sectorHhi: 0.4102,
            annualizedVolatility: 0.2841,
            maxDrawdown1y: -0.2214,
            cashRatio: 0.3812,
            beta: 1.14,
            largeCapWeight: 0.7421,
            diversificationRatio: 1.08,
            rateSensitivity: 'moderate',
            topSectorWeight: 0.624,
          },
          after: {
            hhi: 0.3944,
            top1Weight: 0.4712,
            top3Weight: 0.9512,
            sectorHhi: 0.4581,
            annualizedVolatility: 0.3012,
            maxDrawdown1y: -0.2214,
            cashRatio: 0.2914,
            beta: 1.19,
            largeCapWeight: 0.7712,
            diversificationRatio: 1.02,
            rateSensitivity: 'moderate',
            topSectorWeight: 0.681,
          },
          // 숫자 지표만 담긴다. rateSensitivity 처럼 문자열인 지표는 키째로 빠진다 (AI 명세 §7)
          delta: {
            hhi: 0.0523,
            top1Weight: 0.0544,
            top3Weight: 0.02,
            sectorHhi: 0.0479,
            annualizedVolatility: 0.0171,
            cashRatio: -0.0898,
            beta: 0.05,
            largeCapWeight: 0.0291,
            diversificationRatio: -0.06,
            topSectorWeight: 0.057,
          },
          warnings: [
            {
              id: 'ticker_concentration',
              severity: 'high',
              title: '집중도가 더 올라가요',
              metric: 'top1_weight',
              before: 0.4168,
              after: 0.4712,
              threshold: 0.3,
              text: '이 주문 뒤 가장 큰 종목 비중이 47.12%가 돼요.',
              segments: [
                textSegment('이 주문 뒤 가장 큰 종목 비중이 '),
                metricSegment('47.12%', 0.4712, 'ratio', 'risk_engine', 'up'),
                textSegment('가 돼요.'),
              ],
            },
          ],
          thesisConflicts: [
            {
              id: 'thesis_1',
              ticker: '005930',
              fact: '반도체 비중을 절반 아래로 줄이겠다고 적었어요',
              source: 'user_stated',
              recordedAt: '2026-08-27T21:12:00+09:00',
              conflict: '이 주문은 반도체 비중을 68.1%로 올려요.',
              segments: [
                textSegment('이 주문은 반도체 비중을 '),
                metricSegment('68.1%', 0.681, 'ratio', 'risk_engine', 'up'),
                textSegment('로 올려요.'),
              ],
            },
          ],
          summary: section(
            null,
            '집중도가 올라가는 주문이에요. 승인이나 거절을 판단하지는 않아요.',
            [
              textSegment(
                '집중도가 올라가는 주문이에요. 승인이나 거절을 판단하지는 않아요.',
              ),
            ],
          ),
        },
        requestId,
        { portfolio: nowKstIso(), price: nowKstIso() },
      ),
    );
  }),

  http.get(mockPath(API_PATHS.ai.briefing), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const requestId = nextAiRequestId();
    const today = toKstDateString(new Date());
    const date = searchParam(request, 'date') ?? today;

    // 오늘이 아닌 날짜는 비어 있다. status: 'empty' 는 오류가 아니라 영역을 숨기는 신호다
    if (date !== today) {
      return HttpResponse.json(
        aiResponse(
          { date, status: 'empty', generatedAt: nowKstIso(), items: [] },
          requestId,
          { portfolio: nowKstIso() },
        ),
      );
    }

    return HttpResponse.json(
      aiResponse(
        {
          date,
          status: 'ready',
          generatedAt: nowKstIso(),
          items: [
            {
              rank: 1,
              category: 'holding_move',
              /** 0~1 소수다 */
              relevanceScore: 0.94,
              title: 'SK하이닉스가 3.39% 올랐어요',
              text: '보유 중인 SK하이닉스가 어제보다 3.39% 올랐어요.',
              segments: [
                textSegment('보유 중인 SK하이닉스가 어제보다 '),
                metricSegment('3.39%', 0.0339, 'ratio', 'price', 'up'),
                textSegment(' 올랐어요.'),
              ],
              relatedTickers: ['000660'],
              deeplink: '/stocks/000660?tab=ai',
              // 현재 구현에서 항상 빈 배열이다. 실패로 다루지 않는다 (contracts C56)
              citations: [],
            },
            {
              rank: 2,
              category: 'holding_move',
              relevanceScore: 0.71,
              title: '카카오는 보합이에요',
              text: '보유 중인 카카오는 어제와 같은 가격이에요.',
              segments: [
                textSegment('보유 중인 카카오는 어제와 같은 가격이에요.'),
              ],
              relatedTickers: ['035720'],
              deeplink: '/stocks/035720?tab=ai',
              citations: [],
            },
            {
              rank: 3,
              category: 'earnings',
              relevanceScore: 0.58,
              title: '삼성전자가 1.21% 내렸어요',
              text: '보유 중인 삼성전자가 어제보다 1.21% 내렸어요.',
              segments: [
                textSegment('보유 중인 삼성전자가 어제보다 '),
                metricSegment('1.21%', -0.0121, 'ratio', 'price', 'down'),
                textSegment(' 내렸어요.'),
              ],
              relatedTickers: ['005930'],
              deeplink: '/stocks/005930?tab=ai',
              citations: [],
            },
          ],
        },
        requestId,
        { portfolio: nowKstIso(), price: nowKstIso() },
      ),
    );
  }),

  http.post(mockPath(API_PATHS.ai.feedback), async ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const body = await readJsonBody(request);
    const requestId = typeof body?.requestId === 'string' ? body.requestId : '';
    const rating = body?.rating;
    const reasons = body?.reasons;
    const comment = body?.comment;

    /*
     * 요청 키는 camelCase 다 — `request_id` 가 아니라 `requestId` 를 읽는다
     * (GitLab 이슈 #12 3번 회신 · contracts C75). AI 서버로 넘길 때의 snake_case 변환은
     * 백엔드 중계 레이어 몫이라 프론트·목 양쪽 다 camelCase 하나만 쓴다.
     */
    if (requestId === '') {
      return errorResponse(
        AI_SERVICE_ERROR_CODES.INVALID_REQUEST,
        '평가할 응답을 찾을 수 없어요',
        400,
        { requestId: '필수입니다' },
      );
    }

    if (rating !== 'up' && rating !== 'down') {
      return errorResponse(
        AI_SERVICE_ERROR_CODES.INVALID_REQUEST,
        '평가 값이 올바르지 않습니다',
        400,
        { rating: 'up 또는 down 이어야 합니다' },
      );
    }

    const normalizedReasons =
      reasons === undefined || reasons === null ? [] : reasons;
    if (
      !Array.isArray(normalizedReasons) ||
      normalizedReasons.some(
        (reason) =>
          typeof reason !== 'string' ||
          !AI_FEEDBACK_REASONS.includes(
            reason as (typeof AI_FEEDBACK_REASONS)[number],
          ),
      )
    ) {
      return errorResponse(
        AI_SERVICE_ERROR_CODES.INVALID_REQUEST,
        '평가 사유가 올바르지 않습니다',
        400,
        {
          reasons: `${AI_FEEDBACK_REASONS.join(' · ')} 중에서 고를 수 있습니다`,
        },
      );
    }

    if (
      typeof comment === 'string' &&
      comment.length > AI_FEEDBACK_COMMENT_MAX_LENGTH
    ) {
      return errorResponse(
        AI_SERVICE_ERROR_CODES.INVALID_REQUEST,
        '의견이 너무 깁니다',
        400,
        { comment: `${AI_FEEDBACK_COMMENT_MAX_LENGTH}자 이하여야 합니다` },
      );
    }

    /*
     * **같은 `requestId` 는 덮어쓴다** (contracts C66 · AI 명세 §10). 배열에 쌓지 않고
     * 맵에 넣는 것이 그 계약이다. 취소 API 가 없으므로 지우는 경로도 두지 않았다
     * (화면은 재전송으로 수정만 한다).
     */
    store.aiFeedback[requestId] = {
      requestId,
      rating,
      reasons: normalizedReasons as string[],
      comment: typeof comment === 'string' ? comment : null,
      submittedAt: nowKstIso(),
    };

    /*
     * 응답도 다른 여섯 종과 같은 재포장 형태다 (contracts C7). **`requestId` 는 평가 대상의
     * 값을 그대로 되돌려준다** — 접수 응답에 새 번호를 발급하면 화면이 어느 응답의
     * 영수증인지 대조할 수 없다.
     */
    return HttpResponse.json(aiResponse({ recorded: true }, requestId));
  }),
];
