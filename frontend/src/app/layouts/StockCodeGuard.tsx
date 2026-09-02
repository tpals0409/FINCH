import { Outlet, useParams } from 'react-router-dom';

import { NotFoundPage } from '@/pages/NotFoundPage';
import { STOCK_CODE_PARAM } from '@/shared/config/routes';
import { StockCodeSchema } from '@/shared/types/primitives';

/**
 * `/stocks/:stockCode` 아래 화면들의 경로 파라미터를 형식 단계에서 거른다.
 *
 * 종목코드는 6자리 문자열이다 (contracts C19). `/stocks/12` 같은 경로는 서버에
 * 물어볼 것도 없이 틀린 값이라 여기서 404 로 끊는다.
 *
 * **라우트 단에 둔 이유.** 종목 상세와 주문이 같은 파라미터를 쓰는데 화면마다
 * 판정하면 두 곳에서 같은 검사를 하게 되고, 나중에 붙는 화면은 빠뜨린다.
 * 빠뜨린 화면은 형식이 틀린 코드로 API 를 부르고 서버 에러 화면을 띄운다.
 * ia.md §2 가 적었듯 브리핑의 `deeplink` 는 AI 서버가 만들어 보내므로
 * 프론트가 만들지 않은 경로가 실제로 들어온다.
 *
 * 존재하지 않는 종목(형식은 맞는 `/stocks/999999`)은 여기서 판정하지 않는다.
 * 그것은 서버만 아는 사실이고 화면이 API 응답으로 다룬다.
 */
export function StockCodeGuard() {
  const params = useParams();
  const isValid = StockCodeSchema.safeParse(params[STOCK_CODE_PARAM]).success;

  return isValid ? <Outlet /> : <NotFoundPage />;
}
