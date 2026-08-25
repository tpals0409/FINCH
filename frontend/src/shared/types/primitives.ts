import { z } from 'zod';

/**
 * 서버가 내려주는 원시 표기에 이름을 붙인 스키마 모음.
 *
 * 출처: `docs/api/apiSpec.md` §1.1 기본 정보 (금액·수량·등락률·그 외 비율·시각·종목코드) ·
 * `frontend/docs/contracts.md` C16~C19 (시각 표기 · 금액과 수량 · 등락률·수익률 · 종목코드).
 *
 * **왜 브랜딩하나.** 한 문서 안에 백분율 계열과 0~1 소수 계열이 함께 있다.
 * 둘 다 그냥 `number` 로 두면 등락률(`-1.21` = −1.21%)에 0~1 검증을 붙이거나
 * 비중(`0.4168` = 41.68%)에 100 을 곱하지 않는 사고가 타입 검사에서 걸러지지 않는다.
 * 브랜드가 다르면 서로 대입되지 않으므로 컴파일 시점에 갈린다.
 *
 * **목 데이터를 만들 때.** 브랜드는 출력 타입에만 붙는다. 입력 타입은 그대로
 * `number` · `string` 이므로 MSW 픽스처는 `z.input<typeof XxxSchema>` 를 쓰면
 * 캐스팅 없이 평범한 리터럴로 적을 수 있다.
 */

/**
 * 원 단위 정수 금액 (`long`). 소수점·콤마 없이 숫자만 온다 (apiSpec §1.1 금액).
 * 실현손익·평가손익처럼 음수가 오는 자리가 있어 부호 제한을 걸지 않는다.
 */
export const KrwAmountSchema = z.number().int().brand<'KrwAmount'>();
export type KrwAmount = z.infer<typeof KrwAmountSchema>;

/** 주식 수량. 정수 (`long`) (apiSpec §1.1 수량). */
export const QuantitySchema = z.number().int().brand<'Quantity'>();
export type Quantity = z.infer<typeof QuantitySchema>;

/**
 * 등락률·수익률 (apiSpec §1.1 등락률·수익률 · contracts C18).
 *
 * **백분율 값이다. 0~1 소수가 아니다.** `-1.21` 은 −1.21% 를 뜻한다.
 * 화면은 `%` 기호만 붙이고 **100 을 곱하지 않는다.**
 */
export const PercentSchema = z.number().brand<'Percent'>();
export type Percent = z.infer<typeof PercentSchema>;

/**
 * 등락률·수익률을 뺀 나머지 비율 (apiSpec §1.1 그 외 비율 · AI 명세 §2.1 비율).
 *
 * **0~1 소수 계열이다.** 비중 `0.0512` 는 5.12% 를 뜻하고 화면에서 100 을 곱한다.
 *
 * 범위 검증을 걸지 않은 이유는 AI 지표에 음수와 1 초과가 실제로 섞여 오기 때문이다 —
 * `maxDrawdown1y` 는 `-0.2214`, `annualizedVolatility` 는 1 을 넘을 수 있다
 * (AI 명세 §5 포트폴리오 진단 `indicators`). 계열을 가르는 것이 목적이고
 * 범위를 강제하는 것이 목적이 아니다. 0~1 이 보장된 자리에는 아래
 * `UnitIntervalSchema` 를 쓴다.
 */
export const RatioSchema = z.number().brand<'Ratio'>();
export type Ratio = z.infer<typeof RatioSchema>;

/**
 * 0~1 이 명세로 보장된 점수형 비율. `RatioSchema` 와 같은 브랜드라 서로 대입된다.
 * 쓰는 자리: `citations[].relevance` · `events[].matchedConfidence` ·
 * `briefing.items[].relevanceScore` (AI 명세 §2.4 · §6 · §8).
 */
export const UnitIntervalSchema = z.number().min(0).max(1).brand<'Ratio'>();

/**
 * ISO 8601 + KST 오프셋 (`2026-08-20T14:30:00+09:00`) (apiSpec §1.1 시각 · contracts C16).
 * `offset: true` 가 없으면 Zod 가 `Z` 로 끝나는 값만 통과시켜 KST 오프셋을 전부 튕긴다.
 */
export const IsoDateTimeSchema = z.iso
  .datetime({ offset: true })
  .brand<'IsoDateTime'>();
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;

/**
 * 날짜만 있는 값 (`2026-08-20`). 캔들의 `date`, 브리핑의 `date`,
 * 수익률 원인 분석의 `start`·`end` 가 이 모양이다 (apiSpec §5.3 · AI 명세 §6 · §8).
 */
export const IsoDateSchema = z.iso.date().brand<'IsoDate'>();
export type IsoDate = z.infer<typeof IsoDateSchema>;

/**
 * 6자리 종목코드 문자열 (apiSpec §1.1 종목코드 · contracts C19).
 * 정수로 다루면 `005930` 의 앞 `0` 이 사라진다.
 * 프론트 파라미터 이름은 `stockCode` 로 통일한다.
 */
export const StockCodeSchema = z
  .string()
  .regex(/^\d{6}$/, '종목코드는 6자리 숫자 문자열이다')
  .brand<'StockCode'>();
export type StockCode = z.infer<typeof StockCodeSchema>;

/**
 * 커서 (apiSpec §1.5 페이징 · contracts C28).
 * **불투명 문자열이다.** 파싱·조작·해석하지 않고 받은 값을 그대로 되돌려 보낸다.
 * 브랜드를 붙인 이유는 아무 문자열이나 커서 자리에 들어가는 것을 막기 위해서다.
 */
export const CursorSchema = z.string().brand<'Cursor'>();
export type Cursor = z.infer<typeof CursorSchema>;

/**
 * 멱등성 키 (apiSpec §1.4 멱등성 · contracts C30).
 * 클라이언트가 UUID v4 로 만든다. 같은 클릭의 재시도는 같은 키, 새 클릭은 새 키다.
 */
export const IdempotencyKeySchema = z.uuid().brand<'IdempotencyKey'>();
export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema>;
