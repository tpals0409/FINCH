import { App } from '@capacitor/app';
import { isAllowedWebUrl, isExternalHttpUrl, safeLog } from './policy';

const offlineBanner = document.querySelector<HTMLElement>('[data-offline]');
const retryButton = document.querySelector<HTMLButtonElement>('[data-retry]');

function renderNetworkState() {
  const offline = !navigator.onLine;
  offlineBanner?.toggleAttribute('hidden', !offline);
  safeLog('network_changed', { state: offline ? 'offline' : 'online' });
}

window.addEventListener('online', renderNetworkState);
window.addEventListener('offline', renderNetworkState);
retryButton?.addEventListener('click', () => window.location.reload());

App.addListener('backButton', ({ canGoBack }) => {
  if (canGoBack && window.history.length > 1) {
    window.history.back();
    safeLog('navigation_back', { mode: 'web_history' });
    return;
  }
  safeLog('navigation_back', { mode: 'root' });
  void App.exitApp();
});

document.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
  if (!target) return;
  const href = target.href;
  if (isAllowedWebUrl(href)) return;
  if (isExternalHttpUrl(href)) {
    event.preventDefault();
    safeLog('external_link_open', { host: new URL(href).hostname });
    window.open(href, '_system');
    return;
  }
  event.preventDefault();
  safeLog('navigation_blocked');
});

renderNetworkState();
safeLog('webview_boot', { platform: 'capacitor' });
