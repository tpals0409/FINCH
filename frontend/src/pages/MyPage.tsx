import { Link } from 'react-router-dom';

import { LogoutButton } from '@/features/auth';
import { ROUTES } from '@/shared/config/routes';
import { PageMain } from '@/shared/ui/PageMain';

/**
 * 내 정보 (ia.md §1 "기타").
 *
 * **계좌 초기화와 회차 조회 진입점은 없다** — GitLab 이슈 #27 로 기능 자체가 없어졌다.
 * **메일도 없다** — MVP에서 만들지 않기로 했다. 매수 이유 기록·AI 추측 확인·브리핑을
 * 생산하는 기능이 먼저이며, 진입점만 달면 눌러서 빈 화면에 닿는다 (ia.md §7).
 *
 * AI 세 화면 중 브리핑과 위키는 여기가 유일한 진입점이다. 채팅은 플로팅 버튼으로도 들어간다.
 */
const MENU = [
  { label: '오늘의 브리핑', path: ROUTES.briefing },
  { label: 'AI가 이해한 나', path: ROUTES.myWiki },
  { label: 'AI에게 묻기', path: ROUTES.chat },
  { label: '매매 내역', path: ROUTES.transactions },
  { label: '최근 본 종목', path: ROUTES.recent },
  { label: '충전', path: ROUTES.deposit },
] as const;

export function MyPage() {
  return (
    <PageMain>
      <h1 className="text-title-2 text-fg-neutral">내 정보</h1>

      <ul className="mt-4">
        {MENU.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              viewTransition
              className="flex items-center justify-between rounded-card px-2 py-4 text-body-1 text-fg-neutral active:bg-bg-transparent-pressed"
            >
              {item.label}
              <span aria-hidden="true" className="text-fg-neutral-subtle">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <LogoutButton />
      </div>
    </PageMain>
  );
}
