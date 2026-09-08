import type { CapacitorConfig } from '@capacitor/cli';

const webOrigin = process.env.FINCH_WEB_ORIGIN ?? 'https://app.finchapp.org';

export const config: CapacitorConfig = {
  appId: 'org.finchapp.mobile',
  appName: 'FINCH',
  webDir: 'www',
  server: {
    url: webOrigin,
    cleartext: false,
    allowNavigation: [new URL(webOrigin).hostname],
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
