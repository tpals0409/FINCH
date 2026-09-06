import { useEffect, useState } from 'react';

/**
 * 값이 `delay` 동안 멈춘 뒤에야 바뀐다. 검색어처럼 타이핑마다 요청이 나가는 자리에 쓴다.
 *
 * TanStack Query 가 같은 키를 합쳐 주지만 **키가 글자마다 다르므로 합쳐지지 않는다** —
 * "삼성전자" 를 치면 네 번 나간다. 서버가 종목 2,598행에 `ILIKE` 를 도는 자리라 그냥 두면
 * 한 사람이 검색 한 번에 네 번 훑게 한다.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
