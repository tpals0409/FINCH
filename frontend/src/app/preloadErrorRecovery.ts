const PRELOAD_RELOAD_KEY = 'finch:preload-reload-attempted';
const PRELOAD_RELOAD_WINDOW_MS = 10_000;

type PreloadErrorRecoveryOptions = {
  reload?: () => void;
};

/**
 * 배포 중 해시 청크가 교체된 세션을 새 엔트리로 복구한다.
 * 같은 청크가 계속 실패하면 10초 동안 새로고침하지 않고 라우트 오류 화면에 남긴다.
 */
export function installPreloadErrorRecovery({
  reload = () => window.location.reload(),
}: PreloadErrorRecoveryOptions = {}) {
  const handlePreloadError = (event: Event) => {
    event.preventDefault();

    const lastAttempt = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY) ?? 0);
    if (Date.now() - lastAttempt < PRELOAD_RELOAD_WINDOW_MS) {
      return;
    }

    sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(Date.now()));
    reload();
  };

  window.addEventListener('vite:preloadError', handlePreloadError);
}
