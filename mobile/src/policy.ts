const allowedOrigin = new URL(
  process.env.FINCH_WEB_ORIGIN ?? 'https://app.finchapp.org',
);

export function isAllowedWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.origin === allowedOrigin.origin;
  } catch {
    return false;
  }
}

export function isExternalHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !isAllowedWebUrl(value);
  } catch {
    return false;
  }
}

export function safeLog(event: string, fields: Record<string, string | number | boolean> = {}) {
  const sanitized = Object.fromEntries(
    Object.entries(fields).filter(([key]) => !/token|cookie|authorization|secret|password|query|fragment/i.test(key)),
  );
  console.info(`[finch-mobile] ${event}`, sanitized);
}
