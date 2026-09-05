import { Button } from '@/shared/ui/Button';

import { useToggleWatchlist } from '../api/useToggleWatchlist';

type Props = {
  stockCode: string;
  watched: boolean;
};

/**
 * 관심 종목 토글 (apiSpec §6.3).
 *
 * 요청이 도는 동안 버튼을 잠근다. 연타하면 담기와 빼기가 엇갈려 나가고, 마지막에 어느 쪽이
 * 남는지가 응답 순서에 달리게 된다.
 */
export function WatchToggleButton({ stockCode, watched }: Props) {
  const { mutate, isPending } = useToggleWatchlist();

  return (
    <Button
      onClick={() => mutate({ stockCode, watched })}
      disabled={isPending}
      aria-pressed={watched}
    >
      {watched ? '관심 해제' : '관심 등록'}
    </Button>
  );
}
