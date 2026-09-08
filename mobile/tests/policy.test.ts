import { describe, expect, it } from 'vitest';
import { isAllowedWebUrl, isExternalHttpUrl } from '../src/policy';

describe('navigation policy', () => {
  it('allows only the configured HTTPS origin', () => {
    expect(isAllowedWebUrl('https://app.finchapp.org/orders')).toBe(true);
    expect(isAllowedWebUrl('http://app.finchapp.org/orders')).toBe(false);
    expect(isAllowedWebUrl('https://evil.example/steal')).toBe(false);
  });

  it('classifies other HTTP links as external', () => {
    expect(isExternalHttpUrl('https://docs.example/help')).toBe(true);
    expect(isExternalHttpUrl('mailto:help@example.com')).toBe(false);
  });
});
