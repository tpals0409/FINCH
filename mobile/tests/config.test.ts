import { describe, expect, it } from 'vitest';
import config from '../capacitor.config';

describe('Capacitor shell configuration', () => {
  it('loads the approved origin and OAuth navigation hosts', () => {
    expect(config.appId).toBe('org.finchapp.mobile');
    expect(config.server?.url).toBe('https://app.finchapp.org');
    expect(config.server?.errorPath).toBe('offline.html');
    expect(config.server?.allowNavigation).toEqual(['app.finchapp.org', '*.kakao.com']);
  });
});
